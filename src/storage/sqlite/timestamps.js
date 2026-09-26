// SQLite-compatible UTC Unix milliseconds, independent of the device timezone.
export const nowSql = "CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)";
export const deletionTimeSql = `MAX(updated_at + 1, ${nowSql})`;
