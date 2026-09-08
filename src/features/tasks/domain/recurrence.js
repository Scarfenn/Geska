const DAY_MS = 86400000;
const WEEK_DAYS = ["D", "L", "M", "X", "J", "V", "S"];

// Calendar dates are local dates, not UTC timestamps.
export function parseLocalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function calendarDay(date) {
  // Use calendar components so 23/25-hour days do not change intervals.
  const utc = new Date(0);
  utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  utc.setUTCHours(0, 0, 0, 0);
  return utc.getTime() / DAY_MS;
}

/**
 * Intervals start at task.date. Weeks start on Monday; monthly intervals
 * count calendar months. Missing month days are skipped, never clamped.
 * repeat_end is reserved for a future feature and is not applied yet.
 */
export function occursOnDate(task, value) {
  const anchor = parseLocalDate(task?.date);
  const target = typeof value === "string"
    ? parseLocalDate(value)
    : value instanceof Date ? value : null;
  if (!anchor || !target || !Number.isFinite(target.getTime())) return false;

  const distance = calendarDay(target) - calendarDay(anchor);
  if (distance < 0) return false;

  const mode = task.repeat_mode || "none";
  if (mode === "none") return distance === 0;

  const configuredInterval = Number(task.repeat_interval);
  const interval = Number.isSafeInteger(configuredInterval) && configuredInterval > 0
    ? configuredInterval : 1;
  const days = (Array.isArray(task.repeat_days)
    ? task.repeat_days
    : typeof task.repeat_days === "string" ? task.repeat_days.split(",") : [])
    .map((day) => String(day).trim()).filter(Boolean);

  if (mode === "daily") return distance % interval === 0;

  if (mode === "weekly") {
    const anchorMonday = calendarDay(anchor) - (anchor.getDay() + 6) % 7;
    const targetMonday = calendarDay(target) - (target.getDay() + 6) % 7;
    const weeks = (targetMonday - anchorMonday) / 7;
    const selectedDays = days.length ? days : [WEEK_DAYS[anchor.getDay()]];
    return weeks % interval === 0 && selectedDays.includes(WEEK_DAYS[target.getDay()]);
  }

  if (mode === "monthly") {
    const months = (target.getFullYear() - anchor.getFullYear()) * 12
      + target.getMonth() - anchor.getMonth();
    const selectedDays = days.length ? days.map(Number) : [anchor.getDate()];
    return months % interval === 0 && selectedDays.includes(target.getDate());
  }

  return false;
}
