import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "task-reminders";
const NOTIFICATION_TYPE = "task-reminder";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/* ======================================================
   HANDLER
====================================================== */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/* ======================================================
   PERMISOS / INICIALIZACIÓN
====================================================== */

function hasNotificationPermission(settings) {
  if (Platform.OS !== "ios") {
    return (
      settings.granted ||
      settings.status === Notifications.PermissionStatus.GRANTED
    );
  }

  const iosStatus = settings.ios?.status;

  return (
    settings.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function initNotifications() {
  try {
    /*
     * Android 13 necesita al menos un canal creado
     * antes de mostrar correctamente el permiso.
     */
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Recordatorios",
        description: "Recordatorios de tareas de Geska",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    let permissions =
      await Notifications.getPermissionsAsync();

    if (!hasNotificationPermission(permissions)) {
      if (permissions.canAskAgain === false) {
        console.warn(
          "Las notificaciones están bloqueadas desde la configuración del sistema."
        );

        return false;
      }

      permissions =
        await Notifications.requestPermissionsAsync();
    }

    if (!hasNotificationPermission(permissions)) {
      console.warn(
        "Permiso de notificaciones denegado."
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Error inicializando notificaciones:",
      error
    );

    return false;
  }
}

/* ======================================================
   FECHAS
====================================================== */

function parseTaskDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const dateParts =
    dateStr.split("-").map(Number);

  const timeParts =
    timeStr.split(":").map(Number);

  if (
    dateParts.length !== 3 ||
    timeParts.length !== 2
  ) {
    return null;
  }

  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;

  if (
    [year, month, day, hour, minute].some(
      (value) => !Number.isFinite(value)
    )
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );

  /*
   * Evita que JS convierta silenciosamente
   * fechas inválidas como 31/02.
   */
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

function parseRepeatEnd(dateStr) {
  if (!dateStr) return null;

  const parts =
    dateStr.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some(
      (value) => !Number.isFinite(value)
    )
  ) {
    return null;
  }

  const [year, month, day] = parts;

  return new Date(
    year,
    month - 1,
    day,
    23,
    59,
    59,
    999
  );
}

function getReminderMinutes(task) {
  if (task.reminder_minutes == null) {
    return null;
  }

  const minutes =
    Number(task.reminder_minutes);

  if (
    !Number.isFinite(minutes) ||
    minutes < 0
  ) {
    return null;
  }

  return minutes;
}

function getReminderForOccurrence(
  occurrence,
  reminderMinutes
) {
  const reminder =
    new Date(occurrence);

  reminder.setMinutes(
    reminder.getMinutes() -
      reminderMinutes
  );

  return reminder;
}

function occursBeforeRepeatEnd(
  occurrence,
  repeatEnd
) {
  return (
    !repeatEnd ||
    occurrence <= repeatEnd
  );
}

/* ======================================================
   PRÓXIMA OCURRENCIA
====================================================== */

function getNextDailyReminder(
  anchor,
  reminderMinutes,
  from,
  repeatEnd
) {
  const occurrence =
    new Date(anchor);

  let reminder =
    getReminderForOccurrence(
      occurrence,
      reminderMinutes
    );

  if (reminder <= from) {
    const jump = Math.max(
      0,
      Math.floor(
        (from - reminder) / DAY_MS
      )
    );

    occurrence.setDate(
      occurrence.getDate() + jump
    );

    reminder =
      getReminderForOccurrence(
        occurrence,
        reminderMinutes
      );

    while (reminder <= from) {
      occurrence.setDate(
        occurrence.getDate() + 1
      );

      reminder =
        getReminderForOccurrence(
          occurrence,
          reminderMinutes
        );
    }
  }

  if (
    !occursBeforeRepeatEnd(
      occurrence,
      repeatEnd
    )
  ) {
    return null;
  }

  return reminder;
}

function getNextWeeklyReminder(
  anchor,
  reminderMinutes,
  from,
  repeatEnd
) {
  const occurrence =
    new Date(anchor);

  let reminder =
    getReminderForOccurrence(
      occurrence,
      reminderMinutes
    );

  if (reminder <= from) {
    const jump = Math.max(
      0,
      Math.floor(
        (from - reminder) / WEEK_MS
      )
    );

    occurrence.setDate(
      occurrence.getDate() +
        jump * 7
    );

    reminder =
      getReminderForOccurrence(
        occurrence,
        reminderMinutes
      );

    while (reminder <= from) {
      occurrence.setDate(
        occurrence.getDate() + 7
      );

      reminder =
        getReminderForOccurrence(
          occurrence,
          reminderMinutes
        );
    }
  }

  if (
    !occursBeforeRepeatEnd(
      occurrence,
      repeatEnd
    )
  ) {
    return null;
  }

  return reminder;
}

function createMonthlyOccurrence(
  anchor,
  monthOffset
) {
  /*
   * Primero nos posicionamos el día 1
   * para evitar overflow accidental.
   */
  const target = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + monthOffset,
    1,
    anchor.getHours(),
    anchor.getMinutes(),
    0,
    0
  );

  const targetMonth =
    target.getMonth();

  const targetYear =
    target.getFullYear();

  target.setDate(
    anchor.getDate()
  );

  /*
   * Ej:
   * una tarea del día 31 simplemente no
   * existe en febrero.
   */
  if (
    target.getMonth() !== targetMonth ||
    target.getFullYear() !== targetYear
  ) {
    return null;
  }

  return target;
}

function getNextMonthlyReminder(
  anchor,
  reminderMinutes,
  from,
  repeatEnd
) {
  const monthDifference =
    (from.getFullYear() -
      anchor.getFullYear()) *
      12 +
    (from.getMonth() -
      anchor.getMonth());

  let offset = Math.max(
    0,
    monthDifference - 1
  );

  /*
   * Partimos cerca del mes actual.
   * 120 vueltas son más que suficientes
   * incluso para fechas como el día 31.
   */
  for (
    let attempts = 0;
    attempts < 120;
    attempts++, offset++
  ) {
    const occurrence =
      createMonthlyOccurrence(
        anchor,
        offset
      );

    if (!occurrence) continue;

    if (
      !occursBeforeRepeatEnd(
        occurrence,
        repeatEnd
      )
    ) {
      return null;
    }

    const reminder =
      getReminderForOccurrence(
        occurrence,
        reminderMinutes
      );

    if (reminder > from) {
      return reminder;
    }
  }

  return null;
}

/* ======================================================
   NEXT REMINDER
====================================================== */

export function getNextReminderDate(
  task,
  from = new Date()
) {
  const anchor =
    parseTaskDateTime(
      task?.date,
      task?.time
    );

  const reminderMinutes =
    getReminderMinutes(task);

  if (
    !anchor ||
    reminderMinutes == null
  ) {
    return null;
  }

  const repeatEnd =
    parseRepeatEnd(
      task.repeat_end
    );

  const mode =
    task.repeat_mode || "none";

  if (mode === "none") {
    const reminder =
      getReminderForOccurrence(
        anchor,
        reminderMinutes
      );

    return reminder > from
      ? reminder
      : null;
  }

  if (mode === "daily") {
    return getNextDailyReminder(
      anchor,
      reminderMinutes,
      from,
      repeatEnd
    );
  }

  if (mode === "weekly") {
    return getNextWeeklyReminder(
      anchor,
      reminderMinutes,
      from,
      repeatEnd
    );
  }

  if (mode === "monthly") {
    return getNextMonthlyReminder(
      anchor,
      reminderMinutes,
      from,
      repeatEnd
    );
  }

  /*
   * Custom todavía no está implementado
   * completamente en Geska.
   */
  return null;
}

/* ======================================================
   TRIGGERS
====================================================== */

function addAndroidChannel(trigger) {
  if (Platform.OS !== "android") {
    return trigger;
  }

  return {
    ...trigger,
    channelId: CHANNEL_ID,
  };
}

function recurrenceHasStarted(
  anchor
) {
  const start =
    new Date(anchor);

  const today =
    new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return start <= today;
}

/*
 * Usa triggers recurrentes nativos cuando
 * podemos representarlos fielmente.
 *
 * Si no, scheduleTaskReminder cae automáticamente
 * al próximo recordatorio de fecha exacta.
 */
function buildRecurringTrigger(task) {
  const mode =
    task.repeat_mode || "none";

  if (
    !["daily", "weekly", "monthly"].includes(
      mode
    )
  ) {
    return null;
  }

  /*
   * Un trigger recurrente nativo no sabe
   * cuándo debe detenerse.
   */
  if (task.repeat_end) {
    return null;
  }

  const anchor =
    parseTaskDateTime(
      task.date,
      task.time
    );

  const reminderMinutes =
    getReminderMinutes(task);

  if (
    !anchor ||
    reminderMinutes == null ||
    !recurrenceHasStarted(anchor)
  ) {
    return null;
  }

  const reminder =
    getReminderForOccurrence(
      anchor,
      reminderMinutes
    );

  if (mode === "daily") {
    return addAndroidChannel({
      type:
        Notifications
          .SchedulableTriggerInputTypes
          .DAILY,

      hour:
        reminder.getHours(),

      minute:
        reminder.getMinutes(),
    });
  }

  if (mode === "weekly") {
    return addAndroidChannel({
      type:
        Notifications
          .SchedulableTriggerInputTypes
          .WEEKLY,

      /*
       * Expo:
       * 1 = Domingo
       * 7 = Sábado
       *
       * Date.getDay():
       * 0 = Domingo
       */
      weekday:
        reminder.getDay() + 1,

      hour:
        reminder.getHours(),

      minute:
        reminder.getMinutes(),
    });
  }

  if (mode === "monthly") {
    /*
     * Si restar el recordatorio nos hace
     * cruzar al mes anterior, el número de
     * día podría variar (28/29/30/31).
     *
     * En ese caso no usamos MONTHLY y
     * programamos la siguiente fecha exacta.
     */
    if (
      reminder.getMonth() !==
        anchor.getMonth() ||
      reminder.getFullYear() !==
        anchor.getFullYear()
    ) {
      return null;
    }

    return addAndroidChannel({
      type:
        Notifications
          .SchedulableTriggerInputTypes
          .MONTHLY,

      day:
        reminder.getDate(),

      hour:
        reminder.getHours(),

      minute:
        reminder.getMinutes(),
    });
  }

  return null;
}

/* ======================================================
   SCHEDULE
====================================================== */

export async function scheduleTaskReminder(
  task
) {
  if (
    !task?.id ||
    !task?.title?.trim() ||
    !task?.time ||
    task?.reminder_minutes == null
  ) {
    return null;
  }

  /*
   * Una tarea simple terminada
   * no necesita recordar nada.
   */
  if (
    task.repeat_mode === "none" &&
    task.done
  ) {
    return null;
  }

  const nextReminder =
    getNextReminderDate(task);

  if (!nextReminder) {
    return null;
  }

  const ready =
    await initNotifications();

  if (!ready) {
    return null;
  }

  const recurringTrigger =
    buildRecurringTrigger(task);

  const trigger =
    recurringTrigger ||
    addAndroidChannel({
      type:
        Notifications
          .SchedulableTriggerInputTypes
          .DATE,

      date: nextReminder,
    });

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Recordatorio",
        body: task.title,
        sound: "default",

        data: {
          type: NOTIFICATION_TYPE,
          taskId: task.id,
        },
      },

      trigger,
    });
  } catch (error) {
    console.error(
      `No se pudo programar el recordatorio de "${task.title}":`,
      error
    );

    return null;
  }
}

