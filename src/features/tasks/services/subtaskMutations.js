import { addSubtask, deleteSubtask, updateSubtaskText, updateSubtaskOrder, updateSubtaskDone, setSubtaskOccurrenceDone } from "@/storage/database";
import { formatDateLocal } from "../domain/taskDates";
export async function saveSubtasks(task, draftSubtasks) {
  const taskId = task?.id;
  if (!task) return;
  const originalSubtasks = task.subtasks || [];
  const originalMap = new Map(originalSubtasks.map(subtask => [String(subtask.id), subtask]));
  const existingDraftIds = new Set(draftSubtasks.filter(subtask => !subtask.isNew).map(subtask => String(subtask.id)));

  // ELIMINADAS
  for (const original of originalSubtasks) {
    if (!existingDraftIds.has(String(original.id))) {
      await deleteSubtask(original.id);
    }
  }

  // NUEVAS / EDITADAS / REORDENADAS
  for (const subtask of draftSubtasks) {
    const text = subtask.text.trim();
    if (!text) continue;
    const original = originalMap.get(String(subtask.id));
    if (subtask.isNew || !original) {
      await addSubtask(taskId, text, subtask.sort_order);
      continue;
    }
    if (original.text !== text) {
      await updateSubtaskText(subtask.id, text);
    }
    if (original.sort_order !== subtask.sort_order) {
      await updateSubtaskOrder(subtask.id, subtask.sort_order);
    }
  }
}
export async function toggleSubtaskDone(task, subtaskId, selectedDay) {
  if (!task) return;
  const subtask = task.subtasks?.find(subtask => subtask.id === subtaskId);
  if (!subtask) return;

  // TAREA NORMAL
  if (task.repeat_mode === "none") {
    await updateSubtaskDone(subtaskId, !subtask.done);
    return;
  }

  // TAREA REPETITIVA
  const dateStr = formatDateLocal(selectedDay);
  const occurrence = subtask.occurrences?.find(occurrence => occurrence.date === dateStr);
  const newDone = occurrence ? !occurrence.done : true;
  await setSubtaskOccurrenceDone(subtaskId, dateStr, newDone);
}
