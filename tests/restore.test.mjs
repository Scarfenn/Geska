import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHarness } from './helpers/databaseHarness.mjs';
const plain = value => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function seed(h) {
  const category = await h.api.addCategory('Category');
  await h.api.saveTask({ id: 'task', title: 'Café 📝', date: '2026-09-26', time: '10:30', categoryId: category.id,
    reminder_type: 'relative', reminder_value: 5, reminder_unit: 'minutes', notification_ids: ['old-native-id'] });
  const subtask = await h.api.addSubtask('task', 'Child');
  await h.api.setOccurrenceDone('task', '2026-09-26', true);
  await h.api.setSubtaskOccurrenceDone(subtask, '2026-09-26', true);
  await h.api.saveTask({ id: 'deleted', title: 'Tombstone' });
  await h.api.deleteTask('deleted');
  const format = h.load('../../src/features/backup/domain/backupFormat.js');
  return JSON.parse(format.serializeBackup(await h.api.getBackupSnapshot()));
}
function setup(t, { metadataFailure = false } = {}) {
  const session = { user: { id: 'user' }, access_token: 'token' };
  let json, downloads = 0;
  const notifications = [];
  const stubs = {
    '@/storage/supabase/auth': { getSession: async () => session },
    '@/storage/supabase/backupStorage': { downloadBackupFile: async (id, maxBytes) => {
      assert.equal(id, session.user.id); assert.equal(maxBytes, 20 * 1024 * 1024); downloads++; return json;
    } },
    '@/features/tasks/services/notifications': {
      cancelAllTaskReminders: async () => { notifications.push('cancel'); },
      syncTaskReminders: async () => { notifications.push('sync'); if (metadataFailure) throw new Error('native failed'); return []; },
    },
  };
  const h = databaseHarness(t, { stubs });
  return { ...h, stubs, session, notifications, get downloads() { return downloads; }, setJSON(value) { json = value; },
    restore: h.load('../../src/features/backup/services/restoreService.js'),
    validation: h.load('../../src/features/backup/domain/backupValidation.js'),
    maintenance: h.load('../../src/storage/sqlite/restoreMaintenance.js'),
  };
}

test('prepare freezes the exact document, reports counts, and apply never downloads again', async t => {
  const h = setup(t); const backup = await seed(h);
  h.setJSON(JSON.stringify(backup));
  const before = await h.api.getBackupSnapshot();
  const preview = await h.restore.prepareRestore();
  assert.deepEqual((await h.api.getBackupSnapshot()).tables, before.tables);
  assert.deepEqual(plain(preview.counts.tasks), { total: 2, deleted: 1 });
  assert.equal(preview.createdAt, backup.createdAt);
  assert.equal('tables' in preview, false);
  assert.ok(Object.isFrozen(preview) && Object.isFrozen(preview.counts));
  h.setJSON('changed remotely');
  await h.api.saveTask({ id: 'not-in-backup', title: 'Remove me' });
  h.stubs['@/features/tasks/services/notifications'].syncTaskReminders = async () => {
    assert.equal(h.calls.at(-1).sql, 'COMMIT');
    assert.equal(h.maintenance.isRestoring(), false);
    h.notifications.push('sync');
    assert.equal(await h.api.hasPendingRestoreNotificationCleanup(), true);
    return [];
  };
  const result = await h.restore.applyRestore(preview);
  assert.equal(result.status, 'restored'); assert.equal(h.downloads, 1);
  assert.deepEqual(h.notifications, ['sync']);
  const actual = await h.api.getBackupSnapshot();
  const expected = h.validation.validateBackupDocument(backup);
  assert.deepEqual(plain(actual.tables), plain(expected.tables));
  const task = actual.tables.tasks.find(t => t.id === 'task');
  assert.equal(task.notification_id, null); assert.equal(task.notification_ids, '[]');
  assert.equal(task.reminder_value, 5); assert.equal(task.updated_at, backup.tables.tasks.find(t => t.id === 'task').updated_at);
  await assert.rejects(h.restore.applyRestore(preview), e => e.code === 'RESTORE_NOT_PREPARED');
});

