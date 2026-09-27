import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHarness, loadDatabase } from './helpers/databaseHarness.mjs';
const format = loadDatabase(null, { entry: '../../src/features/backup/domain/backupFormat.js' });
const { encodeUtf8 } = loadDatabase(null, { entry: '../../src/features/backup/domain/utf8.js' });
const session = { user: { id: 'user-123' }, access_token: 'test-token' };
const snapshot = { schemaVersion: 1, createdAt: '2026-09-26T12:00:00.000Z', tables: {
  categories: [], tasks: [{ id: 'task', title: 'Café 📝 漢字', updated_at: 123, deleted_at: 124 }], subtasks: [], task_occurrences: [], subtask_occurrences: [],
} };
function harness(options = {}) {
  const calls = []; let snapshots = 0, serializations = 0;
  const client = { storage: { from(bucket) { return { async info(path) {
    return options.info ? options.info(path) : { data: { id: 'object-id', lastModified: '2026-09-26T12:01:00.000Z', size: 123 }, error: null };
  }, async upload(path, body, config) {
    calls.push({ bucket, path, body, config });
    return options.upload ? options.upload(path, body, config) : { data: { id: 'object-id', fullPath: `${bucket}/${path}` }, error: null };
  } }; } } };
  const api = loadDatabase(null, { entry: '../../src/features/backup/services/backupService.js', stubs: {
    '@/storage/supabase/auth': { getSession: options.getSession || (async () => session) },
    '@/storage/supabase/client': { getSupabaseClient: () => options.configured === false ? null : client },
    '@/storage/database': { getBackupSnapshot: async () => { snapshots++; return options.snapshot ? options.snapshot() : snapshot; } },
    '@/features/backup/domain/backupFormat': { ...format, serializeBackup(value) { serializations++; return options.serialize ? options.serialize(value) : format.serializeBackup(value); } },
  } });
  return { ...api, calls, get snapshots() { return snapshots; }, get serializations() { return serializations; } };
}

test('authenticated upload uses existing serializer, exact path, bucket, upsert and JSON ArrayBuffer', async () => {
  const h = harness(); const result = await h.uploadBackup();
  assert.equal(h.snapshots, 1); assert.equal(h.serializations, 1);
  const call = h.calls[0];
  assert.equal(call.bucket, 'geska-backups');
  assert.equal(call.path, 'user-123/backup.json');
  assert.equal(call.config.upsert, true); assert.equal(call.config.contentType, 'application/json');
  assert.equal(Object.prototype.toString.call(call.body), '[object ArrayBuffer]');
  assert.equal(Buffer.from(call.body).toString('utf8'), format.serializeBackup(snapshot));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    path: 'user-123/backup.json', bucket: 'geska-backups', id: 'object-id', fullPath: 'geska-backups/user-123/backup.json',
    userId: 'user-123', metadataError: null,
    remote: { path: 'user-123/backup.json', bucket: 'geska-backups', id: 'object-id', lastModified: '2026-09-26T12:01:00.000Z', sizeBytes: 123 },
    createdAt: snapshot.createdAt, schemaVersion: 1, formatVersion: 1, sizeBytes: Buffer.byteLength(format.serializeBackup(snapshot)),
  });
  assert.equal(JSON.stringify(result).includes('Café'), false);
});

test('UTF-8 encoding matches standard encoding including emoji, combining characters and lone surrogates', () => {
  for (const text of ['', 'ASCII', 'café e\u0301 漢字 📝', '\uD800x\uDC00', '\u0000\u07ff\u0800\uffff\u{10ffff}']) {
    assert.deepEqual(Buffer.from(encodeUtf8(text)), Buffer.from(text, 'utf8'));
  }
});

test('no session or token refuses upload before snapshot', async () => {
  for (const value of [null, { user: { id: 'user-123' } }]) {
    const h = harness({ getSession: async () => value });
    await assert.rejects(h.uploadBackup(), e => e.code === 'BACKUP_AUTH_REQUIRED');
    assert.equal(h.snapshots, 0); assert.equal(h.calls.length, 0);
  }
});

