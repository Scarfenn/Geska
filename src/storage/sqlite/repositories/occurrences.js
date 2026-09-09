import { withDatabase } from "../initialize";
export async function getOccurrence(taskId, date) {
  return withDatabase(async db => {
    return await db.getFirstAsync("SELECT * FROM task_occurrences WHERE task_id=? AND date=?", [taskId, date]);
  });
}
export async function setOccurrenceDone(taskId, date, done) {
  return withDatabase(async db => {
    await db.runAsync(`
      INSERT OR IGNORE INTO task_occurrences (id, task_id, date, done)
      VALUES (?, ?, ?, ?)
      `, [`${taskId}_${date}`, taskId, date, done ? 1 : 0]);
    await db.runAsync(`
      UPDATE task_occurrences
      SET done=?
      WHERE task_id=? AND date=?
      `, [done ? 1 : 0, taskId, date]);
  }, {
    transaction: true
  });
}
export async function clearOccurrence(taskId, date) {
  return withDatabase(async db => {
    await db.runAsync("DELETE FROM task_occurrences WHERE task_id=? AND date=?", [taskId, date]);
  });
}
export async function getSubtaskOccurrence(subtaskId, date) {
  return withDatabase(async db => {
    return await db.getFirstAsync(`
      SELECT *
      FROM subtask_occurrences
      WHERE subtask_id=? AND date=?
      `, [subtaskId, date]);
  });
}
export async function setSubtaskOccurrenceDone(subtaskId, date, done) {
  return withDatabase(async db => {
    await db.runAsync(`
      INSERT OR IGNORE INTO subtask_occurrences (
        id,
        subtask_id,
        date,
        done
      )
      VALUES (?, ?, ?, ?)
      `, [`${subtaskId}_${date}`, subtaskId, date, done ? 1 : 0]);
    await db.runAsync(`
      UPDATE subtask_occurrences
      SET done=?
      WHERE subtask_id=? AND date=?
      `, [done ? 1 : 0, subtaskId, date]);
  }, {
    transaction: true
  });
}
