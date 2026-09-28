import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHarness, loadDatabase, createDatabaseLoader } from './helpers/databaseHarness.mjs';
import { notificationHarness } from './helpers/notificationHarness.mjs';
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const plain = value => JSON.parse(JSON.stringify(value));
const session = { user: { id: 'A' }, access_token: 'jwt-A' };

function uploads(h, transport) {
  return loadDatabase(null, { entry: '../../src/features/backup/services/backupService.js', stubs: {
    '@/storage/supabase/auth': { getSession: async () => session },
    '@/storage/database': { getBackupSnapshot: () => h.api.getBackupSnapshot() },
    '@/storage/supabase/backupStorage': transport,
  } });
}

test('B1: leaving Copias and mounting a second controller cannot overwrite a newer backup with an older pending upload', async t => {
  const h = databaseHarness(t);
  await h.api.saveTask({ id: 'task', title: 'old' });
  const entered = defer(), gate = defer(); let calls = 0, remote = null;
  const service = uploads(h, {
    getBackupFileInfo: async () => remote ? { id: 'remote' } : null,
    uploadBackupFile: async (id, body) => {
      const title = JSON.parse(Buffer.from(body).toString()).tables.tasks[0].title;
      if (++calls === 1) { entered.resolve(); await gate.promise; }
      remote = title; return { id: 'remote' };
    },
  });
  const { createBackupController } = loadDatabase(null, { entry: '../../src/features/backup/services/backupController.js' });
  const first = createBackupController(service, () => {});
  await first.refresh(); const pending = first.upload(); await entered.promise;
  // The old controller survives only through its pending promise after navigation.
  await h.api.updateTask({ id: 'task', title: 'new' });
  const second = createBackupController(service, () => {});
  await second.refresh(); await second.upload();
  assert.equal(second.getState().error.code, 'BACKUP_UPLOAD_BUSY');
  assert.equal(calls, 1); assert.equal(remote, null);
  gate.resolve(); await pending;
  await second.refresh(); second.upload(); await second.confirmUpload();
  assert.equal(second.getState().status, 'success');
  assert.equal(calls, 2); assert.equal(remote, 'new');
});

test('B1: a failed upload releases the service guard for the next screen', async t => {
  const h = databaseHarness(t); let fail = true, calls = 0;
  const service = uploads(h, { getBackupFileInfo: async () => ({ id: 'remote' }), uploadBackupFile: async () => {
    calls++; if (fail) throw new Error('offline'); return { id: 'remote' };
  } });
  await assert.rejects(service.uploadBackup(), e => e.code === 'BACKUP_UPLOAD_FAILED');
  fail = false; await service.uploadBackup(); assert.equal(calls, 2);
});

test('B2: a second Cuenta controller waits for deletion and cannot replace A with B before late cleanup', async () => {
  const gate = defer(), entered = defer(); let current = session, mutations = 0;
  const cleared = [];
  const client = { auth: {
    getSession: async () => ({ data: { session: current } }),
    signOut: async () => { mutations++; current = null; return {}; },
    signInWithPassword: async () => { mutations++; current = { user: { id: 'B' }, access_token: 'jwt-B' }; return { data: { session: current } }; },
    signUp: async () => { mutations++; return { data: {} }; },
  }, functions: { invoke: async () => { entered.resolve(); await gate.promise; return { data: { status: 'deleted' } }; } } };
  const auth = loadDatabase(null, { entry: '../../src/storage/supabase/auth.js', stubs: {
    '@/storage/supabase/client': { getSupabaseClient: () => client, clearDeletedAccountSession: async expected => {
      assert.equal(expected, client); cleared.push(current.user.id); current = null;
    } },
  } });
  const { createAccountController } = loadDatabase(null, { entry: '../../src/features/account/services/accountController.js' });
  const first = createAccountController(auth, () => {}); await first.load(); first.requestDeletion();
  const deleting = first.deleteAccount(); await entered.promise;
  const second = createAccountController(auth, () => {}); const loading = second.load();
  assert.equal(second.getState().status, 'loading');
  for (const action of [() => auth.signOut(), () => auth.signInWithEmail('b@example.com', 'abcdef'), () => auth.signUpWithEmail('b@example.com', 'abcdef')]) {
    await assert.rejects(action(), e => e.code === 'ACCOUNT_AUTH_BUSY');
  }
  assert.equal(await second.logout(), false); assert.equal(mutations, 0);
  gate.resolve(); await deleting; await loading;
  assert.deepEqual(cleared, ['A']); assert.equal(second.getState().status, 'signed-out');
  await second.submit({ mode: 'login', email: 'b@example.com', password: 'abcdef' });
  assert.equal(current.user.id, 'B'); assert.equal(second.getState().session.user.id, 'B');
  assert.deepEqual(cleared, ['A']);
});

test('B2: deletion refuses to overlap an already pending login', async () => {
  const gate = defer(); let deletes = 0;
  const auth = loadDatabase(null, { entry: '../../src/storage/supabase/auth.js', stubs: {
    '@/storage/supabase/client': { getSupabaseClient: () => ({
      auth: { signInWithPassword: async () => { await gate.promise; return { data: { session } }; } },
      functions: { invoke: async () => { deletes++; } },
    }) },
  } });
  const login = auth.signInWithEmail('a@example.com', 'abcdef');
  await assert.rejects(auth.deleteAccount('A'), e => e.code === 'ACCOUNT_AUTH_BUSY');
  gate.resolve(); await login; assert.equal(deletes, 0);
});

