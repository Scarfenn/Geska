import { isReminderCompatible } from "@/features/tasks/domain/reminderCompatibility";
const cloneDate = (value) => value ? new Date(value) : null;

export function createScheduleDraft(props) {
  return {
    date: cloneDate(props.selectedDate),
    time: cloneDate(props.selectedTime),
    repeatMode: props.repeatMode || "none",
    repeatDays: [...(props.repeatDays || [])],
    repeatInterval: props.repeatInterval || 1,
    reminder: props.reminder ? { ...props.reminder } : null,
    endDate: cloneDate(props.endDate),
  };
}

export function scheduleDraftReducer(state, { field, value }) {
  const next = typeof value === "function" ? value(state[field]) : value;
  if (field === "date") return { ...state, date: cloneDate(next), reminder: null };
  if (field === "time") return {
    ...state, time: cloneDate(next),
    reminder: Boolean(state.time) === Boolean(next) ? state.reminder : null,
  };
  const updated = { ...state, [field]: next };
  if (!isReminderCompatible(updated.reminder, updated)) {
    return { ...updated, reminder: null,
      reminderNotice: "Se quitó el recordatorio porque no es compatible con esta programación." };
  }
  if (field === "reminder") updated.reminderNotice = null;
  return updated;
}