test('corrupt, incompatible, malformed and relationally invalid backups never write', async t => {
  const h = setup(t); const backup = await seed(h);
  const before = (await h.api.getBackupSnapshot()).tables;
  const cases = [
    ['broken', 'RESTORE_INVALID_JSON'],
    [{ ...backup, format: 'other' }, 'RESTORE_INVALID_BACKUP'],
    [{ ...backup, formatVersion: 2 }, 'RESTORE_INCOMPATIBLE_VERSION'],
    [{ ...backup, schemaVersion: 0 }, 'RESTORE_INCOMPATIBLE_VERSION'],
  ];
  for (const mutate of [
    b => { delete b.tables.subtasks; }, b => { b.tables.unknown = []; },
    b => { b.tables.tasks[0].unknown = 3; }, b => { b.tables.tasks[0].title = 42; },
    b => { b.tables.tasks[0].done = 2; }, b => { b.tables.tasks[0].updated_at = 0; },
    b => { b.tables.tasks[0].date = '2026-02-31'; }, b => { b.tables.tasks[0].time = '99:99'; },
    b => { b.tables.tasks[0].repeat_mode = 'bad'; },
    b => { b.tables.subtasks[0].task_id = 'missing'; },
    b => { b.tables.tasks.push({ ...b.tables.tasks[0] }); },
    b => { b.tables.categories.push({ ...b.tables.categories[0], id: 'duplicate-name' }); },
    b => { b.tables.task_occurrences[0].id = 'wrong'; },
    b => { b.tables.subtask_occurrences[0].date = 'bad'; },
  ]) { const b = plain(backup); mutate(b); cases.push([b, 'RESTORE_INVALID_BACKUP']); }
  for (const [document, code] of cases) {
    h.setJSON(typeof document === 'string' ? document : JSON.stringify(document));
    const offset = h.calls.length;
    await assert.rejects(h.restore.prepareRestore(), e => e.code === code);
    assert.equal(h.calls.length, offset);
  }
  assert.deepEqual((await h.api.getBackupSnapshot()).tables, before);
  assert.equal(h.notifications.length, 0);
});

test('download/auth errors and changed user preserve SQLite; discarded preview cannot apply', async t => {
  const h = setup(t); const backup = await seed(h); h.setJSON(JSON.stringify(backup));
  const preview = await h.restore.prepareRestore();
  const before = (await h.api.getBackupSnapshot()).tables;
  h.session.user.id = 'other';
  await assert.rejects(h.restore.applyRestore(preview), e => e.code === 'BACKUP_AUTH_CHANGED');
  h.session.user.id = 'user'; h.restore.discardRestore(preview);
  await assert.rejects(h.restore.applyRestore(preview), e => e.code === 'RESTORE_NOT_PREPARED');
  h.stubs['@/storage/supabase/backupStorage'].downloadBackupFile = async () => { throw new Error('network'); };
  await assert.rejects(h.restore.prepareRestore(), e => e.code === 'RESTORE_DOWNLOAD_FAILED');
  h.stubs['@/storage/supabase/auth'].getSession = async () => null;
  await assert.rejects(h.restore.prepareRestore(), e => e.code === 'BACKUP_AUTH_REQUIRED');
  assert.deepEqual((await h.api.getBackupSnapshot()).tables, before);
});

test('mid-insert and commit failures rollback all five tables and permit subsequent operations', async t => {
  const h = setup(t); const backup = await seed(h); h.setJSON(JSON.stringify(backup));
  const preview = await h.restore.prepareRestore();
  await h.api.saveTask({ id: 'local-only', title: 'Keep after failure' });
  const before = (await h.api.getBackupSnapshot()).tables;
  for (const point of ['INSERT INTO subtask_occurrences', 'COMMIT']) {
    let fail = true;
    h.intercept((method, sql) => { if (fail && sql.startsWith(point)) { fail = false; throw new Error('injected failure'); } });
    await assert.rejects(h.restore.applyRestore(preview), e => e.code === 'RESTORE_WRITE_FAILED');
    h.intercept(() => {});
    assert.deepEqual((await h.api.getBackupSnapshot()).tables, before);
    assert.equal(h.maintenance.isRestoring(), false);
    assert.equal(h.notifications.length, 0);
  }
  await h.restore.applyRestore(preview);
  assert.equal((await h.api.getAllTasks()).some(t => t.id === 'local-only'), false);
});

