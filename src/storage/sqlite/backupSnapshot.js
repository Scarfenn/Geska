import { withDatabase } from "@/storage/sqlite/initialize";
import { SQLITE_SCHEMA_VERSION } from "@/storage/sqlite/migrations";

// Raw SQLite values, including tombstones and device-local notification fields.
// Keep this list explicit: never interpolate identifiers supplied by callers.
const tables = ["categories", "tasks", "subtasks", "task_occurrences", "subtask_occurrences"];

export function getBackupSnapshot() {
  return withDatabase(async db => {
    const createdAt = new Date().toISOString();
    const data = {};
    for (const table of tables) {
      data[table] = await db.getAllAsync(`SELECT * FROM ${table} ORDER BY id`);
    }
    return { schemaVersion: SQLITE_SCHEMA_VERSION, createdAt, tables: data };
  }, { transaction: true });
}
