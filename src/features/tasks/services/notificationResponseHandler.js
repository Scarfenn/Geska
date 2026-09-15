import * as Notifications from "expo-notifications";

import { completeTask }
  from "@/features/tasks/services/taskCompletion";

import {
  COMPLETE_TASK_ACTION_ID,
} from "@/features/tasks/services/notifications";

export const NOTIFICATION_ACTION_TASK =
  "geska-notification-actions";

async function dismissResponseNotification(response) {
  const responseId =
    response?.notification?.request?.identifier;

  const presented =
    await Notifications.getPresentedNotificationsAsync();

  const notification = responseId
    ? presented.find(item => item.request.identifier === responseId)
    : null;

  if (!notification) return;

  await Notifications.dismissNotificationAsync(
    notification.request.identifier
  );
}

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

  await dismissResponseNotification(response);

  return completed;
}
