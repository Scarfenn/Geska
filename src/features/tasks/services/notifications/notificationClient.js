import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import { reminderFromTask } from "@/features/tasks/services/reminderModel";
import { reminderKey } from "@/features/tasks/services/notifications/reminderPlanner";
import {
  NOTIFICATION_TYPE, TASK_REMINDER_CHANNEL_ID,
  TASK_REMINDER_CATEGORY_ID, COMPLETE_TASK_ACTION_ID,
} from "@/features/tasks/services/notifications/constants";

export class NotificationOperationError extends Error {
  constructor(message, { cause, createdIds = [], pendingCancellationIds = [], failures = [] } = {}) {
    super(message);
    this.name = "NotificationOperationError";
    this.cause = cause;
    this.createdIds = createdIds;
    this.pendingCancellationIds = pendingCancellationIds;
    this.failures = failures;
  }
}

export function normalizeIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean))];
}

export function registerNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true,
      shouldPlaySound: true, shouldSetBadge: false,
    }),
  });
}

function hasPermission(settings) {
  if (settings.granted) return true;
  if (Platform.OS !== "ios") return settings.status === Notifications.PermissionStatus.GRANTED;
  return [Notifications.IosAuthorizationStatus.AUTHORIZED,
    Notifications.IosAuthorizationStatus.PROVISIONAL,
    Notifications.IosAuthorizationStatus.EPHEMERAL].includes(settings.ios?.status);
}

// Denial is a normal outcome. Native/API failures reject instead of pretending
// that no reminders are needed. Recheck permissions after changes in Settings.
export async function initNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL_ID, {
      name: "Recordatorios", description: "Recordatorios de tareas de Geska",
      importance: Notifications.AndroidImportance.HIGH, sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  await Notifications.setNotificationCategoryAsync(TASK_REMINDER_CATEGORY_ID, [{
    identifier: COMPLETE_TASK_ACTION_ID, buttonTitle: "COMPLETAR",
    options: { opensAppToForeground: false },
  }]);
  let settings = await Notifications.getPermissionsAsync();
  if (!hasPermission(settings) && settings.canAskAgain !== false) {
    settings = await Notifications.requestPermissionsAsync();
  }
  return hasPermission(settings);
}

export function buildContent(task, entry) {
  const reminder = reminderFromTask(task);
  return {
    title: reminder.type === "persistent" ? "🔔 Tarea pendiente" : "⏰ Recordatorio",
    body: task.title,
    sound: "default",
    categoryIdentifier: TASK_REMINDER_CATEGORY_ID,
    data: {
      type: NOTIFICATION_TYPE, taskId: task.id, reminderType: reminder.type,
      occurrenceDate: entry.occurrenceDate,
      ...(entry.persistentHour == null ? {} : { persistentHour: entry.persistentHour }),
      reminderKey: reminderKey(task.id, reminder.type, entry),
      scheduledAt: entry.date.getTime(),
    },
  };
}

export function isTaskNotification(notification) {
  const content = notification.content;
  return content?.data?.type === NOTIFICATION_TYPE ||
    (content?.data?.taskId != null &&
      ["⏰ Recordatorio", "🔔 Tarea pendiente"].includes(content?.title));
}

export async function getScheduledTaskReminders() {
  return (await Notifications.getAllScheduledNotificationsAsync()).filter(isTaskNotification);
}

export async function cancelNotifications(ids) {
  const failures = [];
  for (const id of normalizeIds(ids)) {
    try { await Notifications.cancelScheduledNotificationAsync(id); }
    catch (cause) { failures.push({ id, cause }); }
  }
  if (failures.length) {
    throw new NotificationOperationError("No se pudieron cancelar todos los recordatorios", {
      failures, pendingCancellationIds: failures.map(f => f.id),
    });
  }
}

// Keep existing reminders until the entire missing batch has been scheduled.
// If creation fails, undo the successful part and report any failed cleanup.
export async function scheduleBatch(task, entries, getNow = () => new Date()) {
  const ids = [];
  try {
    for (const entry of entries) {
      if (entry.date <= getNow()) { ids.push(null); continue; }
      ids.push(await Notifications.scheduleNotificationAsync({
        content: buildContent(task, entry),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE, date: entry.date,
          ...(Platform.OS === "android" ? { channelId: TASK_REMINDER_CHANNEL_ID } : {}),
        },
      }));
    }
    return ids;
  } catch (cause) {
    let cleanup;
    try { await cancelNotifications(ids); } catch (error) { cleanup = error; }
    throw new NotificationOperationError("No se pudieron programar todos los recordatorios", {
      cause, createdIds: ids.filter(Boolean),
      pendingCancellationIds: cleanup?.pendingCancellationIds || [],
      failures: cleanup?.failures || [],
    });
  }
}

export async function openReminderSoundSettings() {
  if (Platform.OS !== "android") return false;
  await initNotifications();
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.CHANNEL_NOTIFICATION_SETTINGS, {
    extra: {
      "android.provider.extra.APP_PACKAGE": Application.applicationId,
      "android.provider.extra.CHANNEL_ID": TASK_REMINDER_CHANNEL_ID,
    },
  });
  return true;
}


export async function dismissPresentedTaskReminders() {
  const presented = await Notifications.getPresentedNotificationsAsync();
  for (const notification of presented) {
    if (isTaskNotification(notification.request)) {
      await Notifications.dismissNotificationAsync(notification.request.identifier);
    }
  }
}
