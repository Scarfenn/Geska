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
}
