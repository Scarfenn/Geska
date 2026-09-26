import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHarness, loadDatabase } from './helpers/databaseHarness.mjs';
const plain = value => JSON.parse(JSON.stringify(value));
const draft = (overrides = {}) => ({ text: ' Demo ', categoryId: null,
  schedule: { selectedDate: new Date(2026, 8, 9), selectedTime: null, repeatMode: 'none', repeatDays: [], repeatInterval: 1, reminder: null, endDate: null },
  subtasks: [{ text: ' First ' }, { text: 'Second' }], ...overrides });

function setup(t) {
  const h = databaseHarness(t), reminders = [], cancellations = [];
  const native = {
    reconcileTaskReminders: async (task, persist) => {
      assert.equal(h.calls.at(-1).sql, 'COMMIT', 'notifications start only after the aggregate commit');
      reminders.push(task);
      await persist({ id: task.id, notification_ids: ['notice'] });
      return { status: 'scheduled', ids: ['notice'] };
    },
    cancelTaskReminders: async (...args) => { cancellations.push(args); },
  };
  const commands = loadDatabase(h.db, {
    entry: '../../src/features/tasks/services/taskCommands.js',
    stubs: { '@/storage/database': h.api, '@/features/tasks/services/notifications': native },
  });
  return { ...h, commands, reminders, cancellations, native };
}

test('creating a task rolls back its row and all subtasks when an insertion fails', async t => {
  const h = setup(t); await h.api.initDB();
  h.intercept((method, sql, params) => { if (sql.startsWith('INSERT INTO subtasks') && params[2] === 'Second') throw new Error('subtask failed'); });
  await assert.rejects(h.commands.createTask(draft()), /subtask failed/);
  assert.equal((await h.api.getAllTasks()).length, 0);
  assert.equal((await h.db.getAllAsync('SELECT * FROM subtasks WHERE deleted_at IS NULL')).length, 0);
  assert.equal(h.reminders.length, 0);
  h.intercept(() => {});
  const saved = await h.commands.createTask(draft());
  assert.equal(saved.status, 'saved'); assert.equal(saved.task.title, 'Demo');
  assert.deepEqual(Array.from(saved.task.subtasks, s => s.sort_order), [0, 1]);
});

test('editing and subtask-only saves roll back deletions, history and title together', async t => {
  const h = setup(t); const { task } = await h.commands.createTask(draft());
  await h.api.setSubtaskOccurrenceDone(task.subtasks[0].id, '2026-09-09', true);
  const before = await h.api.getAllTasks();
  const changes = [{ id: task.subtasks[1].id, text: 'Changed' }, { isNew: true, text: 'New' }];
  const offset = h.reminders.length;
  h.intercept((method, sql) => { if (sql.startsWith('INSERT INTO subtasks')) throw new Error('late failure'); });
  await assert.rejects(h.commands.editTask(task.id, draft({ text: 'New title', subtasks: changes })), /late failure/);
  assert.deepEqual(plain(await h.api.getAllTasks()), plain(before));
  await assert.rejects(h.commands.saveTaskSubtasks(task.id, changes), /late failure/);
  assert.deepEqual(plain(await h.api.getAllTasks()), plain(before));
  assert.equal(h.reminders.length, offset);
});

test('successful reorder retains identities, done state and occurrence history', async t => {
  const h = setup(t); const { task } = await h.commands.createTask(draft());
  const [a, b] = task.subtasks;
  await h.api.updateSubtaskDone(a.id, true);
  await h.api.setSubtaskOccurrenceDone(a.id, '2026-09-09', true);
  const saved = await h.commands.saveTaskSubtasks(task.id, [
    { id: b.id, text: 'Second changed', sort_order: 99 }, { id: a.id, text: 'First' }, { text: 'Third' },
  ]);
  assert.deepEqual(Array.from(saved.task.subtasks, s => s.sort_order), [0, 1, 2]);
  assert.equal(saved.task.subtasks[1].id, a.id); assert.equal(saved.task.subtasks[1].done, true);
  assert.equal(saved.task.subtasks[1].occurrences[0].done, true);
});

test('editing a stale draft cannot overwrite completion, description or reminder identifiers', async t => {
  const h = setup(t); const { task } = await h.commands.createTask(draft());
  await h.api.updateTask({ ...task, done: true, description: 'Latest', notification_ids: ['current'] });
  h.native.reconcileTaskReminders = async () => ({ status: 'permission-denied', ids: [] });
  const result = await h.commands.editTask(task.id, draft({ text: 'Edited', done: false, notification_ids: [], subtasks: task.subtasks }));
  assert.equal(result.task.done, true); assert.equal(result.task.description, 'Latest');
  assert.deepEqual(Array.from(result.task.notification_ids), ['current']);
  assert.equal(result.task.title, 'Edited'); assert.equal(result.reminders.status, 'permission-denied');
});

test('explicit completion is idempotent and toggle reads the latest stored state', async t => {
  const h = setup(t); const { task } = await h.commands.createTask(draft());
  const first = await h.commands.setTaskDone(task.id, true);
  assert.equal(first.changed, true);
  const offset = h.calls.length;
  const second = await h.commands.setTaskDone(task.id, true);
  assert.equal(second.changed, false); assert.equal(second.task.done, true);
  assert.equal(h.calls.slice(offset).some(c => c.sql === 'UPDATE tasks SET done=? WHERE id=?'), false);
  const toggled = await h.commands.toggleTaskDone(task.id);
  assert.equal(toggled.task.done, false);
  const [one, two] = await Promise.all([h.commands.toggleTaskDone(task.id), h.commands.toggleTaskDone(task.id)]);
  assert.equal(one.task.done, true); assert.equal(two.task.done, false);
});

