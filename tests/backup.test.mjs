import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHarness, loadDatabase } from './helpers/databaseHarness.mjs';
const format = loadDatabase(null, { entry: '../../src/features/backup/domain/backupFormat.js' });
const plain = value => JSON.parse(JSON.stringify(value));
const tableNames = ['categories', 'tasks', 'subtasks', 'task_occurrences', 'subtask_occurrences'];

test('snapshot contains exact raw rows, including all tombstones, and serializes without loss', async t => {
  const h = databaseHarness(t);
  const category = await h.api.addCategory('Work');
  await h.api.saveTask({ id: 'deleted', title: 'ñ 📝', categoryId: category.id, repeat_days: '[1,2]' });
  const subtask = await h.api.addSubtask('deleted', 'First');
  await h.api.setOccurrenceDone('deleted', '2026-09-26', true);
  await h.api.setSubtaskOccurrenceDone(subtask, '2026-09-26', true);
  await h.api.deleteTask('deleted');
  await h.api.deleteCategory(category.id);
  await h.api.saveTask({ id: 'active', title: 'Active' });
  const offset = h.calls.length;
  const snapshot = await h.api.getBackupSnapshot();
  assert.equal(h.calls[offset].sql, 'BEGIN');
  assert.equal(h.calls.at(-1).sql, 'COMMIT');
  assert.equal(h.calls.slice(offset).filter(c => c.method === 'getAllAsync').length, 5);
  for (const table of tableNames) {
    assert.deepEqual(snapshot.tables[table], await h.db.getAllAsync(`SELECT * FROM ${table} ORDER BY id`));
    assert.ok(snapshot.tables[table].some(row => row.deleted_at > 0));
  }
  const document = JSON.parse(format.serializeBackup(snapshot));
  assert.equal(document.formatVersion, 1);
  assert.equal(document.schemaVersion, 1);
  assert.deepEqual(document.tables, plain(snapshot.tables));
  assert.equal(document.tables.tasks.find(row => row.id === 'deleted').done, 0);
  const detached = format.createBackupDocument(snapshot);
  detached.tables.tasks[0].title = 'Changed';
  assert.notEqual(snapshot.tables.tasks[0].title, 'Changed');
});

test('snapshot initializes and migrates legacy data, preserving timestamps on subsequent backups', async t => {
  const h = databaseHarness(t);
  await h.db.execAsync(`
    CREATE TABLE categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE);
    INSERT INTO categories VALUES ('c', 'Old');
    CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT, description TEXT, done INT, date TEXT, time TEXT,
      repeat_mode TEXT, repeat_days TEXT, repeat_end TEXT, reminder_minutes INT, notification_id TEXT, category_id TEXT);
    INSERT INTO tasks (id, title, category_id) VALUES ('t', 'Legacy', 'c');
    CREATE TABLE subtasks (id TEXT PRIMARY KEY, task_id TEXT, text TEXT, done INT);
    INSERT INTO subtasks VALUES ('s', 't', 'Legacy child', 1);
    CREATE TABLE task_occurrences (id TEXT PRIMARY KEY, task_id TEXT, date TEXT, done INT);
    INSERT INTO task_occurrences VALUES ('o', 't', '2026-09-26', 1);
    CREATE TABLE subtask_occurrences (id TEXT PRIMARY KEY, subtask_id TEXT, date TEXT, done INT);
    INSERT INTO subtask_occurrences VALUES ('so', 's', '2026-09-26', 1);
  `);
  const snapshot = await h.api.getBackupSnapshot();
  for (const table of tableNames) {
    assert.equal(snapshot.tables[table].length, 1);
    assert.ok(snapshot.tables[table][0].updated_at > 0);
    assert.equal(snapshot.tables[table][0].deleted_at, null);
  }
  assert.equal(snapshot.tables.tasks[0].category_id, 'c');
  assert.equal(snapshot.tables.subtasks[0].sort_order, 0);
  const reopened = loadDatabase(h.db);
  assert.deepEqual(plain((await reopened.getBackupSnapshot()).tables), plain(snapshot.tables));
});

test('writes cannot interleave with a snapshot; a failed read rejects and releases the queue', async t => {
  const h = databaseHarness(t);
  await h.api.saveTask({ id: 'one', title: 'Before' });
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const paused = new Promise(resolve => { release = resolve; });
  h.intercept(async (method, sql) => {
    if (sql === 'SELECT * FROM tasks ORDER BY id') { entered(); await paused; }
  });
  const pendingSnapshot = h.api.getBackupSnapshot();
  await started;
  const update = h.api.updateTask({ id: 'one', title: 'After' });
  release();
  assert.equal((await pendingSnapshot).tables.tasks[0].title, 'Before');
  await update;
  h.intercept((method, sql) => {
    if (sql === 'SELECT * FROM subtasks ORDER BY id') throw new Error('read failed');
  });
  await assert.rejects(h.api.getBackupSnapshot(), /read failed/);
  assert.equal(h.calls.at(-1).sql, 'ROLLBACK');
  h.intercept(() => {});
  assert.equal((await h.api.getBackupSnapshot()).tables.tasks[0].title, 'After');
});

test('empty backups are valid; incomplete or lossy documents are rejected', async t => {
  const h = databaseHarness(t);
  const snapshot = await h.api.getBackupSnapshot();
  assert.equal(Object.keys(JSON.parse(format.serializeBackup(snapshot)).tables).length, 5);
  assert.throws(() => format.serializeBackup({ ...snapshot, schemaVersion: 0 }), /esquema/);
  assert.throws(() => format.serializeBackup({ ...snapshot, createdAt: 'invalid' }), /fecha/);
  assert.throws(() => format.serializeBackup({ ...snapshot, tables: {} }), /tabla/);
  snapshot.tables.tasks.push({ id: 'bad', title: undefined });
  assert.throws(() => format.serializeBackup(snapshot), /serializable/);
});
