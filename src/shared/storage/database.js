import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("tasks.db");

/* ------------------------------------------------------
   UTILIDAD PARA EJECUTAR SQL
------------------------------------------------------ */
async function safeExec(sql) {
  try {
    await db.execAsync(sql);
  } catch (err) {
    console.error("DB exec error:", err);
  }
}

/* ------------------------------------------------------
   INICIALIZAR BASE DE DATOS
------------------------------------------------------ */
export async function initDB() {
  try {
    await safeExec(`
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
        reminder_minutes INT,

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
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );
    `);

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
    const tasks = await db.getAllAsync("SELECT * FROM tasks");
    const subtasks = await db.getAllAsync("SELECT * FROM subtasks");
    const occurrences = await db.getAllAsync("SELECT * FROM task_occurrences");


    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description || null,
      done: !!task.done,
      categoryId: task.category_id || null,

      date: task.date || null,
      time: task.time || null,

      repeat_mode: task.repeat_mode || "none",
      repeat_days: task.repeat_days || null,
      repeat_end: task.repeat_end || null,
      reminder_minutes: task.reminder_minutes ?? null,

      subtasks: subtasks
        .filter((s) => s.task_id === task.id)
        .map((s) => ({ ...s, done: !!s.done })),

      occurrences: occurrences
        .filter(o => o.task_id === task.id)
        .map(o => ({ ...o, done: !!o.done })),
    }));
  } catch (e) {
    console.error("getAllTasks error:", e);
    return [];
  }
}

export async function saveTask(task) {
  try {
    await db.runAsync(
      `INSERT INTO tasks (
        id, title, description, done, date, time,
        repeat_mode, repeat_days, repeat_end,
        reminder_minutes, category_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        task.reminder_minutes ?? null,
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
    await db.runAsync(
      `UPDATE tasks SET
        title=?, description=?, done=?, date=?, time=?,
        repeat_mode=?, repeat_days=?, repeat_end=?,
        reminder_minutes=?, category_id=?
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
        task.reminder_minutes ?? null,
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
    await db.runAsync("DELETE FROM task_occurrences WHERE task_id=?", [id]);
    await db.runAsync("DELETE FROM subtasks WHERE task_id=?", [id]);
    await db.runAsync("DELETE FROM tasks WHERE id=?", [id]);
  } catch (e) {
    console.error("deleteTask error:", e);
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

export async function addSubtask(taskId, text) {
  try {
    const id = Date.now().toString();
    await db.runAsync(
      "INSERT INTO subtasks (id, task_id, text, done) VALUES (?, ?, ?, ?)",
      [id, taskId, text, 0]
    );
  } catch (e) {
    console.error("addSubtask error:", e);
  }
}

export async function deleteSubtask(id) {
  try {
    await db.runAsync("DELETE FROM subtasks WHERE id=?", [id]);
  } catch (e) {
    console.error("deleteSubtask error:", e);
  }
}

export async function updateSubtaskDone(id, done) {
  await db.runAsync(
    "UPDATE subtasks SET done=? WHERE id=?",
    [done ? 1 : 0, id]
  );
}

