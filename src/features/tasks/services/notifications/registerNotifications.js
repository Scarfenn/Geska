import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { registerNotificationHandler } from "./notificationClient";
import { handleNotificationResponse, NOTIFICATION_ACTION_TASK } from "../notificationResponseHandler";

let registered = false;
async function handleResponse(response) {
  try { await handleNotificationResponse(response); }
  catch (error) { console.error("No se pudo completar la tarea desde la notificación", error); }
}

// Called synchronously from index.js so background tasks are defined at startup.
// Importing planners, clients or action handlers alone has no registration effects.
export function registerNotifications() {
  if (registered) return;
  registered = true;
  registerNotificationHandler();
  Notifications.addNotificationResponseReceivedListener(handleResponse);
  TaskManager.defineTask(NOTIFICATION_ACTION_TASK, async ({ data, error }) => {
    if (error || !data || !("actionIdentifier" in data)) return;
    await handleResponse(data);
  });
  Notifications.registerTaskAsync(NOTIFICATION_ACTION_TASK).catch(error => {
    console.error("No se pudo registrar el handler de acciones:", error);
  });
}
