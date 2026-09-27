// Stable public API. Keep SQLite details inside sqlite/.
// All operations await initialization and reject on database failures.
// Occurrence lookups return null only when the row does not exist.
export { initDB } from "@/storage/sqlite/initialize";
export { getAllTasks, saveTask, updateTask, updateTaskNotificationIds, deleteTask } from "@/storage/sqlite/repositories/tasks";
export { getAllCategories, addCategory, updateCategory, deleteCategory } from "@/storage/sqlite/repositories/categories";
export { addSubtask, deleteSubtask, updateSubtaskOrder, updateSubtaskDone, updateSubtaskText } from "@/storage/sqlite/repositories/subtasks";
export { getOccurrence, setOccurrenceDone, clearOccurrence, getSubtaskOccurrence, setSubtaskOccurrenceDone } from "@/storage/sqlite/repositories/occurrences";
export {
  newTaskId, createTaskWithSubtasks, editTaskWithSubtasks, replaceTaskSubtasks,
  changeTaskCompletion, removeTaskWithSnapshot,
} from "@/storage/sqlite/repositories/taskWrites";

// Full raw snapshot for backups; normal UI repositories retain their filters.
export { getBackupSnapshot } from "@/storage/sqlite/backupSnapshot";
export { replaceDatabaseFromBackup } from "@/storage/sqlite/restoreSnapshot";