test('unconfigured Auth remains distinguishable and preserves original error', async () => {
  const error = Object.assign(new Error('missing config'), { code: 'SUPABASE_NOT_CONFIGURED' });
  const h = harness({ getSession: async () => { throw error; } });
  await assert.rejects(h.uploadBackup(), e => e === error);
  assert.equal(h.snapshots, 0); assert.equal(h.calls.length, 0);
});

for (const [stage, code] of [['snapshot', 'BACKUP_SNAPSHOT_FAILED'], ['serialize', 'BACKUP_SERIALIZATION_FAILED'], ['getSession', 'BACKUP_AUTH_FAILED']]) {
  test(`${stage} failure retains cause and never starts upload`, async () => {
    const cause = new Error(stage);
    const h = harness({ [stage]: () => { throw cause; } });
    await assert.rejects(h.uploadBackup(), e => e.code === code && e.cause === cause);
    assert.equal(h.calls.length, 0);
  });
}

test('Storage response and thrown transport errors retain their original details', async () => {
  const cause = Object.assign(new Error('RLS denied'), { statusCode: '403' });
  for (const upload of [async () => ({ data: null, error: cause }), async () => { throw cause; }]) {
    const h = harness({ upload });
    await assert.rejects(h.uploadBackup(), e => e.code === 'BACKUP_UPLOAD_FAILED' && e.cause === cause && e.cause.statusCode === '403');
  }
  await assert.rejects(harness({ configured: false }).uploadBackup(), e => e.code === 'SUPABASE_NOT_CONFIGURED');
});

test('session loss or account change after capture prevents upload', async () => {
  for (const current of [null, { ...session, user: { id: 'other-user' } }]) {
    let checks = 0;
    const h = harness({ getSession: async () => ++checks === 1 ? session : current });
    await assert.rejects(h.uploadBackup(), e => e.code === (current ? 'BACKUP_AUTH_CHANGED' : 'BACKUP_AUTH_REQUIRED'));
    assert.equal(h.calls.length, 0);
  }
});

test('real SQLite COMMIT precedes upload; pending network never blocks local writes', async t => {
  const db = databaseHarness(t);
  await db.api.saveTask({ id: 'task', title: 'Original 📝' });
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const network = new Promise(resolve => { release = resolve; });
  const h = harness({ snapshot: () => db.api.getBackupSnapshot(), upload: async () => {
    assert.equal(db.calls.at(-1).sql, 'COMMIT');
    entered(); await network;
    return { data: { id: 'uploaded' }, error: null };
  } });
  const pending = h.uploadBackup();
  await started;
  await db.api.updateTask({ id: 'task', title: 'While uploading' });
  assert.equal((await db.api.getAllTasks())[0].title, 'While uploading');
  assert.equal(JSON.parse(Buffer.from(h.calls[0].body).toString('utf8')).tables.tasks[0].title, 'Original 📝');
  release(); await pending;
});


test('remote info is authoritative; only explicit object absence returns null', async () => {
  const missing = { statusCode: 'NoSuchKey', message: 'missing' };
  const h = harness({ info: async path => {
    assert.equal(path, 'user-123/backup.json');
    return { data: null, error: missing };
  } });
  assert.equal((await h.getCurrentBackup()).remote, null);
  for (const error of [{ statusCode: '403' }, { statusCode: '404', message: 'Bucket not found' }, { statusCode: '404' }, new Error('offline')]) {
    await assert.rejects(harness({ info: async () => ({ data: null, error }) }).getCurrentBackup(), e => e.code === 'BACKUP_METADATA_FAILED' && e.cause === error);
  }
});

test('successful upload survives metadata errors and never substitutes capture time for remote time', async () => {
  const error = new Error('offline after upload');
  const h = harness({ info: async () => { throw error; } });
  const result = await h.uploadBackup();
  assert.equal(h.calls.length, 1);
  assert.equal(result.remote, null);
  assert.equal(result.metadataError.code, 'BACKUP_METADATA_FAILED');
  assert.equal(result.metadataError.cause, error);
  assert.equal(result.createdAt, snapshot.createdAt);
});
