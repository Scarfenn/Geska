import { planTaskReminders } from "@/features/tasks/services/notifications/reminderPlanner";
import {
  buildContent, cancelNotifications, getScheduledTaskReminders,
  initNotifications, normalizeIds, scheduleBatch, NotificationOperationError,
} from "@/features/tasks/services/notifications/notificationClient";

let pending = Promise.resolve();
// Serialize reconciliation and cancellation in this JS runtime. Internal helpers
// never enqueue themselves; public functions must not be called inside the queue.
function enqueue(operation) {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}

function belongsToTask(notification, task) {
  const owner = notification.content?.data?.taskId;
  return owner != null ? String(owner) === String(task.id) :
    normalizeIds(task.notification_ids || task.notification_id).includes(notification.identifier);
}

function matches(notification, content) {
  const existing = notification.content;
  return existing?.data?.reminderKey === content.data.reminderKey &&
    existing.data.scheduledAt === content.data.scheduledAt &&
    existing.data.type === content.data.type &&
    String(existing.data.taskId) === String(content.data.taskId) &&
    existing.sound === content.sound &&
    existing.title === content.title && existing.body === content.body &&
    existing.categoryIdentifier === content.categoryIdentifier &&
    existing.data.occurrenceDate === content.data.occurrenceDate &&
    existing.data.reminderType === content.data.reminderType &&
    existing.data.persistentHour === content.data.persistentHour;
}

function withIds(task, ids) {
  return { ...task, notification_ids: ids, notification_id: ids[0] ?? null };
}

function sameIds(task, ids) {
  const current = normalizeIds(task.notification_ids || task.notification_id);
  return current.length === ids.length && current.every(id => ids.includes(id)) &&
    (task.notification_id ?? null) === (ids[0] ?? null);
}

function matchPlan(task, plan, existing) {
  const retained = new Set();
  const ids = new Array(plan.length);
  const missing = [];
  plan.forEach((entry, index) => {
    const content = buildContent(task, entry);
    const found = existing.find(n => !retained.has(n.identifier) && matches(n, content));
    if (found) {
      ids[index] = found.identifier;
      retained.add(found.identifier);
    } else {
      missing.push({ entry, index });
    }
  });
  return { retained, ids, missing };
}

async function reconcile(task, persistTask, getNow, permission, inventory) {
  if (!task?.id) return { status: "empty", ids: [] };
  const existing = (inventory || await getScheduledTaskReminders()).filter(n => belongsToTask(n, task));
  let matched = matchPlan(task, planTaskReminders(task, { now: getNow() }), existing);
  if (matched.missing.length) {
    if (!(await permission())) {
      return { status: "permission-denied", ids: normalizeIds(task.notification_ids || task.notification_id) };
    }
    // Permission dialogs can stay open past the original reminder time.
    matched = matchPlan(task, planTaskReminders(task, { now: getNow() }), existing);
  }
  const { retained, ids, missing } = matched;
  const created = await scheduleBatch(task, missing.map(item => item.entry), getNow);
  missing.forEach((item, index) => { ids[item.index] = created[index]; });
  const obsolete = existing.filter(n => !retained.has(n.identifier)).map(n => n.identifier);
  try {
    await cancelNotifications(obsolete);
  } catch (error) {
    error.createdIds = created.filter(Boolean);
    // Created notifications remain discoverable by reminderKey on the next run.
    throw error;
  }
  const scheduledIds = ids.filter(Boolean);
  if (persistTask && !sameIds(task, scheduledIds)) await persistTask(withIds(task, scheduledIds));
  return { status: scheduledIds.length ? "scheduled" : "empty", ids: scheduledIds };
}

function permissionCheck() {
  let result;
  return () => (result ??= initNotifications());
}

// Detailed API: callers can distinguish permission denial from an empty plan.
// Technical failures reject, including failed scheduling/cancellation/persistence.
export function reconcileTaskReminders(task, persistTask, { now } = {}) {
  return enqueue(() => reconcile(task, persistTask, () => now || new Date(), permissionCheck()));
}

// Compatibility API retains the original ID-array return shape. Denial preserves
// recorded IDs; consumers needing the reason use reconcileTaskReminders instead.
export async function scheduleTaskReminders(task) {
  if (!task) return [];
  return (await reconcileTaskReminders(task)).ids;
}

export async function rescheduleTaskReminders(task, persistTask) {
  if (!task) return null;
  const result = await reconcileTaskReminders(task, persistTask);
  return result.status === "permission-denied" ? task : withIds(task, result.ids);
}

export function syncTaskReminders(tasks, persistTask, { now } = {}) {
  if (!Array.isArray(tasks)) return Promise.resolve();
  return enqueue(async () => {
    const getNow = () => now || new Date();
    const permission = permissionCheck();
    const inventory = await getScheduledTaskReminders();
    const results = [], failures = [];
    for (const task of tasks) {
      try { results.push({ taskId: task.id, ...await reconcile(task, persistTask, getNow, permission, inventory) }); }
      catch (cause) { failures.push({ taskId: task.id, cause }); }
    }
    // Only a full snapshot may remove notifications for deleted tasks.
    const taskIds = new Set(tasks.map(task => String(task.id)));
    try {
      const orphaned = inventory.filter(n =>
        !taskIds.has(String(n.content?.data?.taskId)) &&
        !tasks.some(task => belongsToTask(n, task)));
      await cancelNotifications(orphaned.map(n => n.identifier));
    } catch (cause) { failures.push({ cause }); }
    if (failures.length) {
      const error = new NotificationOperationError("No se pudieron sincronizar todos los recordatorios", { failures });
      error.results = results;
      throw error;
    }
    return results;
  });
}

export function cancelTaskReminders(ids, { taskId } = {}) {
  return enqueue(async () => {
    const discovered = taskId == null ? [] : (await getScheduledTaskReminders())
      .filter(n => String(n.content?.data?.taskId) === String(taskId))
      .map(n => n.identifier);
    await cancelNotifications([...normalizeIds(ids), ...discovered]);
  });
}

export function cancelAllTaskReminders() {
  return enqueue(async () => cancelNotifications((await getScheduledTaskReminders()).map(n => n.identifier)));
}

export async function scheduleTaskReminder(task) {
  return (await scheduleTaskReminders(task))[0] ?? null;
}

export async function cancelTaskReminder(id) {
  await cancelTaskReminders(id);
}
