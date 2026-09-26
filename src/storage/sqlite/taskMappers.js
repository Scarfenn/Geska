export function parseNotificationIds(value, legacyId = null) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // Invalid legacy JSON falls back to the single notification ID.
    }
  }
  return legacyId ? [legacyId] : [];
}
export function serializeNotificationIds(ids) {
  const normalized = Array.isArray(ids) ? ids.filter(Boolean) : ids ? [ids] : [];
  return JSON.stringify(normalized);
}
export function getLegacyReminderMinutes(task) {
  if (task.reminder_type === "relative" && task.reminder_unit === "minutes") {
    return task.reminder_value ?? null;
  }
  return task.reminder_minutes ?? null;
}
export function groupBy(items, key) {
  const map = new Map();
  for (const item of items) {
    const value = item[key];
    if (!map.has(value)) {
      map.set(value, []);
    }
    map.get(value).push(item);
  }
  return map;
}
export function mapOccurrence(occurrence) {
  return {
    ...occurrence,
    done: !!occurrence.done
  };
}
export function mapTask(task) {
  const hasLegacyRelativeReminder = task.time && task.reminder_minutes != null;
  return {
    id: task.id,
    updated_at: task.updated_at,
    deleted_at: task.deleted_at,
    title: task.title,
    description: task.description ?? null,
    done: !!task.done,
    categoryId: task.category_id ?? null,
    date: task.date ?? null,
    time: task.time ?? null,
    repeat_mode: task.repeat_mode || "none",
    repeat_days: task.repeat_days ?? null,
    repeat_end: task.repeat_end ?? null,
    repeat_interval: task.repeat_interval ?? 1,
    reminder_type: task.reminder_type || (hasLegacyRelativeReminder ? "relative" : null),
    reminder_value: task.reminder_value ?? (hasLegacyRelativeReminder ? task.reminder_minutes : null),
    reminder_unit: task.reminder_unit || (hasLegacyRelativeReminder ? "minutes" : null),
    reminder_at: task.reminder_at ?? null,
    reminder_minutes: task.reminder_minutes ?? null,
    notification_ids: parseNotificationIds(task.notification_ids, task.notification_id),
    notification_id: task.notification_id ?? null
  };
}

// Shared column order for INSERT and UPDATE; id is bound by the repository.
export function taskWriteValues(task) {
  const notificationIds = Array.isArray(task.notification_ids) ? task.notification_ids : [];
  const legacyNotificationId = task.notification_id || notificationIds[0] || null;
  return [
    task.title,
    task.description || null,
    task.done ? 1 : 0,
    task.date || null,
    task.time || null,
    task.repeat_mode || null,
    task.repeat_days || null,
    task.repeat_end || null,
    task.repeat_interval || 1,
    getLegacyReminderMinutes(task),
    task.reminder_type || null,
    task.reminder_value ?? null,
    task.reminder_unit || null,
    task.reminder_at ?? null,
    legacyNotificationId,
    serializeNotificationIds(notificationIds),
    task.categoryId || null,
  ];
}
