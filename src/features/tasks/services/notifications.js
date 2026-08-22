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

import * as Application
  from "expo-application";

import * as IntentLauncher
  from "expo-intent-launcher";

const NOTIFICATION_TYPE = "task-reminder";
const MAX_OCCURRENCE_SEARCH_DAYS = 366 * 10;
const MAX_QUEUED_REMINDERS = 16;


export const TASK_REMINDER_CHANNEL_ID =
  "task-reminders";

export const TASK_REMINDER_CATEGORY_ID =
  "task_reminder_actions";

export const COMPLETE_TASK_ACTION_ID =
  "complete-task";

const LETTER_TO_WEEKDAY = {
  D: 0,
  L: 1,
  M: 2,
  X: 3,
  J: 4,
  V: 5,
  S: 6,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function hasNotificationPermission(settings) {
  if (Platform.OS !== "ios") {
    return (
      settings.granted ||
      settings.status === Notifications.PermissionStatus.GRANTED
    );
  }

  const status = settings.ios?.status;

  return (
    settings.granted ||
    status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function initNotifications() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL_ID, {
        name: "Recordatorios",
        description: "Recordatorios de tareas de Geska",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    await Notifications.setNotificationCategoryAsync(
      TASK_REMINDER_CATEGORY_ID,
      [
        {
          identifier: COMPLETE_TASK_ACTION_ID,
          buttonTitle: "COMPLETAR",
          options: {
            opensAppToForeground: false,
          },
        },
      ]
    );


    let permissions = await Notifications.getPermissionsAsync();

    if (!hasNotificationPermission(permissions)) {
      if (permissions.canAskAgain === false) {
        console.warn(
          "Las notificaciones están bloqueadas desde la configuración del sistema."
        );
        return false;
      }

      permissions = await Notifications.requestPermissionsAsync();
    }

    if (!hasNotificationPermission(permissions)) {
      console.warn("Permiso de notificaciones denegado.");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error inicializando notificaciones:", error);
    return false;
  }
}

function parseTaskDate(value) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (![year, month, day].every(Number.isFinite)) return null;

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseTaskTime(value) {
  if (!value) return null;

  const [hour, minute] = value.split(":").map(Number);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

function parseRepeatEnd(value) {
  const date = parseTaskDate(value);
  if (!date) return null;

  date.setHours(23, 59, 59, 999);
  return date;
}

function formatDateLocal(date) {
  const value = new Date(date);

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(value.getDate()).padStart(2, "0")}`;
}

function combineOccurrenceAndTime(occurrence, time) {
  const parsed = typeof time === "string" ? parseTaskTime(time) : time;
  if (!occurrence || !parsed) return null;

  const date = new Date(occurrence);
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date;
}

function getTaskWeekdays(task) {
  const anchor = parseTaskDate(task.date);
  if (!anchor) return [];

  const selected = task.repeat_days
    ? task.repeat_days
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  if (!selected.length) return [anchor.getDay()];

  return [
    ...new Set(
      selected
        .map((letter) => LETTER_TO_WEEKDAY[letter])
        .filter((value) => value != null)
    ),
  ];
}

function occursOnDate(task, date) {
  const anchor = parseTaskDate(task.date);
  if (!anchor || !date) return false;

  const target = startOfDay(date);
  const start = startOfDay(anchor);

  if (target < start) return false;

  const repeatEnd = parseRepeatEnd(task.repeat_end);
  if (repeatEnd && target > repeatEnd) return false;

  const mode = task.repeat_mode || "none";

  if (mode === "none") {
    return target.getTime() === start.getTime();
  }

  if (mode === "daily") return true;

  if (mode === "weekly") {
    return getTaskWeekdays(task).includes(target.getDay());
  }

  if (mode === "monthly") {
    return target.getDate() === start.getDate();
  }

  return false;
}

function findNextOccurrenceDate(task, from = new Date()) {
  const anchor = parseTaskDate(task.date);
  if (!anchor) return null;

  let cursor = startOfDay(from);
  const start = startOfDay(anchor);

  if (cursor < start) cursor = start;

  for (let offset = 0; offset < MAX_OCCURRENCE_SEARCH_DAYS; offset++) {
    const candidate = new Date(cursor);
    candidate.setDate(cursor.getDate() + offset);

    if (occursOnDate(task, candidate)) return candidate;

    const repeatEnd = parseRepeatEnd(task.repeat_end);
    if (repeatEnd && candidate > repeatEnd) return null;

    if ((task.repeat_mode || "none") === "none" && candidate > start) {
      return null;
    }
  }

  return null;
}

function isOccurrenceDone(task, date) {
  if ((task.repeat_mode || "none") === "none") {
    return !!task.done;
  }

  const dateStr = formatDateLocal(date);

  return !!task.occurrences?.some(
    (occurrence) => occurrence.date === dateStr && !!occurrence.done
  );
}

function findNextPendingOccurrenceDate(task, from = new Date()) {
  let occurrence = findNextOccurrenceDate(task, from);

  for (
    let attempts = 0;
    attempts < MAX_OCCURRENCE_SEARCH_DAYS && occurrence;
    attempts++
  ) {
    if (!isOccurrenceDone(task, occurrence)) return occurrence;

    const next = new Date(occurrence);
    next.setDate(next.getDate() + 1);
    occurrence = findNextOccurrenceDate(task, next);
  }

  return null;
}

function getReminderDateForOccurrence(task, reminder, occurrence) {
  if (!reminder || !occurrence) return null;

  if (reminder.type === "relative") {
    const time = parseTaskTime(task.time);
    if (!time) return null;

    const taskDateTime = combineOccurrenceAndTime(occurrence, time);
    const multiplier = reminder.unit === "hours" ? HOUR_MS : MINUTE_MS;

    return new Date(
      taskDateTime.getTime() - Number(reminder.value || 0) * multiplier
    );
  }

  if (reminder.type === "all_day") {
    const date = new Date(occurrence);
    date.setHours(ALL_DAY_REMINDER_HOUR, 0, 0, 0);
    date.setDate(date.getDate() - Number(reminder.value || 0));
    return date;
  }

  return null;
}

function getNextSingleReminderDate(task, reminder, from = new Date()) {
  if (!reminder) return null;

  if (reminder.type === "after") {
    const date = new Date(Number(reminder.at));
    return Number.isFinite(date.getTime()) && date > from ? date : null;
  }

  let occurrence = findNextPendingOccurrenceDate(task, from);

  for (
    let attempts = 0;
    attempts < MAX_OCCURRENCE_SEARCH_DAYS && occurrence;
    attempts++
  ) {
    const reminderDate = getReminderDateForOccurrence(
      task,
      reminder,
      occurrence
    );

    if (reminderDate && reminderDate > from) return reminderDate;

    if ((task.repeat_mode || "none") === "none") break;

    const next = new Date(occurrence);
    next.setDate(next.getDate() + 1);
    occurrence = findNextPendingOccurrenceDate(task, next);
  }

  return null;
}

function addAndroidChannel(trigger) {
  if (Platform.OS !== "android") return trigger;
  return { ...trigger, channelId: TASK_REMINDER_CHANNEL_ID };
}

function buildContent(task, reminder, extraData = {}) {
  const persistent = reminder?.type === "persistent";

  return {
    title: persistent
      ? "🔔 Tarea pendiente"
      : "⏰ Recordatorio",

    body: task.title,
    sound: "default",

    categoryIdentifier:
      TASK_REMINDER_CATEGORY_ID,

    data: {
      type: NOTIFICATION_TYPE,
      taskId: task.id,
      reminderType:
        reminder?.type || "legacy",
      ...extraData,
    },
  };
}

async function scheduleTrigger(task, reminder, trigger, extraData = {}) {
  return Notifications.scheduleNotificationAsync({
    content: buildContent(task, reminder, extraData),
    trigger,
  });
}

async function scheduleDate(task, reminder, date, extraData = {}) {
  if (!date || date <= new Date()) return null;

  return scheduleTrigger(
    task,
    reminder,
    addAndroidChannel({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    }),
    extraData
  );
}

async function scheduleOccurrenceQueue(task, reminder) {
  const ids = [];
  const now = new Date();
  let searchFrom = new Date(now);

  for (
    let attempts = 0;
    attempts < MAX_OCCURRENCE_SEARCH_DAYS &&
    ids.length < MAX_QUEUED_REMINDERS;
    attempts++
  ) {
    const occurrence = findNextPendingOccurrenceDate(task, searchFrom);
    if (!occurrence) break;

    const reminderDate = getReminderDateForOccurrence(
      task,
      reminder,
      occurrence
    );

    if (reminderDate && reminderDate > now) {
      const id = await scheduleDate(task, reminder, reminderDate, {
        occurrenceDate: formatDateLocal(occurrence),
      });

      if (id) ids.push(id);
    }

    if ((task.repeat_mode || "none") === "none") break;

    searchFrom = new Date(occurrence);
    searchFrom.setDate(searchFrom.getDate() + 1);
  }

  return ids;
}

async function schedulePersistent(task, reminder) {
  const ids = [];
  const now = new Date();
  let searchFrom = new Date(now);

  for (
    let attempts = 0;
    attempts < MAX_OCCURRENCE_SEARCH_DAYS &&
    ids.length < MAX_QUEUED_REMINDERS;
    attempts++
  ) {
    const occurrence = findNextPendingOccurrenceDate(task, searchFrom);
    if (!occurrence) break;

    for (const hour of PERSISTENT_REMINDER_HOURS) {
      if (ids.length >= MAX_QUEUED_REMINDERS) break;

      const date = new Date(occurrence);
      date.setHours(hour, 0, 0, 0);

      if (date <= now) continue;

      const id = await scheduleDate(task, reminder, date, {
        occurrenceDate: formatDateLocal(occurrence),
        persistentHour: hour,
      });

      if (id) ids.push(id);
    }

    if ((task.repeat_mode || "none") === "none") break;

    searchFrom = new Date(occurrence);
    searchFrom.setDate(searchFrom.getDate() + 1);
  }

  return ids;
}

export async function scheduleTaskReminders(task) {
  const reminder = reminderFromTask(task);

  if (!task?.id || !task?.title?.trim() || !task?.date || !reminder) {
    return [];
  }

  if ((task.repeat_mode || "none") === "none" && task.done) {
    return [];
  }

  const ready = await initNotifications();
  if (!ready) return [];

  try {
    if (reminder.type === "persistent") {
      return await schedulePersistent(task, reminder);
    }

    if (reminder.type === "after") {
      const date = new Date(Number(reminder.at));
      const id = await scheduleDate(task, reminder, date);
      return id ? [id] : [];
    }

    const repeating = (task.repeat_mode || "none") !== "none";

    if (
      repeating &&
      (reminder.type === "relative" || reminder.type === "all_day")
    ) {
      return await scheduleOccurrenceQueue(task, reminder);
    }

    const nextReminder = getNextSingleReminderDate(task, reminder);
    const id = await scheduleDate(task, reminder, nextReminder);
    return id ? [id] : [];
  } catch (error) {
    console.error(
      `No se pudieron programar los recordatorios de "${task.title}":`,
      error
    );
    return [];
  }
}

function normalizeIds(ids) {
  if (!ids) return [];
  return Array.isArray(ids) ? ids.filter(Boolean) : [ids].filter(Boolean);
}

export async function cancelTaskReminders(ids) {
  const notificationIds = normalizeIds(ids);
  if (!notificationIds.length) return;

  await Promise.all(
    notificationIds.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (error) {
        console.warn("No se pudo cancelar la notificación:", id, error);
      }
    })
  );
}

export async function cancelAllTaskReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    const taskNotifications = scheduled.filter(
      (notification) =>
        notification.content?.data?.type === NOTIFICATION_TYPE ||
        notification.content?.title === "⏰ Recordatorio" ||
        notification.content?.title === "🔔 Tarea pendiente"
    );

    await Promise.all(
      taskNotifications.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
  } catch (error) {
    console.error("Error limpiando recordatorios:", error);
  }
}

export async function rescheduleTaskReminders(task) {
  if (!task) return null;

  await cancelTaskReminders(task.notification_ids || task.notification_id);

  const cleanTask = {
    ...task,
    notification_ids: [],
    notification_id: null,
  };

  const ids = await scheduleTaskReminders(cleanTask);

  return {
    ...cleanTask,
    notification_ids: ids,
    notification_id: ids[0] ?? null,
  };
}

function sameIds(a, b) {
  const left = normalizeIds(a).sort();
  const right = normalizeIds(b).sort();

  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export async function syncTaskReminders(tasks, persistTask) {
  if (!Array.isArray(tasks)) return;

  await cancelAllTaskReminders();

  for (const task of tasks) {
    const ids = await scheduleTaskReminders(task);

    if (
      typeof persistTask === "function" &&
      !sameIds(task.notification_ids || task.notification_id, ids)
    ) {
      await persistTask({
        ...task,
        notification_ids: ids,
        notification_id: ids[0] ?? null,
      });
    }
  }
}

export async function scheduleTaskReminder(task) {
  const ids = await scheduleTaskReminders(task);
  return ids[0] ?? null;
}

export async function cancelTaskReminder(id) {
  await cancelTaskReminders(id);
}

export async function getScheduledTaskReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  return scheduled.filter(
    (notification) =>
      notification.content?.data?.type === NOTIFICATION_TYPE ||
      notification.content?.title === "⏰ Recordatorio" ||
      notification.content?.title === "🔔 Tarea pendiente"
  );
}

export async function openReminderSoundSettings() {
  if (Platform.OS !== "android") {
    return false;
  }

  await initNotifications();

  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction
      .CHANNEL_NOTIFICATION_SETTINGS,
    {
      extra: {
        "android.provider.extra.APP_PACKAGE":
          Application.applicationId,

        "android.provider.extra.CHANNEL_ID":
          TASK_REMINDER_CHANNEL_ID,
      },
    }
  );

  return true;
}