test('nullable legacy defaults normalize; foreign keys enabled and empty replacement both work', async t => {
  const h = setup(t); const backup = await seed(h);
  for (const row of backup.tables.tasks) { row.repeat_interval = null; row.done = null; }
  await h.db.execAsync('PRAGMA foreign_keys=ON');
  await h.api.replaceDatabaseFromBackup(backup);
  assert.equal((await h.api.getBackupSnapshot()).tables.tasks[0].repeat_interval, 1);
  assert.equal((await h.db.getAllAsync('PRAGMA foreign_key_check')).length, 0);
  for (const table of Object.keys(backup.tables)) backup.tables[table] = [];
  await h.api.replaceDatabaseFromBackup(backup);
  for (const rows of Object.values((await h.api.getBackupSnapshot()).tables)) assert.equal(rows.length, 0);
});

test('reminder failure is a separate warning after successful commit', async t => {
  const h = setup(t, { metadataFailure: true }); const backup = await seed(h); h.setJSON(JSON.stringify(backup));
  const preview = await h.restore.prepareRestore();
  const result = await h.restore.applyRestore(preview);
  assert.equal(result.status, 'restored'); assert.match(result.reminderWarning, /recordatorios/);
  assert.equal(result.reminderError.message, 'native failed');
  assert.equal((await h.api.getAllTasks())[0].notification_id, null);
});

test('maintenance drains native work and rejects delayed old writes before any restore BEGIN', async t => {
  const h = setup(t); const backup = await seed(h);
  const gate = deferred(), started = deferred();
  const oldRevision = h.maintenance.getLocalRevision();
  const old = h.maintenance.trackLocalOperation(async () => {
    started.resolve(); await gate.promise;
    await h.api.updateTaskNotificationIds({ id: 'task', notification_ids: ['stale'] });
  });
  const oldRejected = assert.rejects(old, e => e.code === 'LOCAL_DATA_REPLACED');
  await started.promise;
  const offset = h.calls.length;
  const restore = h.api.replaceDatabaseFromBackup(backup);
  assert.equal(h.maintenance.isRestoring(), true);
  await assert.rejects(h.api.saveTask({ id: 'during', title: 'Blocked' }), e => e.code === 'LOCAL_DATA_REPLACED');
  assert.equal(h.calls.slice(offset).some(c => c.sql === 'BEGIN'), false);
  gate.resolve(); await oldRejected; await restore;
  assert.throws(() => h.maintenance.assertLocalAccess(oldRevision), e => e.code === 'LOCAL_DATA_REPLACED');
  assert.equal((await h.api.getAllTasks())[0].notification_id, null);
  await h.api.saveTask({ id: 'after', title: 'Allowed' });
  assert.equal((await h.api.getAllTasks()).length, 2);
});

test('apply cannot run twice while the maintenance barrier is draining', async t => {
  const h = setup(t); h.setJSON(JSON.stringify(await seed(h)));
  const preview = await h.restore.prepareRestore();
  const gate = deferred();
  const work = h.maintenance.trackLocalOperation(() => gate.promise);
  await Promise.resolve();
  const first = h.restore.applyRestore(preview);
  await assert.rejects(h.restore.applyRestore(preview), e => e.code === 'RESTORE_BUSY');
  gate.resolve(); await work; await first;
});

