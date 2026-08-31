import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("tasks.db");

/* ------------------------------------------------------
   UTILIDAD PARA EJECUTAR SQL
------------------------------------------------------ */
function parseNotificationIds(
  value,
  legacyId = null
) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // notification_ids legacy/no válido:
      // seguimos con notification_id.
    }
  }

  return legacyId
    ? [legacyId]
    : [];
}

function serializeNotificationIds(ids) {
  const normalized =
    Array.isArray(ids)
      ? ids.filter(Boolean)
      : ids
      ? [ids]
      : [];

  return JSON.stringify(normalized);
}

function getLegacyReminderMinutes(task) {
  if (
    task.reminder_type === "relative" &&
    task.reminder_unit === "minutes"
  ) {
    return task.reminder_value ?? null;
  }

  return task.reminder_minutes ?? null;
}

async function ensureTaskColumns() {
  const columns =
    await db.getAllAsync(
      "PRAGMA table_info(tasks)"
    );

  const existing =
    new Set(
      columns.map(
        (column) => column.name
      )
    );

  const required = [
    ["reminder_type", "TEXT"],
    ["reminder_value", "INT"],
    ["reminder_unit", "TEXT"],
    ["reminder_at", "INT"],
    ["notification_ids", "TEXT"],
    ["repeat_interval", "INT"],
  ];

  for (const [name, type] of required) {
    if (existing.has(name)) {
      continue;
    }

    await db.execAsync(
      `ALTER TABLE tasks ADD COLUMN ${name} ${type}`
    );
  }
}

async function ensureSubtaskColumns() {
  const columns =
    await db.getAllAsync(
      "PRAGMA table_info(subtasks)"
    );

  const existing =
    new Set(
      columns.map(
        (column) => column.name
      )
    );

  if (!existing.has("sort_order")) {
    await db.execAsync(
      `
      ALTER TABLE subtasks
      ADD COLUMN sort_order INT NOT NULL DEFAULT 0
      `
    );

    const subtasks =
      await db.getAllAsync(
        `
        SELECT id, task_id
        FROM subtasks
        ORDER BY task_id, rowid
        `
      );

    const orderByTask =
      new Map();

    for (const subtask of subtasks) {
      const currentOrder =
        orderByTask.get(
          subtask.task_id
        ) ?? 0;

      await db.runAsync(
        `
        UPDATE subtasks
        SET sort_order=?
        WHERE id=?
        `,
        [
          currentOrder,
          subtask.id,
        ]
      );

      orderByTask.set(
        subtask.task_id,
        currentOrder + 1
      );
    }
  }
}

/* HELPERS */
function groupBy(items, key) {
  const map = new Map();

  for (const item of items) {
    const value = item[key];

    if (!map.has(value)) {
      map.set(value, []);
    }

    map.get(value).push(item);
  }

  return map;
}

function mapOccurrence(occurrence) {
  return {
    ...occurrence,
    done: !!occurrence.done,
  };
}

function mapTask(task) {
  const hasLegacyRelativeReminder =
    task.time &&
    task.reminder_minutes != null;

  return {
    id: task.id,
    title: task.title,

    description:
      task.description ?? null,

    done:
      !!task.done,

    categoryId:
      task.category_id ?? null,

    date:
      task.date ?? null,

    time:
      task.time ?? null,

    repeat_mode:
      task.repeat_mode || "none",

    repeat_days:
      task.repeat_days ?? null,

    repeat_end:
      task.repeat_end ?? null,

    repeat_interval:
      task.repeat_interval ?? 1,

    reminder_type:
      task.reminder_type ||
      (
        hasLegacyRelativeReminder
          ? "relative"
          : null
      ),

    reminder_value:
      task.reminder_value ??
      (
        hasLegacyRelativeReminder
          ? task.reminder_minutes
          : null
      ),

    reminder_unit:
      task.reminder_unit ||
      (
        hasLegacyRelativeReminder
          ? "minutes"
          : null
      ),

    reminder_at:
      task.reminder_at ?? null,

    reminder_minutes:
      task.reminder_minutes ?? null,

    notification_ids:
      parseNotificationIds(
        task.notification_ids,
        task.notification_id
      ),

    notification_id:
      task.notification_id ?? null,
  };
}

/* ------------------------------------------------------
   INICIALIZAR BASE DE DATOS
------------------------------------------------------ */
export async function initDB() {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE
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

    await ensureTaskColumns();
    await ensureSubtaskColumns();

    console.log("Base de datos lista");
  } catch (e) {
    console.error("initDB error:", e);
  }
}

/* ------------------------------------------------------
   CATEGORÍAS
------------------------------------------------------ */

export async function getAllCategories() {
  try {
    return await db.getAllAsync("SELECT id, name FROM categories");
  } catch (e) {
    console.error("getAllCategories error:", e);
    return [];
  }
}

export async function addCategory(name) {
  try {
    const id = Date.now().toString();
    await db.runAsync(
      "INSERT INTO categories (id, name) VALUES (?, ?)",
      [id, name]
    );
    return { id, name };
  } catch (e) {
    console.error("addCategory error:", e);
    throw e;
  }
}

