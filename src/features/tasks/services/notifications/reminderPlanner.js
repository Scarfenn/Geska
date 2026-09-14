import { occursOnDate, parseLocalDate } from "@/features/tasks/domain/recurrence";
import { formatDateLocal } from "@/features/tasks/domain/taskDates";
import {
  MINUTE_MS, HOUR_MS, startOfDay, reminderFromTask,
  getAllDayReminderDate, getPersistentDatesForDay,
} from "@/features/tasks/services/reminderModel";
import { MAX_OCCURRENCE_SEARCH_DAYS, MAX_QUEUED_REMINDERS } from "@/features/tasks/services/notifications/constants";

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
// relative offsets. Search is bounded once per plan, not once per occurrence.
export function planTaskReminders(task, { now = new Date(), limit = MAX_QUEUED_REMINDERS } = {}) {
  const anchor = parseLocalDate(task?.date);
  const reminder = reminderFromTask(task);
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

  const start = startOfDay(now);
  if (anchor > start) start.setTime(anchor.getTime());
  const result = [];
  for (let offset = 0; offset < MAX_OCCURRENCE_SEARCH_DAYS && result.length < count; offset++) {
    const occurrence = new Date(start);
    occurrence.setDate(start.getDate() + offset);
    if (!repeating && occurrence > anchor) break;
    const occurrenceDate = formatDateLocal(occurrence);
    if (!occursOnDate(task, occurrence) || completed.has(occurrenceDate)) continue;

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
  }
  return result;
}
