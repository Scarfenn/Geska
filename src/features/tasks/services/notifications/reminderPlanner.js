import { isReminderCompatible } from "@/features/tasks/domain/reminderCompatibility";
import { getNextOccurrence, parseLocalDate } from "@/features/tasks/domain/recurrence";
import { formatDateLocal } from "@/features/tasks/domain/taskDates";
import {
  MINUTE_MS, HOUR_MS, startOfDay, reminderFromTask,
  getAllDayReminderDate, getPersistentDatesForDay,
} from "@/features/tasks/services/reminderModel";
import { MAX_QUEUED_REMINDERS } from "@/features/tasks/services/notifications/constants";

function parseTime(value) {
  if (typeof value !== "string" || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export function reminderKey(taskId, reminderType, entry) {
  return JSON.stringify([
    1, String(taskId), entry.occurrenceDate, reminderType,
    entry.date.getTime(), entry.persistentHour ?? null,
  ]);
}

// Pure planning: local calendar arithmetic for occurrences, elapsed time for
// relative offsets. Jump between occurrences until the queue or schedule ends.
export function planTaskReminders(task, { now = new Date(), limit = MAX_QUEUED_REMINDERS } = {}) {
  const anchor = parseLocalDate(task?.date);
  const reminder = reminderFromTask(task);
  if (!isReminderCompatible(reminder, { repeatMode: task?.repeat_mode, time: task?.time })) return [];
  const count = Math.min(MAX_QUEUED_REMINDERS, Math.max(0, Math.floor(limit)));
  if (!task?.id || !task.title?.trim() || !anchor || !reminder ||
      !Number.isFinite(now.getTime()) || !count) return [];
  const repeating = (task.repeat_mode || "none") !== "none";
  if (!repeating && task.done) return [];
  const completed = new Set((task.occurrences || []).filter(o => o.done).map(o => o.date));

  if (reminder.type === "after") {
    const date = new Date(Number(reminder.at));
    if (!Number.isFinite(date.getTime()) || date <= now ||
        (repeating && completed.has(task.date))) return [];
    return [{ date, occurrenceDate: task.date }];
  }
  if (!["relative", "all_day", "persistent"].includes(reminder.type)) return [];
  const value = Number(reminder.value ?? 0);
  if (!Number.isFinite(value) || value < 0) return [];
  const time = parseTime(task.time);
  if (reminder.type === "relative" && !time) return [];

  // Invert the advance notice to begin near the first still-future reminder.
  // All-day offsets use calendar days; relative offsets use elapsed time.
  let start = new Date(now);
  if (reminder.type === "relative") {
    start = new Date(now.getTime() + value * (reminder.unit === "hours" ? HOUR_MS : MINUTE_MS));
  } else if (reminder.type === "all_day") {
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() + Math.ceil(value));
  }
  start = startOfDay(start);
  const result = [];
  let occurrence = getNextOccurrence(task, start);
  while (occurrence && result.length < count) {
    const occurrenceDate = formatDateLocal(occurrence);
    const following = new Date(occurrence);
    following.setHours(12, 0, 0, 0);
    following.setDate(following.getDate() + 1);
    following.setHours(0, 0, 0, 0);
    if (completed.has(occurrenceDate)) {
      occurrence = getNextOccurrence(task, following);
      continue;
    }

    if (reminder.type === "persistent") {
      for (const date of getPersistentDatesForDay(occurrence, now)) {
        if (result.length === count) break;
        result.push({ date, occurrenceDate, persistentHour: date.getHours() });
      }
    } else {
      let date;
      if (reminder.type === "all_day") {
        date = getAllDayReminderDate(occurrence, value);
      } else {
        date = new Date(occurrence);
        date.setHours(time.hour, time.minute, 0, 0);
        date = new Date(date.getTime() - value * (reminder.unit === "hours" ? HOUR_MS : MINUTE_MS));
      }
      if (date > now) result.push({ date, occurrenceDate });
    }
    occurrence = getNextOccurrence(task, following);
  }
  return result;
}
