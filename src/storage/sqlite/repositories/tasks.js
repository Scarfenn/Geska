import { insertTaskRow, updateTaskRow, deleteTaskRows } from "./taskRows";
import { withDatabase } from "../initialize";
import { groupBy, mapTask, mapOccurrence } from "../taskMappers";
export async function getAllTasks() {
  return withDatabase(async db => {
    // Await every read before leaving the transaction, including on failure.
    const tasks = await db.getAllAsync("SELECT * FROM tasks");
    const subtasks = await db.getAllAsync("SELECT * FROM subtasks ORDER BY task_id, sort_order ASC, rowid ASC");
    const occurrences = await db.getAllAsync("SELECT * FROM task_occurrences");
    const subtaskOccurrences = await db.getAllAsync("SELECT * FROM subtask_occurrences");
    const subtasksByTask = groupBy(subtasks, "task_id");
    const occurrencesByTask = groupBy(occurrences, "task_id");
    const occurrencesBySubtask = groupBy(subtaskOccurrences, "subtask_id");
    return tasks.map(task => ({
      ...mapTask(task),
      subtasks: (subtasksByTask.get(task.id) || []).map(subtask => ({
        ...subtask,
        done: !!subtask.done,
        occurrences: (occurrencesBySubtask.get(subtask.id) || []).map(mapOccurrence)
      })),
      occurrences: (occurrencesByTask.get(task.id) || []).map(mapOccurrence)
    }));
  }, {
    transaction: true
  });
}
export async function saveTask(task) {
  return withDatabase(async db => {
    await insertTaskRow(db, task);
  });
}
export async function updateTask(task) {
  return withDatabase(async db => {
    await updateTaskRow(db, task);
  });
}
export async function deleteTask(id) {
  return withDatabase(async db => {
    await deleteTaskRows(db, id);
  }, {
    transaction: true
  });
}

// Notification reconciliation must not overwrite a title/completion edited while
// native scheduling was in flight. A deleted task is never recreated here.
export async function updateTaskNotificationIds(task) {
  return withDatabase(async db => {
    const ids = Array.isArray(task.notification_ids) ? task.notification_ids.filter(Boolean) : [];
    await db.runAsync("UPDATE tasks SET notification_ids=?, notification_id=? WHERE id=?", [JSON.stringify(ids), ids[0] ?? null, task.id]);
  });
}
