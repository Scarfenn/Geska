import { getFirstOccurrence, occursOnDate } from "@/features/tasks/domain/recurrence";
import { formatDateLocal, getMinimumTaskDate } from "@/features/tasks/domain/taskDates";

// The same draft shape is used by both scheduling modals. Persisted drafts are
// adapted at their boundary so all three callers share this validation.
export function getRepeatEndState({ date, repeatMode, repeatDays, repeatInterval, endDate }, today = new Date()) {
  if (!repeatMode || repeatMode === "none") return { firstOccurrence: null, minimum: null, error: null };
  if (!Number.isSafeInteger(repeatInterval) || repeatInterval < 1) {
    return { firstOccurrence: null, minimum: null, error: "Introduce un intervalo válido." };
  }
  // The initial task date does not count as a repetition: at least one
  // occurrence strictly after it must fit before the chosen end.
  const firstOccurrence = getFirstOccurrence({
    date: formatDateLocal(date), repeat_mode: repeatMode,
    repeat_days: repeatDays, repeat_interval: repeatInterval,
  }, { afterStart: true });
  if (!firstOccurrence) {
    return { firstOccurrence: null, minimum: null, error: "Esta configuración no tiene ninguna ocurrencia posible." };
  }
  const minimum = new Date(Math.max(firstOccurrence.getTime(), getMinimumTaskDate(today).getTime()));
  // Historical schedules may still be edited. Today's limit applies to new
  // selections; a stored end must remain at or after the first occurrence.
  const validEnd = endDate == null || (endDate instanceof Date && Number.isFinite(endDate.getTime())
    && getMinimumTaskDate(endDate) >= firstOccurrence);
  return { firstOccurrence, minimum, error: validEnd ? null
    : `La fecha de término debe ser el ${firstOccurrence.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })} o posterior (primera repetición).` };
}

export function canSelectRepeatEndDate(value, draft, today = new Date()) {
  const { minimum } = getRepeatEndState(draft, today);
  return minimum != null && value instanceof Date && Number.isFinite(value.getTime())
    && getMinimumTaskDate(value) >= minimum;
}

export function isRepeatPreviewDate(value, { date, repeatMode, repeatDays, repeatInterval }) {
  if (!repeatMode || repeatMode === "none" || (repeatMode === "daily" && repeatInterval === 1)) return false;
  if (!Number.isSafeInteger(repeatInterval) || repeatInterval < 1) return false;
  if (repeatInterval === 1) {
    const selected = new Set((Array.isArray(repeatDays) ? repeatDays : String(repeatDays ?? "").split(","))
      .map(day => String(day).trim()));
    if (repeatMode === "weekly" && ["L", "M", "X", "J", "V", "S", "D"].every(day => selected.has(day))) return false;
    if (repeatMode === "monthly" && Array.from({ length: 31 }, (_, index) => String(index + 1)).every(day => selected.has(day))) return false;
  }
  if (!(value instanceof Date) || !(date instanceof Date)
    || !(getMinimumTaskDate(value) > getMinimumTaskDate(date))) return false;
  return occursOnDate({ date: formatDateLocal(date), repeat_mode: repeatMode,
    repeat_days: repeatDays, repeat_interval: repeatInterval }, value);
}
