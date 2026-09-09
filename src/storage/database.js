// Stable public API. Keep SQLite details inside sqlite/.
// All operations await initialization and reject on database failures.
// Occurrence lookups return null only when the row does not exist.
export { initDB } from "./sqlite/initialize";
export { getAllTasks, saveTask, updateTask, updateTaskNotificationIds, deleteTask } from "./sqlite/repositories/tasks";
export { getAllCategories, addCategory, updateCategory, deleteCategory } from "./sqlite/repositories/categories";
export { addSubtask, deleteSubtask, updateSubtaskOrder, updateSubtaskDone, updateSubtaskText } from "./sqlite/repositories/subtasks";
export { getOccurrence, setOccurrenceDone, clearOccurrence, getSubtaskOccurrence, setSubtaskOccurrenceDone } from "./sqlite/repositories/occurrences";