test('P1: invalid format, relations, row count and UTF-8 size cannot overwrite a good remote backup', async t => {
  const h = databaseHarness(t); await h.api.saveTask({ id: 'task', title: 'valid' });
  const original = plain(await h.api.getBackupSnapshot());
  let snapshot = original, remote = 'previous-good-copy', calls = 0;
  const service = uploads({ api: { getBackupSnapshot: async () => snapshot } }, {
    getBackupFileInfo: async () => ({ id: 'remote' }),
    uploadBackupFile: async (id, body) => { calls++; remote = Buffer.from(body).toString(); return { id: 'remote' }; },
  });
  const cases = [
    ['BACKUP_INVALID', s => { s.tables.tasks[0].category_id = 'missing'; }],
    ['BACKUP_INVALID', s => { delete s.tables.tasks[0].done; }],
    ['BACKUP_INVALID', s => { s.tables.tasks[0].date = '2026-02-31'; }],
    ['BACKUP_INVALID', s => { s.tables.tasks.push({ ...s.tables.tasks[0] }); }],
    ['BACKUP_INVALID', s => { s.schemaVersion = 99; }],
    ['BACKUP_TOO_LARGE', s => { s.tables.tasks[0].title = 'x'.repeat(20 * 1024 * 1024); }],
    // Less than 20 MiB JS characters, more than 20 MiB UTF-8 bytes.
    ['BACKUP_TOO_LARGE', s => { s.tables.tasks[0].title = '漢'.repeat(7 * 1024 * 1024); }],
    ['BACKUP_TOO_LARGE', s => { s.tables.categories = Array.from({ length: 100000 }, (_, i) => ({ id: String(i), name: String(i), updated_at: 1, deleted_at: null })); }],
  ];
  for (const [code, mutate] of cases) {
    snapshot = plain(original); mutate(snapshot);
    await assert.rejects(service.uploadBackup(), e => e.code === code);
    assert.equal(calls, 0); assert.equal(remote, 'previous-good-copy');
  }
  snapshot = original; await service.uploadBackup();
  const validator = h.load('../../src/features/backup/domain/backupValidation.js');
  const accepted = validator.parseBackupDocument(remote);
  await h.api.replaceDatabaseFromBackup(accepted);
  assert.equal((await h.api.getAllTasks())[0].title, 'valid'); assert.equal(calls, 1);
});

for (const failure of ['cancel', 'dismiss']) test(`P2: ${failure} failure does not roll back restore; independent cleanup and a fresh runtime finish pending cleanup`, async t => {
  const native = notificationHarness();
  const stubs = { ...native.stubs };
  delete stubs['@/storage/database'];
  let json;
  stubs['@/storage/supabase/auth'] = { getSession: async () => session };
  stubs['@/storage/supabase/backupStorage'] = { downloadBackupFile: async () => json };
  const h = databaseHarness(t, { stubs });
  await h.api.saveTask({ id: 'backup-task', title: 'restored' });
  json = h.load('../../src/features/backup/domain/backupFormat.js').serializeBackup(await h.api.getBackupSnapshot());
  await h.api.saveTask({ id: 'local-only', title: 'replaced' });
  const content = { title: '⏰ Recordatorio', data: { type: 'task-reminder', taskId: 'local-only' } };
  native.scheduled.set('old', { identifier: 'old', content });
  const presented = new Set(['one', 'two']); let cancelCalls = 0, dismissCalls = 0, failing = true;
  native.native.getPresentedNotificationsAsync = async () => [...presented].map(identifier => ({ request: { identifier, content } }));
  native.native.cancelScheduledNotificationAsync = async id => { cancelCalls++; if (failure === 'cancel' && failing) throw new Error('cancel failed'); native.scheduled.delete(id); };
  native.native.dismissNotificationAsync = async id => { dismissCalls++; if (failure === 'dismiss' && failing && id === 'one') throw new Error('dismiss failed'); presented.delete(id); };
  const restore = h.load('../../src/features/backup/services/restoreService.js');
  const result = await restore.applyRestore(await restore.prepareRestore());
  assert.equal(result.status, 'restored'); assert.match(result.reminderWarning, /Se reintentará/);
  assert.deepEqual((await h.api.getAllTasks()).map(t => t.title), ['restored']);
  assert.ok(cancelCalls > 0); assert.equal(dismissCalls, 2);
  assert.equal(await h.api.hasPendingRestoreNotificationCleanup(), true);
  assert.equal(presented.has('two'), false);
  // Fresh JS modules, same persisted SQLite: no in-memory retry flag survives.
  failing = false;
  const fresh = createDatabaseLoader(h.db, { stubs });
  const db = fresh('../../src/storage/database.js');
  const reminders = fresh('../../src/features/tasks/services/notifications.js');
  await reminders.syncTaskReminders(db.getAllTasks, db.updateTaskNotificationIds);
  assert.equal(native.scheduled.size, 0); assert.equal(presented.size, 0);
  assert.equal(await db.hasPendingRestoreNotificationCleanup(), false);
  assert.deepEqual((await db.getAllTasks()).map(t => t.title), ['restored']);
  // Later ordinary sync must not dismiss newly presented notifications.
  presented.add('new'); await reminders.syncTaskReminders(db.getAllTasks, db.updateTaskNotificationIds);
  assert.equal(presented.has('new'), true);
});

test('P2: failed SQL replacement does not commit a cleanup obligation', async t => {
  const h = databaseHarness(t);
  await h.api.saveTask({ id: 'task', title: 'keep' });
  const document = h.load('../../src/features/backup/domain/backupFormat.js').createBackupDocument(await h.api.getBackupSnapshot());
  h.intercept((method, sql) => { if (sql.startsWith('INSERT INTO tasks')) throw new Error('disk'); });
  await assert.rejects(h.api.replaceDatabaseFromBackup(document));
  h.intercept(() => {});
  assert.equal(await h.api.hasPendingRestoreNotificationCleanup(), false);
  assert.equal((await h.api.getAllTasks())[0].title, 'keep');
});
