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
export function parseTimeString(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