/* ======================================================
   CANCEL
====================================================== */

export async function cancelTaskReminder(
  notificationId
) {
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      notificationId
    );
  } catch (error) {
    console.warn(
      "No se pudo cancelar la notificación:",
      notificationId,
      error
    );
  }
}

/*
 * También reconoce las notificaciones legacy,
 * que todavía no tenían content.data.type.
 */
export async function cancelAllTaskReminders() {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    const taskNotifications =
      scheduled.filter(
        (notification) =>
          notification.content?.data
            ?.type ===
            NOTIFICATION_TYPE ||
          notification.content
            ?.title ===
            "⏰ Recordatorio"
      );

    await Promise.all(
      taskNotifications.map(
        (notification) =>
          Notifications.cancelScheduledNotificationAsync(
            notification.identifier
          )
      )
    );
  } catch (error) {
    console.error(
      "Error limpiando recordatorios:",
      error
    );
  }
}

/* ======================================================
   SYNC DB ↔ SISTEMA
====================================================== */

/*
 * Pensado para ejecutarse una vez al iniciar TasksScreen.
 *
 * Repara:
 * - IDs legacy perdidos
 * - notificaciones huérfanas
 * - tareas modificadas fuera del scheduler
 */
export async function syncTaskReminders(
  tasks,
  persistTask
) {
  if (!Array.isArray(tasks)) {
    return;
  }

  await cancelAllTaskReminders();

  for (const task of tasks) {
    let notificationId = null;

    const shouldSchedule =
      task.time &&
      task.reminder_minutes != null &&
      !(
        task.repeat_mode ===
          "none" &&
        task.done
      );

    if (shouldSchedule) {
      notificationId =
        await scheduleTaskReminder(
          task
        );
    }

    const previousId =
      task.notification_id ?? null;

    if (
      typeof persistTask ===
        "function" &&
      previousId !==
        notificationId
    ) {
      await persistTask({
        ...task,
        notification_id:
          notificationId,
      });
    }
  }
}

/* ======================================================
   DEBUG
====================================================== */

export async function getScheduledTaskReminders() {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  return scheduled.filter(
    (notification) =>
      notification.content?.data
        ?.type ===
        NOTIFICATION_TYPE ||
      notification.content
        ?.title ===
        "⏰ Recordatorio"
  );
}