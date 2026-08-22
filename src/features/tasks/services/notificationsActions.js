import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { completeTask }
  from "@/features/tasks/services/taskCompletion";

import {
  COMPLETE_TASK_ACTION_ID,
} from "@/features/tasks/services/notifications";

export const NOTIFICATION_ACTION_TASK =
  "geska-notification-actions";

export async function handleNotificationResponse(response) {
  if (
    response?.actionIdentifier !==
    COMPLETE_TASK_ACTION_ID
  ) {
    return false;
  }

  const notification =
    response.notification;

  const data =
    notification?.request?.content?.data;

  if (!data?.taskId) {
    return false;
  }

  const completed = await completeTask(
    data.taskId,
    data.occurrenceDate ?? null
  );

  if (completed) {
    await Notifications.dismissNotificationAsync(
      notification.request.identifier
    );
  }

  return completed;
}

// App activa / proceso vivo
Notifications.addNotificationResponseReceivedListener(
  async (response) => {
    await handleNotificationResponse(response);
  }
);

// Background / terminated
TaskManager.defineTask(
  NOTIFICATION_ACTION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;

    if ("actionIdentifier" in data) {
      await handleNotificationResponse(data);
    }
  }
);

Notifications.registerTaskAsync(
  NOTIFICATION_ACTION_TASK
).catch((error) => {
  console.error(
    "No se pudo registrar el handler de acciones:",
    error
  );
});