export async function updateCategory(cat) {
  try {
    await db.runAsync(
      "UPDATE categories SET name=? WHERE id=?",
      [cat.name, cat.id]
    );
  } catch (e) {
    console.error("updateCategory error:", e);
    throw e;
  }
}

export async function deleteCategory(id) {
  try {
    await db.runAsync(
      "UPDATE tasks SET category_id=NULL WHERE category_id=?",
      [id]
    );
    await db.runAsync("DELETE FROM categories WHERE id=?", [id]);
  } catch (e) {
    console.error("deleteCategory error:", e);
  }
}

/* ------------------------------------------------------
   TAREAS
------------------------------------------------------ */

export async function getAllTasks() {
  try {
    const [
      tasks,
      subtasks,
      occurrences,
      subtaskOccurrences,
    ] = await Promise.all([
      db.getAllAsync(
        "SELECT * FROM tasks"
      ),

      db.getAllAsync(`
        SELECT *
        FROM subtasks
        ORDER BY
          task_id,
          sort_order ASC,
          rowid ASC
      `),

      db.getAllAsync(
        "SELECT * FROM task_occurrences"
      ),

      db.getAllAsync(
        "SELECT * FROM subtask_occurrences"
      ),
    ]);

    const subtasksByTask =
      groupBy(
        subtasks,
        "task_id"
      );

    const occurrencesByTask =
      groupBy(
        occurrences,
        "task_id"
      );

    const occurrencesBySubtask =
      groupBy(
        subtaskOccurrences,
        "subtask_id"
      );

    return tasks.map((task) => ({
      ...mapTask(task),

      subtasks:
        (
          subtasksByTask.get(
            task.id
          ) || []
        ).map((subtask) => ({
          ...subtask,

          done:
            !!subtask.done,

          occurrences:
            (
              occurrencesBySubtask.get(
                subtask.id
              ) || []
            ).map(
              mapOccurrence
            ),
        })),

      occurrences:
        (
          occurrencesByTask.get(
            task.id
          ) || []
        ).map(
          mapOccurrence
        ),
    }));
  } catch (e) {
    console.error(
      "getAllTasks error:",
      e
    );

    throw e;
  }
}

export async function saveTask(task) {
  try {
    const notificationIds =
      Array.isArray(task.notification_ids)
        ? task.notification_ids
        : [];

    const legacyNotificationId =
      task.notification_id ||
      notificationIds[0] ||
      null;

    await db.runAsync(
      `INSERT INTO tasks (
        id, title, description, done, date, time,
        repeat_mode, repeat_days, repeat_end, repeat_interval,

        reminder_minutes,
        reminder_type, reminder_value,
        reminder_unit, reminder_at,

        notification_id, notification_ids,
        category_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )`,
      [
        task.id,
        task.title,
        task.description || null,
        task.done ? 1 : 0,
        task.date || null,
        task.time || null,

        task.repeat_mode || null,
        task.repeat_days || null,
        task.repeat_end || null,
        task.repeat_interval || 1,

        getLegacyReminderMinutes(task),
        task.reminder_type || null,
        task.reminder_value ?? null,
        task.reminder_unit || null,
        task.reminder_at ?? null,

        legacyNotificationId,
        serializeNotificationIds(
          notificationIds
        ),

        task.categoryId || null,
      ]
    );
  } catch (e) {
    console.error("saveTask error:", e);
    throw e;
  }
}

export async function updateTask(task) {
  try {
    const notificationIds =
      Array.isArray(task.notification_ids)
        ? task.notification_ids
        : [];

    const legacyNotificationId =
      task.notification_id ||
      notificationIds[0] ||
      null;

    await db.runAsync(
      `UPDATE tasks SET
        title=?,
        description=?,
        done=?,
        date=?,
        time=?,

        repeat_mode=?,
        repeat_days=?,
        repeat_end=?,
        repeat_interval=?,

        reminder_minutes=?,
        reminder_type=?,
        reminder_value=?,
        reminder_unit=?,
        reminder_at=?,

        notification_id=?,
        notification_ids=?,

        category_id=?
      WHERE id=?`,
      [
        task.title,
        task.description || null,
        task.done ? 1 : 0,
        task.date || null,
        task.time || null,

        task.repeat_mode || null,
        task.repeat_days || null,
        task.repeat_end || null,
        task.repeat_interval || 1,

        getLegacyReminderMinutes(task),
        task.reminder_type || null,
        task.reminder_value ?? null,
        task.reminder_unit || null,
        task.reminder_at ?? null,

        legacyNotificationId,
        serializeNotificationIds(
          notificationIds
        ),

        task.categoryId || null,
        task.id,
      ]
    );
  } catch (e) {
    console.error("updateTask error:", e);
    throw e;
  }
}

