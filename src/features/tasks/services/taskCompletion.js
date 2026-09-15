import { DeviceEventEmitter } from "react-native";
import { setTaskDone } from "@/features/tasks/services/taskCommands";

// Notification adapter: repeated delivery always requests done=true, never toggle.
export async function completeTask(taskId, occurrenceDate = null) {
  if (!occurrenceDate) return false;
  try {
    const result = await setTaskDone(taskId, true, occurrenceDate);
    if (result.reminders.status === "failed") {
      console.error("Tarea completada; sus recordatorios necesitan sincronización", result.reminders.error);
    }
    DeviceEventEmitter.emit("tasks-updated");
    return true;
  } catch (error) {
    if (["TASK_NOT_FOUND", "OCCURRENCE_REQUIRED", "INVALID_TASK_DRAFT", "STALE_OCCURRENCE"].includes(error.code)) return false;
    throw error;
  }
}
