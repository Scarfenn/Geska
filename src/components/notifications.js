import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/* =========================
   HANDLER GLOBAL
========================= */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/* =========================
   INIT (PERMISOS + ANDROID)
========================= */

export async function initNotifications() {
  // Permisos
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: newStatus } =
      await Notifications.requestPermissionsAsync();

    if (newStatus !== "granted") {
      console.warn("Permiso de notificaciones denegado");
      return false;
    }
  }

  // Canal Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Recordatorios",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

/* =========================
   DATE HELPERS
========================= */

export function getReminderDate(dateStr, timeStr, reminderMinutes) {
  if (!dateStr || !timeStr || reminderMinutes == null) return null;

  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);

  if ([y, m, d, hh, mm].some(isNaN)) return null;

  const date = new Date(y, m - 1, d, hh, mm);
  date.setMinutes(date.getMinutes() - reminderMinutes);

  return date;
}

/* =========================
   SCHEDULE
========================= */

export async function scheduleTaskReminder(task) {
  const reminderDate = getReminderDate(
    task.date,
    task.time,
    task.reminder_minutes
  );

  if (!reminderDate || reminderDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Recordatorio",
      body: task.title,
      sound: "default",
    },
    trigger: {
      date: reminderDate,
    },
  });

  return id;
}

/* =========================
   CANCEL
========================= */

export async function cancelTaskReminder(notificationId) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