test('recurring completion requires a date and changes only the requested occurrence', async t => {
  const h = setup(t), value = draft(); value.schedule.repeatMode = 'daily';
  const { task } = await h.commands.createTask(value);
  await assert.rejects(h.commands.setTaskDone(task.id, true), e => e.code === 'OCCURRENCE_REQUIRED');
  const first = await h.commands.setTaskDone(task.id, true, '2026-09-09');
  const second = await h.commands.setTaskDone(task.id, true, '2026-09-09');
  assert.equal(first.changed, true); assert.equal(second.changed, false); assert.equal(second.task.done, false);
  assert.equal(second.task.occurrences.length, 1);
  await h.commands.toggleSubtaskDone(task.id, task.subtasks[0].id, '2026-09-10');
  const [stored] = await h.api.getAllTasks();
  assert.equal(stored.subtasks[0].done, false); assert.equal(stored.subtasks[0].occurrences[0].date, '2026-09-10');
  assert.equal(stored.subtasks[1].occurrences.length, 0);
});

test('post-commit reminder failures return a saved result and a later idempotent command repairs them', async t => {
  const h = setup(t); const reconcile = h.native.reconcileTaskReminders;
  h.native.reconcileTaskReminders = async () => { throw new Error('native failed'); };
  const result = await h.commands.createTask(draft());
  assert.equal(result.status, 'saved'); assert.equal(result.reminders.status, 'failed');
  assert.equal((await h.api.getAllTasks()).length, 1);
  await h.commands.setTaskDone(result.task.id, true);
  h.native.reconcileTaskReminders = reconcile;
  const repaired = await h.commands.setTaskDone(result.task.id, true);
  assert.equal(repaired.changed, false); assert.equal(repaired.reminders.status, 'scheduled');
});

test('removal commits before cancellation, and cancellation failure is reported as deleted', async t => {
  const h = setup(t); const { task } = await h.commands.createTask(draft());
  h.native.cancelTaskReminders = async () => {
    assert.equal((await h.api.getAllTasks()).length, 0);
    throw new Error('cancel failed');
  };
  const result = await h.commands.removeTask(task.id);
  assert.equal(result.status, 'deleted'); assert.equal(result.reminders.status, 'failed');
  assert.equal((await h.db.getAllAsync('SELECT * FROM subtasks WHERE deleted_at IS NULL')).length, 0);
});

test('foreign or deleted subtask IDs cannot modify another task or resurrect removed rows', async t => {
  const h = setup(t);
  const a = (await h.commands.createTask(draft())).task;
  const b = (await h.commands.createTask(draft())).task;
  const before = plain(await h.api.getAllTasks());
  await assert.rejects(h.commands.editTask(a.id, draft({ subtasks: [{ id: b.subtasks[0].id, text: 'Foreign' }] })), e => e.code === 'SUBTASK_CONFLICT');
  assert.deepEqual(plain(await h.api.getAllTasks()), before);
  await h.commands.removeTask(a.id);
  await assert.rejects(h.commands.editTask(a.id, draft()), e => e.code === 'TASK_NOT_FOUND');
});

test('notification adapter uses idempotent completion and emits updates after saved warnings', async t => {
  const h = setup(t); const { task } = await h.commands.createTask(draft());
  h.native.reconcileTaskReminders = async () => { throw new Error('native failed'); };
  const events = [];
  const adapter = loadDatabase(h.db, {
    entry: '../../src/features/tasks/services/taskCompletion.js',
    stubs: { '@/features/tasks/services/taskCommands': h.commands, 'react-native': { DeviceEventEmitter: { emit: name => events.push(name) } } },
  });
  assert.equal(await adapter.completeTask(task.id, task.date), true);
  assert.equal(await adapter.completeTask(task.id, task.date), true);
  assert.equal((await h.api.getAllTasks())[0].done, true); assert.equal(events.length, 2);
  assert.equal(await adapter.completeTask(task.id), false);
  assert.equal(await adapter.completeTask(task.id, '2026-09-10'), false);
  assert.equal(await adapter.completeTask('missing', task.date), false);
});

test('old notification dates cannot complete a moved task or excluded recurrence', async t => {
  const h = setup(t), value = draft(); value.subtasks = []; value.schedule.repeatMode = 'daily';
  const { task } = await h.commands.createTask(value);
  const cases = [
    { selectedDate: new Date(2026, 8, 20), repeatMode: 'none' },
    { selectedDate: new Date(2026, 8, 9), repeatMode: 'weekly', repeatDays: ['V'] },
    { selectedDate: new Date(2026, 8, 8), repeatMode: 'daily', repeatInterval: 2 },
    { selectedDate: new Date(2026, 8, 1), repeatMode: 'daily', endDate: new Date(2026, 8, 5) },
  ];
  for (const changes of cases) {
    await h.commands.editTask(task.id, { ...value, schedule: { ...value.schedule, ...changes } });
    await assert.rejects(h.commands.setTaskDone(task.id, true, '2026-09-09'), e => e.code === 'STALE_OCCURRENCE');
    const [stored] = await h.api.getAllTasks();
    assert.equal(stored.done, false);
    assert.equal(stored.occurrences.length, 0);
  }
  await h.commands.editTask(task.id, value);
  assert.equal((await h.commands.setTaskDone(task.id, true, '2026-09-09')).changed, true);
  assert.equal((await h.commands.setTaskDone(task.id, true, '2026-09-09')).changed, false);
});
