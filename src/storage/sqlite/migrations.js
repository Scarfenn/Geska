import { nowSql } from "@/storage/sqlite/timestamps";

async function ensureTaskColumns(db) {
  const columns = await db.getAllAsync("PRAGMA table_info(tasks)");
  const existing = new Set(columns.map(column => column.name));
  const required = [["reminder_type", "TEXT"], ["reminder_value", "INT"], ["reminder_unit", "TEXT"], ["reminder_at", "INT"], ["notification_ids", "TEXT"], ["repeat_interval", "INT"]];
  for (const [name, type] of required) {
    if (existing.has(name)) {
      continue;
    }
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN ${name} ${type}`);
  }
}
async function ensureSubtaskColumns(db) {
  const columns = await db.getAllAsync("PRAGMA table_info(subtasks)");
  const existing = new Set(columns.map(column => column.name));
  if (!existing.has("sort_order")) {
    await db.execAsync(`
      ALTER TABLE subtasks
      ADD COLUMN sort_order INT NOT NULL DEFAULT 0
      `);
    const subtasks = await db.getAllAsync(`
        SELECT id, task_id
        FROM subtasks
        ORDER BY task_id, rowid
        `);
    const orderByTask = new Map();
    for (const subtask of subtasks) {
      const currentOrder = orderByTask.get(subtask.task_id) ?? 0;
      await db.runAsync(`
        UPDATE subtasks
        SET sort_order=?
        WHERE id=?
        `, [currentOrder, subtask.id]);
      orderByTask.set(subtask.task_id, currentOrder + 1);
    }
  }
}

// Schema changes and backfills share the initialization transaction, so a
// failed backfill cannot leave a new column that prevents a retry.
export async function migrateDatabase(db) {
  await ensureTaskColumns(db);
  await ensureSubtaskColumns(db);
  await ensureSyncColumns(db);
}

// UTC Unix milliseconds. strftime works on older native SQLite versions too.
const syncTables = ["categories", "tasks", "subtasks", "task_occurrences", "subtask_occurrences"];

async function ensureSyncColumns(db) {
  // Legacy categories have a table-wide UNIQUE(name). Replace it with an
  // active-row index so deleted names can be used again without losing history.
  const categorySchema = await db.getFirstAsync("SELECT sql FROM sqlite_master WHERE type='table' AND name='categories'");
  if (/name TEXT NOT NULL UNIQUE/i.test(categorySchema.sql)) {
    await db.execAsync(`
      CREATE TABLE categories_sync (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL);
      INSERT INTO categories_sync (id, name) SELECT id, name FROM categories;
      DROP TABLE categories;
      ALTER TABLE categories_sync RENAME TO categories;
    `);
  }
  for (const table of syncTables) {
    const columns = new Set((await db.getAllAsync(`PRAGMA table_info(${table})`)).map(column => column.name));
    if (!columns.has("updated_at")) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`);
      await db.execAsync(`UPDATE ${table} SET updated_at = ${nowSql}`);
    }
    if (!columns.has("deleted_at")) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN deleted_at INTEGER DEFAULT NULL`);
    }
    // A row's clock advances even for multiple writes in the same millisecond.
    // Explicit timestamps are preserved for a future import/sync implementation.
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS ${table}_insert_timestamp
      AFTER INSERT ON ${table} WHEN NEW.updated_at = 0
      BEGIN
        UPDATE ${table} SET updated_at = ${nowSql} WHERE id = NEW.id;
      END;
      CREATE TRIGGER IF NOT EXISTS ${table}_update_timestamp
      AFTER UPDATE ON ${table} WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE ${table} SET updated_at = MAX(OLD.updated_at + 1, ${nowSql}) WHERE id = NEW.id;
      END;
      CREATE INDEX IF NOT EXISTS ${table}_updated_at ON ${table}(updated_at);
    `);
  }
  await db.execAsync("CREATE UNIQUE INDEX IF NOT EXISTS categories_active_name ON categories(name) WHERE deleted_at IS NULL");
}
