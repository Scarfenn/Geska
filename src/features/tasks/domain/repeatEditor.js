export const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];
export const WEEK_DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));

export function parseInterval(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 1 ? number : null;
}

export function editorDays(mode, days, date) {
  const anchor = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  const allowed = mode === "weekly" ? WEEK_DAYS : MONTH_DAYS;
  const selected = new Set((Array.isArray(days) ? days : []).map(String));
  const valid = allowed.filter((day) => selected.has(day));
  return valid.length ? valid : [mode === "weekly"
    ? WEEK_DAYS[(anchor.getDay() + 6) % 7]
    : String(anchor.getDate())];
}

export function toggleRepeatDay(days, day) {
  if (!days.includes(day)) return [...days, day];
  return days.length === 1 ? days : days.filter((value) => value !== day);
}

function joinDays(days) {
  return days.length < 2 ? days.join("") : `${days.slice(0, -1).join(", ")} y ${days.at(-1)}`;
}

export function repeatSummary(mode, interval, days) {
  if (mode === "none") return "Esta tarea no se repite.";
  if (!interval) return "Introduce un intervalo para ver la repetición.";
  if (mode === "daily") return interval === 1 ? "Todos los días." : `Cada ${interval} días.`;
  if (mode === "weekly") {
    const names = WEEK_DAYS.filter((day) => days.includes(day)).map((day) => WEEK_DAY_NAMES[WEEK_DAYS.indexOf(day)]);
    return `${interval === 1 ? "Cada semana" : `Cada ${interval} semanas`}, ${names.length === 7 ? "todos los días" : joinDays(names)}.`;
  }
  const sorted = [...days].map(Number).sort((a, b) => a - b);
  return `${interval === 1 ? "Cada mes" : `Cada ${interval} meses`}, ${sorted.length === 31 ? "todos los días" : `${sorted.length === 1 ? "el día" : "los días"} ${joinDays(sorted)}`}.`;
}
