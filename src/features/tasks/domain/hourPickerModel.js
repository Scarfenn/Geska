export const ITEM_HEIGHT = 44;
export const WHEEL_HEIGHT = ITEM_HEIGHT * 5;
export const CENTER_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
export const LOOP_COUNT = 16;
export const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
export const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function createLoopData(values) {
  return Array.from({ length: values.length * LOOP_COUNT }, (_, i) => values[i % values.length]);
}

export function getMiddleIndex(values, value) {
  return Math.floor(LOOP_COUNT / 2) * values.length + Math.max(0, values.indexOf(value));
}

export function getIndexFromOffset(offset, length) {
  return Math.min(Math.max(Math.round(offset / ITEM_HEIGHT), 0), length - 1);
}

export function getSettledIndex(index, length) {
  return index < length * 3 || index > length * (LOOP_COUNT - 3)
    ? Math.floor(LOOP_COUNT / 2) * length + index % length
    : index;
}

export function readHourDraft(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    return { hour: "12", minute: "00", period: "PM" };
  }
  return {
    hour: String(date.getHours() % 12 || 12),
    minute: String(date.getMinutes()).padStart(2, "0"),
    period: date.getHours() >= 12 ? "PM" : "AM",
  };
}

export function buildSelectedTime({ hour, minute, period }, baseDate = new Date()) {
  if (!HOURS.includes(hour) || !MINUTES.includes(minute) || !["AM", "PM"].includes(period)) {
    throw new Error("Hora inválida");
  }
  const date = new Date(baseDate);
  if (!Number.isFinite(date.getTime())) throw new Error("Fecha inválida");
  date.setHours(Number(hour) % 12 + (period === "PM" ? 12 : 0), Number(minute), 0, 0);
  return date;
}
