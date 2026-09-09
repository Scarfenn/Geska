import { saveTaskSubtasks, toggleSubtaskDone as toggle } from "./taskCommands";

// Compatibility adapters; persistence is owned by the aggregate commands.
export function saveSubtasks(task, drafts) {
  return saveTaskSubtasks(task.id, drafts);
}

export function toggleSubtaskDone(task, subtaskId, selectedDay) {
  return toggle(task.id, subtaskId, selectedDay);
}
