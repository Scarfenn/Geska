export function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  const first = new Date(a), second = new Date(b);
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

export function addCalendarDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function getWeekStart(value) {
  const date = startOfDay(value);
  return startOfDay(addCalendarDays(date, -((date.getDay() + 6) % 7)));
}

export function isSameWeek(a, b) {
  return isSameDay(getWeekStart(a), getWeekStart(b));
}

export function generateWeek(value) {
  const start = getWeekStart(value);
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
}