export async function deleteTask(id) {
  try {
    await db.runAsync(
      "DELETE FROM task_occurrences WHERE task_id=?",
      [id]
    );

    await db.runAsync(
      `
      DELETE FROM subtask_occurrences
      WHERE subtask_id IN (
        SELECT id
        FROM subtasks
        WHERE task_id=?
      )
      `,
      [id]
    );

    await db.runAsync(
      "DELETE FROM subtasks WHERE task_id=?",
      [id]
    );

    await db.runAsync(
      "DELETE FROM tasks WHERE id=?",
      [id]
    );
  } catch (e) {
    console.error(
      "deleteTask error:",
      e
    );
  }
}

/* ------------------------------------------------------
   OCURRENCIAS
------------------------------------------------------ */

export async function getOccurrence(taskId, date) {
  try {
    return await db.getFirstAsync(
      "SELECT * FROM task_occurrences WHERE task_id=? AND date=?",
      [taskId, date]
    );
  } catch (e) {
    console.error("getOccurrence error:", e);
    return null;
  }
}

export async function setOccurrenceDone(taskId, date, done) {
  try {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO task_occurrences (id, task_id, date, done)
      VALUES (?, ?, ?, ?)
      `,
      [
        `${taskId}_${date}`,
        taskId,
        date,
        done ? 1 : 0
      ]
    );

    await db.runAsync(
      `
      UPDATE task_occurrences
      SET done=?
      WHERE task_id=? AND date=?
      `,
      [
        done ? 1 : 0,
        taskId,
        date
      ]
    );

  } catch (e) {
    console.error("setOccurrenceDone error:", e);
    throw e;
  }
}


export async function clearOccurrence(taskId, date) {
  try {
    await db.runAsync(
      "DELETE FROM task_occurrences WHERE task_id=? AND date=?",
      [taskId, date]
    );
  } catch (e) {
    console.error("clearOccurrence error:", e);
  }
}

/* ------------------------------------------------------
   SUBTASKS
------------------------------------------------------ */

export async function addSubtask(
  taskId,
  text,
  sortOrder = null
) {
  try {
    const id =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    let finalSortOrder =
      sortOrder;

    if (finalSortOrder == null) {
      const result =
        await db.getFirstAsync(
          `
          SELECT
            COALESCE(MAX(sort_order), -1) + 1
              AS next_order
          FROM subtasks
          WHERE task_id=?
          `,
          [taskId]
        );

      finalSortOrder =
        result?.next_order ?? 0;
    }

    await db.runAsync(
      `
      INSERT INTO subtasks (
        id,
        task_id,
        text,
        done,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        taskId,
        text,
        0,
        finalSortOrder,
      ]
    );

    return id;
  } catch (e) {
    console.error(
      "addSubtask error:",
      e
    );
  }
}

export async function deleteSubtask(id) {
  try {
    await db.runAsync(
      `
      DELETE FROM subtask_occurrences
      WHERE subtask_id=?
      `,
      [id]
    );

    await db.runAsync(
      "DELETE FROM subtasks WHERE id=?",
      [id]
    );
  } catch (e) {
    console.error(
      "deleteSubtask error:",
      e
    );
  }
}

export async function updateSubtaskOrder(
  id,
  sortOrder
) {
  try {
    await db.runAsync(
      `
      UPDATE subtasks
      SET sort_order=?
      WHERE id=?
      `,
      [sortOrder, id]
    );
  } catch (e) {
    console.error(
      "updateSubtaskOrder error:",
      e
    );
    throw e;
  }
}

export async function updateSubtaskDone(id, done) {
  await db.runAsync(
    "UPDATE subtasks SET done=? WHERE id=?",
    [done ? 1 : 0, id]
  );
}

export async function getSubtaskOccurrence(
  subtaskId,
  date
) {
  try {
    return await db.getFirstAsync(
      `
      SELECT *
      FROM subtask_occurrences
      WHERE subtask_id=? AND date=?
      `,
      [subtaskId, date]
    );
  } catch (e) {
    console.error(
      "getSubtaskOccurrence error:",
      e
    );

    return null;
  }
}

export async function setSubtaskOccurrenceDone(
  subtaskId,
  date,
  done
) {
  try {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO subtask_occurrences (
        id,
        subtask_id,
        date,
        done
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        `${subtaskId}_${date}`,
        subtaskId,
        date,
        done ? 1 : 0,
      ]
    );

    await db.runAsync(
      `
      UPDATE subtask_occurrences
      SET done=?
      WHERE subtask_id=? AND date=?
      `,
      [
        done ? 1 : 0,
        subtaskId,
        date,
      ]
    );
  } catch (e) {
    console.error(
      "setSubtaskOccurrenceDone error:",
      e
    );

    throw e;
  }
}

export async function updateSubtaskText(
  id,
  text
) {
  try {
    await db.runAsync(
      `
      UPDATE subtasks
      SET text=?
      WHERE id=?
      `,
      [
        text,
        id,
      ]
    );
  } catch (e) {
    console.error(
      "updateSubtaskText error:",
      e
    );

    throw e;
  }
}

