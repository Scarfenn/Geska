export function getMinimumTaskDate(today = new Date()) {
  const date = new Date(today);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getEarliestSelectableTaskDate(today = new Date()) {
  const date = new Date(today);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isHistoricalTaskDate(value, today = new Date()) {
  return value instanceof Date && Number.isFinite(value.getTime())
    && formatDateLocal(value) < formatDateLocal(today);
}

export function canSelectTaskDate(value, today = new Date()) {
  return value instanceof Date && Number.isFinite(value.getTime())
    && formatDateLocal(value) >= formatDateLocal(getEarliestSelectableTaskDate(today));
}

export function formatDateLocal(date) {
  if (!date) return null;
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}
export const formatTime = timeObj => {
  if (!timeObj) return null;
  const h = timeObj.getHours().toString().padStart(2, "0");
  const m = timeObj.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};
// A time picker needs a Date container, but its day is not the task's day.
// Keep it independent of today's DST transition; combine with the actual
// occurrence only when planning the reminder.
export function createTimeValue(hour, minute) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Hora inválida");
  }
  return new Date(2000, 0, 15, hour, minute, 0, 0);
}

export function parseTimeString(timeStr) {
  if (typeof timeStr !== "string" || !/^\d{1,2}:\d{2}$/.test(timeStr)) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  return createTimeValue(h, m);
}
