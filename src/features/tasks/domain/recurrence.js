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

function repeatSettings(task) {
  const configuredInterval = Number(task.repeat_interval);
  const interval = Number.isSafeInteger(configuredInterval) && configuredInterval > 0
    ? configuredInterval : 1;
  const days = (Array.isArray(task.repeat_days)
    ? task.repeat_days
    : typeof task.repeat_days === "string" ? task.repeat_days.split(",") : [])
    .map((day) => String(day).trim()).filter(Boolean);

  return { interval, days };
}

/**
 * Intervals start at task.date. Weeks start on Monday; monthly intervals
 * count calendar months. Missing month days are skipped, never clamped.
 * A valid repeat_end is an inclusive local calendar bound for repetitions.
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

  const end = parseLocalDate(task.repeat_end);
  if (end && calendarDay(target) > calendarDay(end)) return false;

  const { interval, days } = repeatSettings(task);

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


// Editing the end searches the frequency independently of the saved bound.
export function getFirstOccurrence(task, { afterStart = false } = {}) {
  const from = parseLocalDate(task?.date);
  if (!from) return null;
  if (afterStart) {
    from.setHours(12);
    from.setDate(from.getDate() + 1);
    from.setHours(0, 0, 0, 0);
  }
  return getNextOccurrence({ ...task, repeat_end: null }, from);
}

// Inclusive calendar search. Jump to eligible periods instead of scanning days.
// Monthly impossibility is bounded by the 4,800-month Gregorian cycle.
export function getNextOccurrence(task, from) {
  const anchor = parseLocalDate(task?.date);
  const lower = typeof from === "string" ? parseLocalDate(from)
    : from instanceof Date ? from : null;
  if (!anchor || !lower || !Number.isFinite(lower.getTime()) || lower.getFullYear() > 9999) return null;
  const minimum = Math.max(calendarDay(anchor), calendarDay(lower));
  const end = parseLocalDate(task.repeat_end);
  if ((task.repeat_mode || "none") !== "none" && end && minimum > calendarDay(end)) return null;
  const accepts = date => calendarDay(date) >= minimum && occursOnDate(task, date);
  if (accepts(anchor)) return anchor;
  const { interval, days } = repeatSettings(task);
  const mode = task.repeat_mode || "none";
  if (mode === "daily") {
    const candidate = new Date(anchor);
    candidate.setHours(12, 0, 0, 0);
    candidate.setDate(anchor.getDate() + Math.ceil((minimum - calendarDay(anchor)) / interval) * interval);
    candidate.setHours(0, 0, 0, 0);
    return Number.isFinite(candidate.getTime()) && candidate.getFullYear() <= 9999 && accepts(candidate) ? candidate : null;
  }
  if (mode === "weekly") {
    const offsets = [...new Set((days.length ? days : [WEEK_DAYS[anchor.getDay()]])
      .map(day => WEEK_DAYS.indexOf(day)).filter(day => day >= 0)
      .map(day => (day + 6) % 7))].sort((a, b) => a - b);
    const anchorOffset = (anchor.getDay() + 6) % 7;
    const lowerMonday = minimum - ((lower < anchor ? anchor : lower).getDay() + 6) % 7;
    const anchorMonday = calendarDay(anchor) - anchorOffset;
    const firstPeriod = Math.floor((lowerMonday - anchorMonday) / (7 * interval));
    for (const period of [firstPeriod, firstPeriod + 1]) {
      const week = period * interval;
      for (const offset of offsets) {
        const candidate = new Date(anchor);
        candidate.setHours(12, 0, 0, 0);
        candidate.setDate(anchor.getDate() - anchorOffset + week * 7 + offset);
        candidate.setHours(0, 0, 0, 0);
        if (!Number.isFinite(candidate.getTime()) || candidate.getFullYear() > 9999) return null;
        if (accepts(candidate)) return candidate;
      }
    }
  }
  if (mode === "monthly") {
    const selected = [...new Set((days.length ? days.map(Number) : [anchor.getDate()])
      .filter(day => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b);
    if (!selected.length) return null;
    let a = 4800, b = interval % 4800;
    while (b) [a, b] = [b, a % b];
    const cycle = 4800 / a;
    const anchorMonth = anchor.getFullYear() * 12 + anchor.getMonth();
    // Include the repeated phase: its selected day may precede the anchor only
    // in the initial (partial) month, but be valid in the next full cycle.
    const lowerMonth = lower.getFullYear() * 12 + lower.getMonth();
    const firstPeriod = Math.max(0, Math.floor((lowerMonth - anchorMonth) / interval));
    for (let period = firstPeriod; period <= firstPeriod + cycle; period++) {
      const index = anchorMonth + period * interval;
      if (!Number.isSafeInteger(index) || index > 9999 * 12 + 11) return null;
      if (end && index > end.getFullYear() * 12 + end.getMonth()) return null;
      const year = Math.floor(index / 12), month = index % 12;
      for (const day of selected) {
        const candidate = new Date(anchor);
        candidate.setHours(12, 0, 0, 0);
        candidate.setFullYear(year, month, day);
        candidate.setHours(0, 0, 0, 0);
        if (candidate.getMonth() !== month || candidate.getDate() !== day) continue;
        if (accepts(candidate)) return candidate;
      }
    }
  }
  return null;
}
