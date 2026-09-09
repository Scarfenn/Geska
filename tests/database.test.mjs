import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHarness } from './helpers/databaseHarness.mjs';

const task = (id = 'task') => ({ id, title: 'Demo', repeat_mode: 'none', categoryId: 'cat' });
async function seed(api) {
  const category = await api.addCategory('Work');
  await api.saveTask({ ...task(), categoryId: category.id });
  const subtask = await api.addSubtask('task', 'First');
  await api.setOccurrenceDone('task', '2026-09-09', true);
  await api.setSubtaskOccurrenceDone(subtask, '2026-09-09', true);
  return { category, subtask };
}

test('public reads initialize a fresh database; initialization is shared and retries after rollback', async t => {
  const h = databaseHarness(t);
  const error = new Error('schema failure'); let fail = true;
  h.intercept((method, sql) => { if (fail && sql.includes('CREATE TABLE')) { fail = false; throw error; } });
  const first = h.api.initDB(), second = h.api.initDB();
  assert.equal(first, second);
  await Promise.all([assert.rejects(first, e => e === error), assert.rejects(second, e => e === error)]);
  assert.equal((await h.api.getAllTasks()).length, 0);
  await h.api.initDB();
  assert.equal(h.calls.filter(c => c.sql.includes('CREATE TABLE')).length, 2);
  assert.equal(h.calls.filter(c => c.sql === 'ROLLBACK').length, 1);
});

test('legacy migration rolls back the new column and retries the entire order backfill', async t => {
  const h = databaseHarness(t);
  await h.db.execAsync(`
    CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT, description TEXT, done INT, date TEXT, time TEXT,
      repeat_mode TEXT, repeat_days TEXT, repeat_end TEXT, reminder_minutes INT, notification_id TEXT, category_id TEXT);
    CREATE TABLE subtasks (id TEXT PRIMARY KEY, task_id TEXT, text TEXT, done INT);
    INSERT INTO tasks (id, title, time, reminder_minutes, notification_id) VALUES ('legacy', 'Old', '09:00', 15, 'old-notification');
    INSERT INTO subtasks VALUES ('s1', 'legacy', 'First', 0), ('s2', 'legacy', 'Second', 1), ('s3', 'other', 'Other', 0);
  `);
  let fail = true;
  h.intercept((method, sql, params) => { if (fail && sql.includes('SET sort_order=') && params[1] === 's2') { fail = false; throw new Error('backfill failed'); } });
  await assert.rejects(h.api.initDB(), /backfill failed/);
  assert.equal((await h.db.getAllAsync('PRAGMA table_info(subtasks)')).some(c => c.name === 'sort_order'), false);
  const [loaded] = await h.api.getAllTasks();
  assert.deepEqual(Array.from(loaded.subtasks, s => s.sort_order), [0, 1]);
  assert.equal(loaded.subtasks[1].done, true);
  assert.equal(loaded.reminder_type, 'relative'); assert.equal(loaded.reminder_value, 15);
  assert.equal(loaded.reminder_unit, 'minutes'); assert.equal(loaded.repeat_interval, 1);
  assert.deepEqual(Array.from(loaded.notification_ids), ['old-notification']);
  assert.equal((await h.db.getFirstAsync("SELECT sort_order FROM subtasks WHERE id='s3'")).sort_order, 0);
});

test('insert and update share serialization and aggregate reads keep four queries and subtask order', async t => {
  const h = databaseHarness(t);
  const value = { ...task(), done: true, repeat_mode: 'weekly', repeat_days: '1,3', repeat_interval: 2,
    reminder_type: 'relative', reminder_unit: 'minutes', reminder_value: 0, notification_ids: ['n1', null, 'n2'],
    date: '2026-09-09', time: '10:30', description: 'Notes', repeat_end: '2026-12-31' };
  await h.api.saveTask(value);
  const before = (await h.api.getAllTasks())[0];
  await h.api.updateTask({ ...value, title: 'Edited' });
  const after = (await h.api.getAllTasks())[0];
  assert.deepEqual({ ...after, title: before.title }, { ...before });
  assert.equal(after.reminder_value, 0); assert.equal(after.reminder_minutes, 0);
  assert.deepEqual(Array.from(after.notification_ids), ['n1', 'n2']);
  const a = await h.api.addSubtask(value.id, 'Later', 2), b = await h.api.addSubtask(value.id, 'Earlier', 0);
  await h.api.setOccurrenceDone(value.id, value.date, true);
  await h.api.setSubtaskOccurrenceDone(b, value.date, true);
  const offset = h.calls.length; const [loaded] = await h.api.getAllTasks();
  assert.equal(h.calls.slice(offset).filter(c => c.method === 'getAllAsync').length, 4);
  assert.deepEqual(Array.from(loaded.subtasks, s => s.id), [b, a]);
  assert.equal(loaded.occurrences[0].done, true); assert.equal(loaded.subtasks[0].occurrences[0].done, true);
});

