import { assertLocalAccess, getLocalRevision } from "@/storage/sqlite/restoreMaintenance";
import { execute } from "@/storage/sqlite/connection";
import { migrateDatabase } from "@/storage/sqlite/migrations";
let initializationPromise = null;
export function initDB() {
  if (!initializationPromise) {
    initializationPromise = execute(async db => {
      await db.execAsync(`
      CREATE TABLE IF NOT EXISTS restore_notification_cleanup (
        id INTEGER PRIMARY KEY CHECK (id = 1)
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        done INT NOT NULL DEFAULT 0,
        date TEXT,
        time TEXT,

        repeat_mode TEXT,
        repeat_days TEXT,
        repeat_end TEXT,
        repeat_interval INT NOT NULL DEFAULT 1,

        reminder_minutes INT,
        reminder_type TEXT,
        reminder_value INT,
        reminder_unit TEXT,
        reminder_at INT,

        notification_id TEXT,
        notification_ids TEXT,

        category_id TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS task_occurrences (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        date TEXT NOT NULL,
        done INT NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        text TEXT NOT NULL,
        done INT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS subtask_occurrences (
        id TEXT PRIMARY KEY NOT NULL,
        subtask_id TEXT NOT NULL,
        date TEXT NOT NULL,
        done INT NOT NULL DEFAULT 0,
        FOREIGN KEY (subtask_id) REFERENCES subtasks(id)
      );
    `);
      await migrateDatabase(db);
    }, {
      transaction: true
    }).catch(error => {
      initializationPromise = null;
      throw error;
    });
  }
  return initializationPromise;
}

// Public reads and writes also work before any screen has initialized the DB.
export async function withDatabase(operation, options) {
  const revision = getLocalRevision();
  assertLocalAccess(revision, options?.restoreToken);
  await initDB();
  return execute(db => {
    assertLocalAccess(revision, options?.restoreToken);
    return operation(db);
  }, options);
}
