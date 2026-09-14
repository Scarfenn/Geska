import { startOfDay } from "@/features/tasks/domain/calendarDates";

export const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
export const WEEKDAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function calendarDate(year, month, day = 1) {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month, day);
  return startOfDay(date);
}

const valid = date => date instanceof Date && Number.isFinite(date.getTime());
const dayKey = date => date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

export function isDateSelectable(date, minDate, maxDate) {
  if (!valid(date)) return false;
  const day = dayKey(date);
  return (!valid(minDate) || day >= dayKey(minDate))
    && (!valid(maxDate) || day <= dayKey(maxDate));
}

export function monthHasSelectableDate(year, month, minDate, maxDate) {
  if (year < 1 || year > 9999) return false;
  const first = calendarDate(year, month);
  const last = calendarDate(year, month + 1, 0);
  return (!valid(minDate) || dayKey(last) >= dayKey(minDate))
    && (!valid(maxDate) || dayKey(first) <= dayKey(maxDate))
    && (!valid(minDate) || !valid(maxDate) || dayKey(minDate) <= dayKey(maxDate));
}

export function yearHasSelectableDate(year, minDate, maxDate) {
  return Array.from({ length: 12 }, (_, month) => monthHasSelectableDate(year, month, minDate, maxDate)).some(Boolean);
}

export function initialCalendarMonth(value, initialDate, minDate, maxDate, today = new Date()) {
  let date = valid(value) ? value : valid(initialDate) ? initialDate : today;
  if (valid(minDate) && dayKey(date) < dayKey(minDate)) date = minDate;
  if (valid(maxDate) && dayKey(date) > dayKey(maxDate)) date = maxDate;
  return calendarDate(date.getFullYear(), date.getMonth());
}

export function monthCells(year, month) {
  const first = calendarDate(year, month);
  const offset = (first.getDay() + 6) % 7;
  const count = calendarDate(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= count ? calendarDate(year, month, day) : null;
  });
}
