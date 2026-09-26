import { deletionTimeSql } from "@/storage/sqlite/timestamps";
import { withDatabase } from "@/storage/sqlite/initialize";
export async function addSubtask(taskId, text, sortOrder = null) {
  return withDatabase(async db => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let finalSortOrder = sortOrder;
    if (finalSortOrder == null) {
      const result = await db.getFirstAsync(`
          SELECT
            COALESCE(MAX(sort_order), -1) + 1
              AS next_order
          FROM subtasks
          WHERE deleted_at IS NULL AND task_id=?
          `, [taskId]);
      finalSortOrder = result?.next_order ?? 0;
    }
    await db.runAsync(`
      INSERT INTO subtasks (
        id,
        task_id,
        text,
        done,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?)
      `, [id, taskId, text, 0, finalSortOrder]);
    return id;
  }, {
    transaction: true
  });
}
export async function deleteSubtask(id) {
  return withDatabase(async db => {
    await db.runAsync(`
      UPDATE subtask_occurrences SET deleted_at=${deletionTimeSql}
      WHERE deleted_at IS NULL AND subtask_id=?
      `, [id]);
    await db.runAsync(`UPDATE subtasks SET deleted_at=${deletionTimeSql} WHERE deleted_at IS NULL AND id=?`, [id]);
  }, {
    transaction: true
  });
}
export async function updateSubtaskOrder(id, sortOrder) {
  return withDatabase(async db => {
    await db.runAsync(`
      UPDATE subtasks
      SET sort_order=?
      WHERE deleted_at IS NULL AND id=?
      `, [sortOrder, id]);
  });
}
export async function updateSubtaskDone(id, done) {
  return withDatabase(async db => {
    await db.runAsync("UPDATE subtasks SET done=? WHERE deleted_at IS NULL AND id=?", [done ? 1 : 0, id]);
  });
}
export async function updateSubtaskText(id, text) {
  return withDatabase(async db => {
    await db.runAsync(`
      UPDATE subtasks
      SET text=?
      WHERE deleted_at IS NULL AND id=?
      `, [text, id]);
  });
}