for (const operation of ['deleteTask', 'deleteCategory', 'deleteSubtask']) {
  test(`${operation} rolls back dependent changes when the final delete fails`, async t => {
    const h = databaseHarness(t); const { category, subtask } = await seed(h.api);
    const before = await h.api.getAllTasks();
    const table = { deleteTask: 'tasks', deleteCategory: 'categories', deleteSubtask: 'subtasks' }[operation];
    const id = { deleteTask: 'task', deleteCategory: category.id, deleteSubtask: subtask }[operation];
    h.intercept((method, sql) => { if (sql.trim().startsWith(`DELETE FROM ${table} WHERE id=`)) throw new Error('delete failed'); });
    await assert.rejects(h.api[operation](id), /delete failed/);
    assert.deepEqual(await h.api.getAllTasks(), before);
    assert.equal((await h.api.getAllCategories()).length, 1);
    h.intercept(() => {}); await h.api[operation](id);
    if (operation === 'deleteTask') {
      assert.equal((await h.api.getAllTasks()).length, 0);
      for (const table of ['subtasks', 'task_occurrences', 'subtask_occurrences']) assert.equal((await h.db.getAllAsync(`SELECT * FROM ${table}`)).length, 0);
    } else if (operation === 'deleteCategory') {
      assert.equal((await h.api.getAllCategories()).length, 0);
      assert.equal((await h.api.getAllTasks())[0].categoryId, null);
    } else {
      assert.equal((await h.api.getAllTasks())[0].subtasks.length, 0);
      assert.equal((await h.db.getAllAsync('SELECT * FROM subtask_occurrences')).length, 0);
    }
  });
}

test('occurrence writes are atomic, repeatable, and lookup failures are distinct from absence', async t => {
  const h = databaseHarness(t); const { subtask } = await seed(h.api);
  for (const [set, get, id, table] of [
    ['setOccurrenceDone', 'getOccurrence', 'task', 'task_occurrences'],
    ['setSubtaskOccurrenceDone', 'getSubtaskOccurrence', subtask, 'subtask_occurrences'],
  ]) {
    assert.equal(await h.api[get](id, '2026-09-10'), null);
    h.intercept((method, sql) => { if (sql.includes(`UPDATE ${table}`)) throw new Error('update failed'); });
    await assert.rejects(h.api[set](id, '2026-09-10', true), /update failed/);
    assert.equal(await h.api[get](id, '2026-09-10'), null);
    h.intercept(() => {});
    await h.api[set](id, '2026-09-10', true); await h.api[set](id, '2026-09-10', false);
    assert.equal((await h.api[get](id, '2026-09-10')).done, 0);
    h.intercept((method) => { if (method === 'getFirstAsync') throw new Error('read failed'); });
    await assert.rejects(h.api[get](id, '2026-09-10'), /read failed/);
    h.intercept(() => {});
  }
});

test('concurrent operations cannot join a failing transaction and the queue recovers', async t => {
  const h = databaseHarness(t); await seed(h.api);
  let entered; const started = new Promise(resolve => { entered = resolve; });
  let release; const pause = new Promise(resolve => { release = resolve; });
  h.intercept(async (method, sql) => {
    if (sql.includes('DELETE FROM tasks WHERE id=')) { entered(); await pause; throw new Error('failed deletion'); }
  });
  const removal = assert.rejects(h.api.deleteTask('task'), /failed deletion/);
  await started;
  const creation = h.api.saveTask(task('unrelated'));
  const read = h.api.getAllTasks();
  release(); await removal; await creation;
  assert.deepEqual(Array.from(await read, value => value.id), ['task', 'unrelated']);
});

test('concurrent automatic subtask ordering is unique and formerly swallowed errors reject', async t => {
  const h = databaseHarness(t); await h.api.saveTask(task());
  await Promise.all([h.api.addSubtask('task', 'A'), h.api.addSubtask('task', 'B')]);
  assert.deepEqual(Array.from((await h.api.getAllTasks())[0].subtasks, s => s.sort_order), [0, 1]);
  h.intercept(method => { if (method === 'runAsync') throw new Error('write failed'); });
  for (const [name, args] of [
    ['addSubtask', ['task', 'C']], ['clearOccurrence', ['task', '2026-09-09']],
    ['updateSubtaskText', ['missing', 'Text']], ['updateSubtaskOrder', ['missing', 2]],
    ['updateSubtaskDone', ['missing', true]], ['saveTask', [task('new')]],
    ['updateTask', [task()]], ['addCategory', ['New']], ['updateCategory', [{ id: 'cat', name: 'New' }]],
  ]) await assert.rejects(h.api[name](...args), /write failed/);
});

test('malformed notification JSON falls back to legacy IDs and reopening does not repeat migrations', async t => {
  const h = databaseHarness(t); await h.api.saveTask(task());
  await h.db.runAsync('UPDATE tasks SET notification_ids=?, notification_id=? WHERE id=?', ['broken-json', 'legacy', 'task']);
  assert.deepEqual(Array.from((await h.api.getAllTasks())[0].notification_ids), ['legacy']);
  const { loadDatabase } = await import('./helpers/databaseHarness.mjs');
  const reopened = loadDatabase(h.db); const offset = h.calls.length;
  await reopened.initDB();
  assert.equal(h.calls.slice(offset).some(call => call.sql.includes('ALTER TABLE')), false);
  assert.equal((await reopened.getAllTasks())[0].title, 'Demo');
});

test('a failed aggregate read rejects and does not poison the next transaction', async t => {
  const h = databaseHarness(t); await seed(h.api);
  h.intercept((method, sql) => { if (sql === 'SELECT * FROM task_occurrences') throw new Error('read failed'); });
  await assert.rejects(h.api.getAllTasks(), /read failed/);
  h.intercept(() => {});
  assert.equal((await h.api.getAllTasks()).length, 1);
});
