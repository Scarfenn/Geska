import {
  initDB,
  getAllTasks,
  updateTask,
  updateTaskNotificationIds,
  setOccurrenceDone,
} from "@/storage/database";

import {
  cancelTaskReminders,
  rescheduleTaskReminders,
} from "@/features/tasks/services/notifications";

import { DeviceEventEmitter } from "react-native";

export async function completeTask(taskId, occurrenceDate = null) {
  await initDB();

  const tasks = await getAllTasks();

  const task = tasks.find(
    (task) => String(task.id) === String(taskId)
  );

  if (!task) {
    console.warn("No se encontró la tarea:", taskId);
    return false;
  }

  const repeating =
    (task.repeat_mode || "none") !== "none";

  // TAREA REPETITIVA
  if (repeating) {
    if (!occurrenceDate) {
      console.warn(
        "Falta occurrenceDate para completar una tarea repetitiva"
      );
      return false;
    }

    const alreadyDone = task.occurrences?.some(
      (occurrence) =>
        occurrence.date === occurrenceDate &&
        occurrence.done
    );

    if (alreadyDone) {
      return true;
    }

    await setOccurrenceDone(
      task.id,
      occurrenceDate,
      true
    );

    const freshTasks = await getAllTasks();

    const freshTask = freshTasks.find(
      (currentTask) =>
        currentTask.id === task.id
    );

    if (freshTask) {
      await rescheduleTaskReminders(freshTask, updateTaskNotificationIds);
    }
    DeviceEventEmitter.emit("tasks-updated")

    return true;
  }

  // TAREA NORMAL
  if (task.done) {
    return true;
  }

  await cancelTaskReminders(
    task.notification_ids ||
      task.notification_id,
    { taskId: task.id }
  );

  await updateTask({
    ...task,
    done: true,
    notification_ids: [],
    notification_id: null,
  });

  DeviceEventEmitter.emit("tasks-updated")

  return true;
}