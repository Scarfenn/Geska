import {
  newTaskId, createTaskWithSubtasks, editTaskWithSubtasks, replaceTaskSubtasks,
  changeTaskCompletion, removeTaskWithSnapshot, updateTaskNotificationIds,
  addCategory, updateCategory, deleteCategory,
} from "@/storage/database";
import { prepareTaskDraft, normalizeSubtaskDraft, occurrenceDate } from "@/features/tasks/domain/taskDraft";
import { reconcileTaskReminders, cancelTaskReminders } from "@/features/tasks/services/notifications";

const pending = new Map();
// Keep each task's commit and subsequent reminder reconciliation in order.
// These callbacks use repositories, never recursively invoke another command.
function forTask(id, operation) {
  if (id == null) throw new TypeError("Falta el identificador de la tarea");
  const key = String(id);
  const result = (pending.get(key) || Promise.resolve()).catch(() => {}).then(operation);
  pending.set(key, result);
  const release = () => { if (pending.get(key) === result) pending.delete(key); };
  result.then(release, release);
  return result;
}

async function saved(task, changed = true) {
  let reminders;
  try {
    reminders = await reconcileTaskReminders(task, updateTaskNotificationIds);
    if (reminders.status !== "permission-denied") {
      task = { ...task, notification_ids: reminders.ids, notification_id: reminders.ids[0] ?? null };
    }
  } catch (error) {
    reminders = { status: "failed", error };
  }
  return { status: "saved", task, changed, reminders };
}

export function createTask(draft) {
  const { fields, subtasks } = prepareTaskDraft(draft);
  const id = newTaskId();
  return forTask(id, async () => saved(await createTaskWithSubtasks({
    ...fields, id, description: null, done: false, notification_ids: [], notification_id: null,
  }, subtasks)));
}

export function editTask(id, draft) {
  const { fields, subtasks } = prepareTaskDraft(draft);
  return forTask(id, async () => saved(await editTaskWithSubtasks(id, fields, subtasks)));
}

export function saveTaskSubtasks(id, draftSubtasks) {
  const subtasks = normalizeSubtaskDraft(draftSubtasks);
  return forTask(id, async () => ({
    status: "saved", task: await replaceTaskSubtasks(id, subtasks), changed: true,
    reminders: { status: "unchanged" },
  }));
}

function complete(id, done, date, subtaskId) {
  const normalizedDate = occurrenceDate(date);
  return forTask(id, async () => {
    const result = await changeTaskCompletion(id, { done, date: normalizedDate, subtaskId });
    // Also reconcile an idempotent request: a previous reminder failure can heal.
    return subtaskId == null ? saved(result.task, result.changed) : {
      status: "saved", ...result, reminders: { status: "unchanged" },
    };
  });
}

export function setTaskDone(id, done, date = null) {
  if (typeof done !== "boolean") throw new TypeError("done debe ser booleano");
  return complete(id, done, date);
}

export function toggleTaskDone(id, date = null) {
  return complete(id, undefined, date);
}

export function toggleSubtaskDone(taskId, subtaskId, date = null) {
  if (subtaskId == null) throw new TypeError("Falta el identificador de la subtarea");
  return complete(taskId, undefined, date, subtaskId);
}

export function removeTask(id) {
  return forTask(id, async () => {
    const task = await removeTaskWithSnapshot(id);
    let reminders;
    try {
      await cancelTaskReminders(task?.notification_ids || task?.notification_id, { taskId: id });
      reminders = { status: "empty", ids: [] };
    } catch (error) { reminders = { status: "failed", error }; }
    return { status: "deleted", task, changed: !!task, reminders };
  });
}

export async function saveCategory(category) {
  const name = category.name?.trim();
  if (!name) throw new Error("La categoría necesita un nombre");
  if (!category.id) return addCategory(name);
  await updateCategory({ id: category.id, name });
  return { id: category.id, name };
}

export async function removeCategory(id) {
  await deleteCategory(id);
}
