import { taskWriteValues, mapTask, mapOccurrence } from "../taskMappers";

export async function insertTaskRow(db, task) {
  await db.runAsync(`INSERT INTO tasks (
        id, title, description, done, date, time,
        repeat_mode, repeat_days, repeat_end, repeat_interval,

        reminder_minutes,
        reminder_type, reminder_value,
        reminder_unit, reminder_at,

        notification_id, notification_ids,
        category_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )`, [task.id, ...taskWriteValues(task)]);
}

export async function updateTaskRow(db, task) {
  await db.runAsync(`UPDATE tasks SET
        title=?,
        description=?,
        done=?,
        date=?,
        time=?,

        repeat_mode=?,
        repeat_days=?,
        repeat_end=?,
        repeat_interval=?,

        reminder_minutes=?,
        reminder_type=?,
        reminder_value=?,
        reminder_unit=?,
        reminder_at=?,

        notification_id=?,
        notification_ids=?,

        category_id=?
      WHERE id=?`, [...taskWriteValues(task), task.id]);
}

export async function deleteTaskRows(db, id) {
  await db.runAsync("DELETE FROM task_occurrences WHERE task_id=?", [id]);
  await db.runAsync(`
      DELETE FROM subtask_occurrences
      WHERE subtask_id IN (
        SELECT id
        FROM subtasks
        WHERE task_id=?
      )
      `, [id]);
  await db.runAsync("DELETE FROM subtasks WHERE task_id=?", [id]);
  await db.runAsync("DELETE FROM tasks WHERE id=?", [id]);
}

// Transaction-internal reads. Public callers use the aggregate repository.
export async function readTask(db, id) {
  const row = await db.getFirstAsync("SELECT * FROM tasks WHERE id=?", [id]);
  if (!row) return null;
  const subtasks = await db.getAllAsync("SELECT * FROM subtasks WHERE task_id=? ORDER BY sort_order, rowid", [id]);
  const occurrences = await db.getAllAsync("SELECT * FROM task_occurrences WHERE task_id=?", [id]);
  const subtaskOccurrences = await db.getAllAsync(
    "SELECT * FROM subtask_occurrences WHERE subtask_id IN (SELECT id FROM subtasks WHERE task_id=?)", [id],
  );
  const bySubtask = new Map();
  for (const occurrence of subtaskOccurrences) {
    const list = bySubtask.get(occurrence.subtask_id) || [];
    list.push(mapOccurrence(occurrence));
    bySubtask.set(occurrence.subtask_id, list);
  }
  return {
    ...mapTask(row), occurrences: occurrences.map(mapOccurrence),
    subtasks: subtasks.map(subtask => ({
      ...subtask, done: !!subtask.done, occurrences: bySubtask.get(subtask.id) || [],
    })),
  };
}
