// Structural compatibility; expiration is checked against the clock separately.
export function isReminderCompatible(reminder, { repeatMode, time }) {
  if (!reminder) return true;
  if (reminder.type === "after") return (!repeatMode || repeatMode === "none") && !time;
  if (reminder.type === "relative") return !!time;
  if (reminder.type === "all_day" || reminder.type === "persistent") return !time;
  return false;
}
