import { formatDateLocal, formatTime } from "@/features/tasks/domain/taskDates";
import { parseLocalDate } from "@/features/tasks/domain/recurrence";
import { getRepeatEndState } from "@/features/tasks/domain/repeatEnd";
import { applyReminderToTask } from "@/features/tasks/services/reminderModel";

function invalid(message) {
  const error = new Error(message);
  error.code = "INVALID_TASK_DRAFT";
  throw error;
}

function dateValue(value, optional = false) {
  if (value == null && optional) return null;
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) invalid("Fecha inválida");
  return formatDateLocal(value);
}

export function occurrenceDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? dateValue(value) : value;
  if (!parseLocalDate(date)) invalid("Fecha de ocurrencia inválida");
  return date;
}

// Array order is authoritative. Blank rows are omitted; existing row identities
// are retained so completion and occurrence history survive edits and reordering.
export function normalizeSubtaskDraft(subtasks = []) {
  if (!Array.isArray(subtasks)) invalid("Subtareas inválidas");
  const seen = new Set();
  const result = [];
  for (const subtask of subtasks) {
    if (!subtask || typeof subtask.text !== "string") invalid("Texto de subtarea inválido");
    const text = subtask.text.trim();
    if (!text) continue;
    const id = subtask.id == null ? null : String(subtask.id);
    if (id != null && seen.has(id)) invalid("Subtarea duplicada");
    if (id != null) seen.add(id);
    result.push({ id, text, isNew: !!subtask.isNew || id == null, sort_order: result.length });
  }
  return result;
}

function validateReminder(reminder, time) {
  if (reminder == null) return;
  if (!["relative", "all_day", "persistent", "after"].includes(reminder.type)) invalid("Recordatorio inválido");
  if (reminder.type === "relative") {
    if (!time || !["minutes", "hours"].includes(reminder.unit)) invalid("El recordatorio necesita una hora y unidad válidas");
  }
  if (["relative", "all_day"].includes(reminder.type) &&
      (!Number.isFinite(reminder.value) || reminder.value < 0)) invalid("Anticipación inválida");
  if (reminder.type === "after" &&
      (!Number.isFinite(reminder.at) || reminder.at <= 0)) invalid("Momento del recordatorio inválido");
}

// Only editable fields leave the draft. Never accept done, IDs or notification
// metadata from a stale editor snapshot.
export function prepareTaskDraft({ text, categoryId, subtasks = [], schedule } = {}) {
  if (typeof text !== "string" || !text.trim()) invalid("La tarea necesita un título");
  if (!schedule) invalid("Falta la programación de la tarea");
  const mode = schedule.repeatMode || "none";
  if (!["none", "daily", "weekly", "monthly"].includes(mode)) invalid("Repetición inválida");
  const interval = schedule.repeatInterval ?? 1;
  if (!Number.isSafeInteger(interval) || interval < 1) invalid("Intervalo inválido");
  const selectedDays = schedule.repeatDays ?? [];
  if (!Array.isArray(selectedDays)) invalid("Días de repetición inválidos");
  const days = [...new Set(selectedDays.map(String))];
  if (mode === "weekly" && days.some(day => !["L", "M", "X", "J", "V", "S", "D"].includes(day))) invalid("Día semanal inválido");
  if (mode === "monthly" && days.some(day => !/^([1-9]|[12][0-9]|3[01])$/.test(day))) invalid("Día mensual inválido");
  if (categoryId != null && typeof categoryId !== "string") invalid("Categoría inválida");
  validateReminder(schedule.reminder, schedule.selectedTime);
  if (schedule.selectedTime != null) dateValue(schedule.selectedTime);
  const date = dateValue(schedule.selectedDate);
  const endDate = dateValue(schedule.endDate, true);
  const { error: repeatEndError } = getRepeatEndState({
    date: schedule.selectedDate, repeatMode: mode, repeatDays: days,
    repeatInterval: interval, endDate: schedule.endDate,
  });
  if (repeatEndError) invalid(repeatEndError);
  return {
    fields: applyReminderToTask({
      title: text.trim(), categoryId: categoryId ?? null,
      date, time: formatTime(schedule.selectedTime),
      repeat_mode: mode, repeat_days: days.join(","), repeat_interval: interval,
      repeat_end: endDate,
    }, schedule.reminder),
    subtasks: normalizeSubtaskDraft(subtasks),
  };
}
