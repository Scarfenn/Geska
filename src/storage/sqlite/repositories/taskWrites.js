import { withDatabase } from "@/storage/sqlite/initialize";
import { insertTaskRow, updateTaskRow, deleteTaskRows, readTask } from "@/storage/sqlite/repositories/taskRows";

let sequence = 0;
export function newTaskId() {
  return `${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2, 10)}`;
}

function failure(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

async function requireTask(db, id) {
  const task = await readTask(db, id);
  if (!task) failure("TASK_NOT_FOUND", "La tarea ya no existe");
  return task;
}

async function replaceSubtasks(db, task, drafts) {
  const originals = new Map(task.subtasks.map(subtask => [String(subtask.id), subtask]));
  const retained = new Set();
  for (const draft of drafts) {
    if (draft.isNew) continue;
    if (!originals.has(draft.id) || retained.has(draft.id)) {
      failure("SUBTASK_CONFLICT", "Una subtarea cambió o ya no pertenece a esta tarea");
    }
    retained.add(draft.id);
  }
  for (const original of task.subtasks) {
    if (retained.has(String(original.id))) continue;
    await db.runAsync("DELETE FROM subtask_occurrences WHERE subtask_id=?", [original.id]);
    await db.runAsync("DELETE FROM subtasks WHERE id=? AND task_id=?", [original.id, task.id]);
  }
  for (const draft of drafts) {
    if (draft.isNew) {
      await db.runAsync("INSERT INTO subtasks (id, task_id, text, done, sort_order) VALUES (?, ?, ?, 0, ?)",
        [newTaskId(), task.id, draft.text, draft.sort_order]);
    } else {
      await db.runAsync("UPDATE subtasks SET text=?, sort_order=? WHERE id=? AND task_id=?",
        [draft.text, draft.sort_order, draft.id, task.id]);
    }
  }
}

export function createTaskWithSubtasks(task, drafts) {
  return withDatabase(async db => {
    await insertTaskRow(db, task);
    await replaceSubtasks(db, { ...task, subtasks: [] }, drafts);
    return readTask(db, task.id);
  }, { transaction: true });
}

export function editTaskWithSubtasks(id, fields, drafts) {
  return withDatabase(async db => {
    const current = await requireTask(db, id);
    await updateTaskRow(db, { ...current, ...fields, id: current.id });
    await replaceSubtasks(db, current, drafts);
    return readTask(db, id);
  }, { transaction: true });
}

export function replaceTaskSubtasks(id, drafts) {
  return withDatabase(async db => {
    await replaceSubtasks(db, await requireTask(db, id), drafts);
    return readTask(db, id);
  }, { transaction: true });
}

// Read-modify-write shares one transaction. undefined means toggle; explicit
// booleans are idempotent. Only the requested completion field is changed.
export function changeTaskCompletion(id, { done, date = null, subtaskId = null } = {}) {
  if (done !== undefined && typeof done !== "boolean") throw new TypeError("done debe ser booleano");
  return withDatabase(async db => {
    const task = await requireTask(db, id);
    const repeating = task.repeat_mode !== "none";
    if (repeating && !date) failure("OCCURRENCE_REQUIRED", "Falta la fecha de la ocurrencia");
    const target = subtaskId == null ? task : task.subtasks.find(s => String(s.id) === String(subtaskId));
    if (!target) failure("SUBTASK_CONFLICT", "La subtarea ya no existe");
    const currentDone = repeating ? !!target.occurrences.find(o => o.date === date)?.done : !!target.done;
    const nextDone = done ?? !currentDone;
    const changed = currentDone !== nextDone;
    if (changed) {
      if (repeating) {
        // Identifiers are selected here, never interpolated from user input.
        const table = subtaskId == null ? "task_occurrences" : "subtask_occurrences";
        const column = subtaskId == null ? "task_id" : "subtask_id";
        await db.runAsync(`INSERT OR IGNORE INTO ${table} (id, ${column}, date, done) VALUES (?, ?, ?, ?)`,
          [`${target.id}_${date}`, target.id, date, nextDone ? 1 : 0]);
        await db.runAsync(`UPDATE ${table} SET done=? WHERE ${column}=? AND date=?`,
          [nextDone ? 1 : 0, target.id, date]);
      } else {
        const table = subtaskId == null ? "tasks" : "subtasks";
        await db.runAsync(`UPDATE ${table} SET done=? WHERE id=?`, [nextDone ? 1 : 0, target.id]);
      }
    }
    return { task: await readTask(db, id), changed };
  }, { transaction: true });
}

export function removeTaskWithSnapshot(id) {
  return withDatabase(async db => {
    const task = await readTask(db, id);
    if (task) await deleteTaskRows(db, id);
    return task;
  }, { transaction: true });
}