test('actual task commands drain pending reminder persistence before replacement', async t => {
  const h = setup(t); const backup = await seed(h);
  const entered = deferred(), native = deferred();
  h.stubs['@/features/tasks/services/notifications'].reconcileTaskReminders = async (task, persist) => {
    entered.resolve(); await native.promise;
    await persist({ id: task.id, notification_ids: ['late-native-id'] });
    return { status: 'scheduled', ids: ['late-native-id'] };
  };
  const commands = h.load('../../src/features/tasks/services/taskCommands.js');
  const edit = commands.editTask('task', {
    text: 'Old pending edit', categoryId: null, subtasks: [],
    schedule: { selectedDate: new Date(2026, 8, 26), selectedTime: null, repeatMode: 'none', repeatDays: [], repeatInterval: 1, reminder: null, endDate: null },
  });
  await entered.promise;
  const restore = h.api.replaceDatabaseFromBackup(backup);
  assert.equal(h.maintenance.isRestoring(), true);
  native.resolve(); const edited = await edit;
  assert.equal(edited.reminders.status, 'failed');
  await restore;
  assert.equal((await h.api.getAllTasks())[0].title, 'Café 📝');
  assert.equal((await h.api.getAllTasks())[0].notification_id, null);
});

test('restore controller requires separate prepare and apply; cancellation and duplicate apply are safe', async () => {
  const { loadDatabase } = await import('./helpers/databaseHarness.mjs');
  const { createBackupController } = loadDatabase(null, { entry: '../../src/features/backup/services/backupController.js' });
  const preview = Object.freeze({ createdAt: '2026-09-26T12:00:00.000Z', counts: {} });
  let writes = 0, discards = 0;
  const gate = deferred();
  const c = createBackupController({
    getCurrentBackup: async () => ({ userId: 'user', remote: { id: 'backup' } }),
    prepareRestore: async () => preview,
    discardRestore: () => { discards++; },
    applyRestore: async value => { assert.equal(value, preview); writes++; await gate.promise; return { status: 'restored', reminderWarning: 'Native warning' }; },
  }, () => {});
  await c.refresh(); await c.apply(); assert.equal(writes, 0);
  await c.prepare(); assert.equal(c.getState().status, 'confirm-restore'); assert.equal(writes, 0);
  c.cancelPreparation(); await c.apply(); assert.equal(writes, 0);
  await c.prepare(); const first = c.apply(); const second = c.apply();
  await Promise.resolve(); assert.equal(writes, 1); gate.resolve(); await first; await second;
  assert.equal(c.getState().status, 'restored'); assert.equal(c.getState().warning, 'Native warning'); assert.ok(discards > 0);
  c.cancelPreparation();
  assert.equal(c.getState().status, 'restored');
  await c.refresh();
  assert.equal(c.getState().warning, 'Native warning');
});


test('Storage download uses the exact private object and React Native UTF-8 reader', async () => {
  const { loadDatabase } = await import('./helpers/databaseHarness.mjs');
  const calls = [];
  let configured = true, response = { data: { size: 24, text: '{"title":"Café 📝"}' } }, readerFailure = false;
  const cause = new Error('Storage denied');
  const api = loadDatabase(null, {
    entry: '../../src/storage/supabase/backupStorage.js',
    globals: { FileReader: class {
      readAsText(blob, encoding) {
        calls.push(['read', encoding]);
        if (readerFailure) { this.error = cause; this.onerror(); }
        else { this.result = blob.text; this.onload(); }
      }
    } },
    stubs: { '@/storage/supabase/client': { getSupabaseClient: () => configured ? {
      storage: { from(bucket) { return { async download(path, options) {
        calls.push([bucket, path, options]); return response;
      } }; } },
    } : null } },
  });
  assert.equal(await api.downloadBackupFile('user', 100), '{"title":"Café 📝"}');
  assert.equal(calls[0][0], 'geska-backups');
  assert.equal(calls[0][1], 'user/backup.json');
  assert.equal(typeof calls[0][2].cacheNonce, 'string');
  assert.deepEqual(calls[1], ['read', 'UTF-8']);
  readerFailure = true;
  await assert.rejects(api.downloadBackupFile('user', 100), e => e === cause);
  response = { data: { size: 101 } };
  await assert.rejects(api.downloadBackupFile('user', 100), e => e.code === 'RESTORE_TOO_LARGE');
  response = { error: cause };
  await assert.rejects(api.downloadBackupFile('user', 100), e => e === cause);
  configured = false;
  await assert.rejects(api.downloadBackupFile('user', 100), e => e.code === 'SUPABASE_NOT_CONFIGURED');
});
