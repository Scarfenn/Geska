import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { completeTask }
  from "@/features/tasks/services/taskCompletion";

import {
  COMPLETE_TASK_ACTION_ID,
} from "@/features/tasks/services/notifications";

export const NOTIFICATION_ACTION_TASK =
  "geska-notification-actions";

export async function handleNotificationResponse(
  response
) {
  if (
    response?.actionIdentifier !==
    COMPLETE_TASK_ACTION_ID
  ) {
    return false;
  }

  const data =
    response.notification?.request?.content?.data;

  if (!data?.taskId) {
    return false;
  }

  return completeTask(
    data.taskId,
    data.occurrenceDate ?? null
  );
}

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