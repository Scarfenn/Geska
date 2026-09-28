import { withDatabase } from "@/storage/sqlite/initialize";
import { validateBackupDocument, BACKUP_TABLES, BACKUP_ROW_RULES } from "@/features/backup/domain/backupValidation";
import { withRestoreMaintenance } from "@/storage/sqlite/restoreMaintenance";

// Local-only operation. Validation and draining happen before BEGIN.
// Public repository functions must not be invoked inside this transaction.
export async function replaceDatabaseFromBackup(input) {
  const document = validateBackupDocument(input);
  return withRestoreMaintenance(restoreToken => withDatabase(async db => {
    for (const table of ["subtask_occurrences", "task_occurrences", "subtasks", "tasks", "categories"]) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    const counts = {};
    for (const table of BACKUP_TABLES) {
      const columns = Object.keys(BACKUP_ROW_RULES[table]);
      const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`;
      for (const row of document.tables[table]) await db.runAsync(sql, columns.map(column => row[column]));
      const result = await db.getFirstAsync(`SELECT COUNT(*) AS count FROM ${table}`);
      if (result.count !== document.tables[table].length) throw new Error(`Restore count mismatch: ${table}`);
      counts[table] = result.count;
    }
    if ((await db.getAllAsync("PRAGMA foreign_key_check")).length) throw new Error("Restore foreign key check failed");
    // Commit the retry obligation with the replacement, including across crashes.
    await db.runAsync("INSERT OR IGNORE INTO restore_notification_cleanup (id) VALUES (1)");
    return counts;
  }, { transaction: true, restoreToken }));
}

export function hasPendingRestoreNotificationCleanup() {
  return withDatabase(async db => !!await db.getFirstAsync("SELECT id FROM restore_notification_cleanup WHERE id=1"));
}

export function completeRestoreNotificationCleanup() {
  return withDatabase(db => db.runAsync("DELETE FROM restore_notification_cleanup WHERE id=1"));
}
