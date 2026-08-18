import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  ALL_DAY_REMINDER_HOUR,
  PERSISTENT_REMINDER_HOURS,
  MINUTE_MS,
  HOUR_MS,
  startOfDay,
  reminderFromTask,
} from "@/features/tasks/services/reminderModel";

const CHANNEL_ID = "task-reminders";
const NOTIFICATION_TYPE = "task-reminder";

const MAX_OCCURRENCE_SEARCH_DAYS =
  366 * 10;

const WEEKDAY_LETTERS = [
  "D",
  "L",
  "M",
  "X",
  "J",
  "V",
  "S",
];

const LETTER_TO_WEEKDAY = {
  D: 0,
  L: 1,
  M: 2,
  X: 3,
  J: 4,
  V: 5,
  S: 6,
};

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
   PERMISOS / CANAL
====================================================== */

function hasNotificationPermission(
  settings
) {
  if (Platform.OS !== "ios") {
    return (
      settings.granted ||
      settings.status ===
        Notifications.PermissionStatus
          .GRANTED
    );
  }

  const iosStatus =
    settings.ios?.status;

  return (
    settings.granted ||
    iosStatus ===
      Notifications
        .IosAuthorizationStatus
        .AUTHORIZED ||
    iosStatus ===
      Notifications
        .IosAuthorizationStatus
        .PROVISIONAL ||
    iosStatus ===
      Notifications
        .IosAuthorizationStatus
        .EPHEMERAL
  );
}

export async function initNotifications() {
  try {
    /*
     * Android 13 requiere un canal antes de que
     * el sistema pueda mostrar correctamente
     * el prompt de notificaciones.
     */
    if (Platform.OS === "android") {
      await Notifications
        .setNotificationChannelAsync(
          CHANNEL_ID,
          {
            name: "Recordatorios",

            description:
              "Recordatorios de tareas de Geska",

            importance:
              Notifications
                .AndroidImportance
                .HIGH,

            sound: "default",

            vibrationPattern: [
              0,
              250,
              250,
              250,
            ],
          }
        );
    }

    let permissions =
      await Notifications
        .getPermissionsAsync();

    if (
      !hasNotificationPermission(
        permissions
      )
    ) {
      if (
        permissions.canAskAgain ===
        false
      ) {
        console.warn(
          "Las notificaciones están bloqueadas desde la configuración del sistema."
        );

        return false;
      }

      permissions =
        await Notifications
          .requestPermissionsAsync();
    }

    if (
      !hasNotificationPermission(
        permissions
      )
    ) {
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
   FECHAS / REPETICIÓN
====================================================== */

function parseTaskDate(dateStr) {
  if (!dateStr) return null;

  const parts =
    dateStr
      .split("-")
      .map(Number);

  if (
    parts.length !== 3 ||
    parts.some(
      (value) =>
        !Number.isFinite(value)
    )
  ) {
    return null;
  }

  const [year, month, day] =
    parts;

  const date =
    new Date(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseTaskTime(timeStr) {
  if (!timeStr) return null;

  const parts =
    timeStr
      .split(":")
      .map(Number);

  if (
    parts.length !== 2 ||
    parts.some(
      (value) =>
        !Number.isFinite(value)
    )
  ) {
    return null;
  }

  const [hour, minute] =
    parts;

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    hour,
    minute,
  };
}

function parseRepeatEnd(dateStr) {
  const date =
    parseTaskDate(dateStr);

  if (!date) return null;

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
}

function combineOccurrenceAndTime(
  occurrenceDate,
  taskTime
) {
  const parsedTime =
    typeof taskTime === "string"
      ? parseTaskTime(taskTime)
      : taskTime;

  if (
    !occurrenceDate ||
    !parsedTime
  ) {
    return null;
  }

  const date =
    new Date(
      occurrenceDate
    );

  date.setHours(
    parsedTime.hour,
    parsedTime.minute,
    0,
    0
  );

  return date;
}

function getTaskWeekdays(task) {
  const anchor =
    parseTaskDate(task.date);

  if (!anchor) return [];

  const selected =
    task.repeat_days
      ? task.repeat_days
          .split(",")
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean)
      : [];

  if (selected.length) {
    return [
      ...new Set(
        selected
          .map(
            (letter) =>
              LETTER_TO_WEEKDAY[
                letter
              ]
          )
          .filter(
            (value) =>
              value != null
          )
      ),
    ];
  }

  return [
    anchor.getDay(),
  ];
}

function occursOnDate(
  task,
  date
) {
  const anchor =
    parseTaskDate(task.date);

  if (!anchor || !date) {
    return false;
  }

  const target =
    startOfDay(date);

  const start =
    startOfDay(anchor);

  if (target < start) {
    return false;
  }

  const repeatEnd =
    parseRepeatEnd(
      task.repeat_end
    );

  if (
    repeatEnd &&
    target > repeatEnd
  ) {
    return false;
  }

  const mode =
    task.repeat_mode ||
    "none";

  if (mode === "none") {
    return (
      target.getTime() ===
      start.getTime()
    );
  }

  if (mode === "daily") {
    return true;
  }

  if (mode === "weekly") {
    return getTaskWeekdays(
      task
    ).includes(
      target.getDay()
    );
  }

  if (mode === "monthly") {
    return (
      target.getDate() ===
      start.getDate()
    );
  }

  // Custom todavía no está terminado.
  return false;
}

function findNextOccurrenceDate(
  task,
  from = new Date()
) {
  const anchor =
    parseTaskDate(task.date);

  if (!anchor) return null;

  let cursor =
    startOfDay(from);

  if (
    cursor <
    startOfDay(anchor)
  ) {
    cursor =
      startOfDay(anchor);
  }

  for (
    let offset = 0;
    offset <
      MAX_OCCURRENCE_SEARCH_DAYS;
    offset++
  ) {
    const candidate =
      new Date(cursor);

    candidate.setDate(
      cursor.getDate() +
        offset
    );

    if (
      occursOnDate(
        task,
        candidate
      )
    ) {
      return candidate;
    }

    const repeatEnd =
      parseRepeatEnd(
        task.repeat_end
      );

    if (
      repeatEnd &&
      candidate > repeatEnd
    ) {
      return null;
    }

    if (
      task.repeat_mode ===
        "none" &&
      candidate >
        startOfDay(anchor)
    ) {
      return null;
    }
  }

  return null;
}

function getNextSingleReminderDate(
  task,
  reminder,
  from = new Date()
) {
  if (!reminder) {
    return null;
  }

  if (
    reminder.type === "after"
  ) {
    const date =
      new Date(
        Number(reminder.at)
      );

    return (
      Number.isFinite(
        date.getTime()
      ) &&
      date > from
    )
      ? date
      : null;
  }

  const taskTime =
    parseTaskTime(
      task.time
    );

  let occurrence =
    findNextOccurrenceDate(
      task,
      from
    );

  for (
    let attempts = 0;
    attempts < 3660 &&
    occurrence;
    attempts++
  ) {
    let reminderDate = null;

    if (
      reminder.type ===
        "relative"
    ) {
      if (!taskTime) {
        return null;
      }

      const taskDateTime =
        combineOccurrenceAndTime(
          occurrence,
          taskTime
        );

      const multiplier =
        reminder.unit ===
          "hours"
          ? HOUR_MS
          : MINUTE_MS;

      reminderDate =
        new Date(
          taskDateTime.getTime() -
            Number(
              reminder.value || 0
            ) *
              multiplier
        );
    }

    if (
      reminder.type ===
        "all_day"
    ) {
      reminderDate =
        new Date(
          occurrence
        );

      reminderDate.setHours(
        ALL_DAY_REMINDER_HOUR,
        0,
        0,
        0
      );

      reminderDate.setDate(
        reminderDate.getDate() -
          Number(
            reminder.value || 0
          )
      );
    }

    if (
      reminderDate &&
      reminderDate > from
    ) {
      return reminderDate;
    }

    const nextSearch =
      new Date(occurrence);

    nextSearch.setDate(
      nextSearch.getDate() + 1
    );

    occurrence =
      findNextOccurrenceDate(
        task,
        nextSearch
      );

    if (
      task.repeat_mode ===
      "none"
    ) {
      break;
    }
  }

  return null;
}

/* ======================================================
   TRIGGERS RECURRENTES NATIVOS
====================================================== */

function addAndroidChannel(
  trigger
) {
  if (
    Platform.OS !==
    "android"
  ) {
    return trigger;
  }

  return {
    ...trigger,
    channelId:
      CHANNEL_ID,
  };
}

function positiveModulo(
  value,
  modulo
) {
  return (
    ((value % modulo) +
      modulo) %
    modulo
  );
}

function getShiftedClock(
  hour,
  minute,
  minutesOffset
) {
  const total =
    hour * 60 +
    minute -
    minutesOffset;

  const dayShift =
    Math.floor(
      total / (24 * 60)
    );

  const normalized =
    positiveModulo(
      total,
      24 * 60
    );

  return {
    dayShift,

    hour:
      Math.floor(
        normalized / 60
      ),

    minute:
      normalized % 60,
  };
}

function recurrenceHasStarted(
  task
) {
  const anchor =
    parseTaskDate(task.date);

  if (!anchor) return false;

  return (
    startOfDay(anchor) <=
    startOfDay(new Date())
  );
}

function buildRelativeRecurringTriggers(
  task,
  reminder
) {
  if (
    reminder.type !==
      "relative" ||
    task.repeat_end ||
    !recurrenceHasStarted(
      task
    )
  ) {
    return null;
  }

  const mode =
    task.repeat_mode ||
    "none";

  if (
    ![
      "daily",
      "weekly",
      "monthly",
    ].includes(mode)
  ) {
    return null;
  }

  const time =
    parseTaskTime(
      task.time
    );

  if (!time) {
    return null;
  }

  const minutesOffset =
    reminder.unit === "hours"
      ? Number(
          reminder.value || 0
        ) * 60
      : Number(
          reminder.value || 0
        );

  const shifted =
    getShiftedClock(
      time.hour,
      time.minute,
      minutesOffset
    );

  if (mode === "daily") {
    return [
      addAndroidChannel({
        type:
          Notifications
            .SchedulableTriggerInputTypes
            .DAILY,

        hour:
          shifted.hour,

        minute:
          shifted.minute,
      }),
    ];
  }

  if (mode === "weekly") {
    return getTaskWeekdays(
      task
    ).map((weekday) =>
      addAndroidChannel({
        type:
          Notifications
            .SchedulableTriggerInputTypes
            .WEEKLY,

        weekday:
          positiveModulo(
            weekday +
              shifted.dayShift,
            7
          ) + 1,

        hour:
          shifted.hour,

        minute:
          shifted.minute,
      })
    );
  }

  if (mode === "monthly") {
    const anchor =
      parseTaskDate(
        task.date
      );

    const occurrence =
      combineOccurrenceAndTime(
        anchor,
        time
      );

    const reminderDate =
      new Date(
        occurrence.getTime() -
          minutesOffset *
            MINUTE_MS
      );

    /*
     * Si el aviso cruza al mes anterior,
     * un único MONTHLY no representa
     * correctamente todos los meses.
     */
    if (
      reminderDate.getMonth() !==
        occurrence.getMonth() ||
      reminderDate.getFullYear() !==
        occurrence.getFullYear()
    ) {
      return null;
    }

    return [
      addAndroidChannel({
        type:
          Notifications
            .SchedulableTriggerInputTypes
            .MONTHLY,

        day:
          reminderDate.getDate(),

        hour:
          reminderDate.getHours(),

        minute:
          reminderDate.getMinutes(),
      }),
    ];
  }

  return null;
}

function buildAllDayRecurringTriggers(
  task,
  reminder
) {
  if (
    reminder.type !==
      "all_day" ||
    task.repeat_end ||
    !recurrenceHasStarted(
      task
    )
  ) {
    return null;
  }

  const mode =
    task.repeat_mode ||
    "none";

  const daysBefore =
    Number(
      reminder.value || 0
    );

  if (mode === "daily") {
    return [
      addAndroidChannel({
        type:
          Notifications
            .SchedulableTriggerInputTypes
            .DAILY,

        hour:
          ALL_DAY_REMINDER_HOUR,

        minute: 0,
      }),
    ];
  }

  if (mode === "weekly") {
    return getTaskWeekdays(
      task
    ).map((weekday) =>
      addAndroidChannel({
        type:
          Notifications
            .SchedulableTriggerInputTypes
            .WEEKLY,

        weekday:
          positiveModulo(
            weekday -
              daysBefore,
            7
          ) + 1,

        hour:
          ALL_DAY_REMINDER_HOUR,

        minute: 0,
      })
    );
  }

  if (
    mode === "monthly" &&
    daysBefore === 0
  ) {
    const anchor =
      parseTaskDate(
        task.date
      );

    if (!anchor) {
      return null;
    }

    return [
      addAndroidChannel({
        type:
          Notifications
            .SchedulableTriggerInputTypes
            .MONTHLY,

        day:
          anchor.getDate(),

        hour:
          ALL_DAY_REMINDER_HOUR,

        minute: 0,
      }),
    ];
  }

  return null;
}

function buildRecurringTriggers(
  task,
  reminder
) {
  return (
    buildRelativeRecurringTriggers(
      task,
      reminder
    ) ||
    buildAllDayRecurringTriggers(
      task,
      reminder
    )
  );
}

/* ======================================================
   PROGRAMACIÓN
====================================================== */

function buildContent(
  task,
  reminder,
  extraData = {}
) {
  const persistent =
    reminder?.type ===
    "persistent";

  return {
    title: persistent
      ? "🔔 Tarea pendiente"
      : "⏰ Recordatorio",

    body: task.title,

    sound: "default",

    data: {
      type:
        NOTIFICATION_TYPE,

      taskId:
        task.id,

      reminderType:
        reminder?.type ||
        "legacy",

      ...extraData,
    },
  };
}

async function scheduleTrigger(
  task,
  reminder,
  trigger,
  extraData = {}
) {
  return Notifications
    .scheduleNotificationAsync({
      content:
        buildContent(
          task,
          reminder,
          extraData
        ),

      trigger,
    });
}

async function scheduleDate(
  task,
  reminder,
  date,
  extraData = {}
) {
  if (
    !date ||
    date <= new Date()
  ) {
    return null;
  }

  return scheduleTrigger(
    task,
    reminder,

    addAndroidChannel({
      type:
        Notifications
          .SchedulableTriggerInputTypes
          .DATE,

      date,
    }),

    extraData
  );
}

async function schedulePersistent(
  task,
  reminder
) {
  let occurrence =
    findNextOccurrenceDate(
      task,
      new Date()
    );

  for (
    let attempts = 0;
    attempts < 30 &&
    occurrence;
    attempts++
  ) {
    const now =
      new Date();

    const dates =
      PERSISTENT_REMINDER_HOURS
        .map((hour) => {
          const date =
            new Date(
              occurrence
            );

          date.setHours(
            hour,
            0,
            0,
            0
          );

          return {
            date,
            hour,
          };
        })
        .filter(
          ({ date }) =>
            date > now
        );

    if (dates.length) {
      const ids = [];

      for (
        const {
          date,
          hour,
        } of dates
      ) {
        const id =
          await scheduleDate(
            task,
            reminder,
            date,
            {
              persistentHour:
                hour,
            }
          );

        if (id) {
          ids.push(id);
        }
      }

      return ids;
    }

    if (
      task.repeat_mode ===
      "none"
    ) {
      return [];
    }

    const nextSearch =
      new Date(occurrence);

    nextSearch.setDate(
      nextSearch.getDate() + 1
    );

    occurrence =
      findNextOccurrenceDate(
        task,
        nextSearch
      );
  }

  return [];
}

export async function scheduleTaskReminders(
  task
) {
  const reminder =
    reminderFromTask(task);

  if (
    !task?.id ||
    !task?.title?.trim() ||
    !task?.date ||
    !reminder
  ) {
    return [];
  }

  /*
   * Una tarea simple terminada no necesita
   * ningún aviso nuevo.
   */
  if (
    task.repeat_mode ===
      "none" &&
    task.done
  ) {
    return [];
  }

  const ready =
    await initNotifications();

  if (!ready) {
    return [];
  }

  try {
    if (
      reminder.type ===
      "persistent"
    ) {
      return await schedulePersistent(
        task,
        reminder
      );
    }

    if (
      reminder.type ===
      "after"
    ) {
      const date =
        new Date(
          Number(
            reminder.at
          )
        );

      const id =
        await scheduleDate(
          task,
          reminder,
          date
        );

      return id
        ? [id]
        : [];
    }

    const recurringTriggers =
      buildRecurringTriggers(
        task,
        reminder
      );

    if (
      recurringTriggers?.length
    ) {
      const ids = [];

      for (
        const trigger of
        recurringTriggers
      ) {
        const id =
          await scheduleTrigger(
            task,
            reminder,
            trigger
          );

        ids.push(id);
      }

      return ids;
    }

    /*
     * Casos que un trigger recurrente nativo no
     * puede expresar fielmente (repeat_end,
     * monthly que cruza de mes, inicio futuro...)
     * se programan como próxima fecha exacta.
     *
     * syncTaskReminders los vuelve a calcular
     * cuando Geska inicia.
     */
    const nextReminder =
      getNextSingleReminderDate(
        task,
        reminder
      );

    const id =
      await scheduleDate(
        task,
        reminder,
        nextReminder
      );

    return id
      ? [id]
      : [];
  } catch (error) {
    console.error(
      `No se pudieron programar los recordatorios de "${task.title}":`,
      error
    );

    return [];
  }
}

/* ======================================================
   CANCELACIÓN
====================================================== */

function normalizeIds(ids) {
  if (!ids) return [];

  if (Array.isArray(ids)) {
    return ids.filter(Boolean);
  }

  return [ids].filter(Boolean);
}

export async function cancelTaskReminders(
  ids
) {
  const notificationIds =
    normalizeIds(ids);

  if (!notificationIds.length) {
    return;
  }

  await Promise.all(
    notificationIds.map(
      async (id) => {
        try {
          await Notifications
            .cancelScheduledNotificationAsync(
              id
            );
        } catch (error) {
          console.warn(
            "No se pudo cancelar la notificación:",
            id,
            error
          );
        }
      }
    )
  );
}

export async function cancelAllTaskReminders() {
  try {
    const scheduled =
      await Notifications
        .getAllScheduledNotificationsAsync();

    const taskNotifications =
      scheduled.filter(
        (notification) =>
          notification.content?.data
            ?.type ===
            NOTIFICATION_TYPE ||
          notification.content
            ?.title ===
            "⏰ Recordatorio" ||
          notification.content
            ?.title ===
            "🔔 Tarea pendiente"
      );

    await Promise.all(
      taskNotifications.map(
        (notification) =>
          Notifications
            .cancelScheduledNotificationAsync(
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

function sameIds(a, b) {
  const left =
    normalizeIds(a);

  const right =
    normalizeIds(b);

  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  const leftSorted =
    [...left].sort();

  const rightSorted =
    [...right].sort();

  return leftSorted.every(
    (value, index) =>
      value ===
      rightSorted[index]
  );
}

export async function syncTaskReminders(
  tasks,
  persistTask
) {
  if (!Array.isArray(tasks)) {
    return;
  }

  /*
   * El sistema operativo es efímero y SQLite
   * es la fuente de verdad. Al entrar a Tasks
   * reconstruimos todos los schedules vigentes.
   */
  await cancelAllTaskReminders();

  for (const task of tasks) {
    const ids =
      await scheduleTaskReminders(
        task
      );

    if (
      typeof persistTask ===
        "function" &&
      !sameIds(
        task.notification_ids ||
          task.notification_id,
        ids
      )
    ) {
      await persistTask({
        ...task,

        notification_ids:
          ids,

        notification_id:
          ids[0] ??
          null,
      });
    }
  }
}

/* ======================================================
   COMPATIBILIDAD / DEBUG
====================================================== */

// Alias temporales para cualquier componente viejo
// que todavía use la API singular.
export async function scheduleTaskReminder(
  task
) {
  const ids =
    await scheduleTaskReminders(
      task
    );

  return ids[0] ??
    null;
}

export async function cancelTaskReminder(
  id
) {
  await cancelTaskReminders(
    id
  );
}

export async function getScheduledTaskReminders() {
  const scheduled =
    await Notifications
      .getAllScheduledNotificationsAsync();

  return scheduled.filter(
    (notification) =>
      notification.content?.data
        ?.type ===
        NOTIFICATION_TYPE ||
      notification.content
        ?.title ===
        "⏰ Recordatorio" ||
      notification.content
        ?.title ===
        "🔔 Tarea pendiente"
  );
}
