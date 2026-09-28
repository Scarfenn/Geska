import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { loadDatabase, databaseHarness } from './helpers/databaseHarness.mjs';
const source = readFileSync(new URL('../supabase/functions/delete-account/handler.js', import.meta.url), 'utf8');
const { createDeleteAccountHandler } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { createAuthSessionStorage } = loadDatabase(null, { entry: '../../src/storage/supabase/authSessionStorage.js' });
const { createAccountController } = loadDatabase(null, { entry: '../../src/features/account/services/accountController.js' });
const session = { user: { id: 'user-a', email: 'a@example.com' }, access_token: 'jwt' };
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };
const request = (body = {}, token = 'jwt', method = 'POST') => new Request('https://example.test/delete-account', {
  method, headers: token ? { Authorization: `Bearer ${token}` } : {}, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});
function server(options = {}) {
  const calls = [];
  const handler = createDeleteAccountHandler({
    verifyUser: async token => { calls.push(['verify', token]); if (options.throwIdentity) throw options.throwIdentity; return options.identity || { data: { user: session.user } }; },
    createAdmin: () => ({
      storage: { from(bucket) { calls.push(['bucket', bucket]); return {
        info: async path => { calls.push(['info', path]); return options.info || { data: { id: 'object' } }; },
        remove: async paths => { calls.push(['remove', paths]); return options.remove || { data: [] }; },
      }; } },
      auth: { admin: { deleteUser: async (...args) => { calls.push(['delete', ...args]); if (options.throwAuth) throw new Error('network'); return options.auth || { data: {} }; } } },
    }),
  });
  return { handler, calls };
}

test('server only deletes authenticated own backup before hard-deleting Auth', async () => {
  const h = server(); const response = await h.handler(request());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'deleted' });
  assert.deepEqual(h.calls, [['verify', 'jwt'], ['bucket', 'geska-backups'], ['info', 'user-a/backup.json'], ['remove', ['user-a/backup.json']], ['delete', 'user-a', false]]);
});

test('server rejects unauthenticated, expired, forged targets and unsupported methods before privileged operations', async () => {
  for (const body of [{ userId: 'user-b' }, { bucket: 'other' }, { path: '../user-b/backup.json' }, null, []]) {
    const h = server(); assert.equal((await h.handler(request(body))).status, 400); assert.equal(h.calls.length, 0);
  }
  for (const input of [request({}, null), request({}, 'jwt', 'GET')]) {
    const h = server(); assert.ok([401, 405].includes((await h.handler(input)).status)); assert.equal(h.calls.length, 0);
  }
  const h = server({ identity: { error: Object.assign(new Error('expired'), { status: 401 }) } });
  assert.equal((await h.handler(request())).status, 401); assert.equal(h.calls.length, 1);
});

test('confirmed missing object continues; generic 404, forbidden, malformed info or Storage error stops Auth', async () => {
  for (const error of [{ code: 'NoSuchKey' }, { statusCode: '404', message: 'Object not found' }]) {
    const h = server({ info: { error } });
    assert.equal((await h.handler(request())).status, 200);
    assert.equal(h.calls.some(c => c[0] === 'remove'), false); assert.equal(h.calls.at(-1)[0], 'delete');
  }
  for (const options of [{ info: { error: { statusCode: '404', message: 'Bucket not found' } } },
    { info: { error: { statusCode: '403' } } }, { info: { data: null } }, { remove: { error: new Error('storage') } }]) {
    const h = server(options); const response = await h.handler(request());
    assert.equal((await response.json()).code, 'ACCOUNT_STORAGE_FAILED');
    assert.equal(h.calls.some(c => c[0] === 'delete'), false);
  }
});

test('partial Auth failure is explicit and retry works with an absent backup; transport outcome is unconfirmed', async () => {
  const options = { auth: { error: new Error('Auth failed') } }; const h = server(options);
  assert.equal((await (await h.handler(request())).json()).code, 'ACCOUNT_AUTH_DELETE_FAILED');
  options.auth = { data: {} }; options.info = { error: { code: 'NoSuchKey' } };
  assert.equal((await h.handler(request())).status, 200);
  const uncertain = server({ throwAuth: true });
  assert.equal((await (await uncertain.handler(request())).json()).code, 'ACCOUNT_DELETE_UNCONFIRMED');
});

function facade(options = {}) {
  const calls = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: options.session === undefined ? session : options.session } }) },
    functions: { invoke: async (...args) => { calls.push(args); if (options.throwInvoke) throw options.throwInvoke; return options.invoke ? options.invoke(...args) : options.response || { data: { status: 'deleted' } }; } },
  };
  const api = loadDatabase(null, { entry: '../../src/storage/supabase/auth.js', stubs: {
    '@/storage/supabase/client': {
      getSupabaseClient: () => options.configured === false ? null : client,
      clearDeletedAccountSession: async () => { calls.push('clear'); if (options.cleanupError) throw options.cleanupError; },
    },
  } });
  return { api, calls };
}

test('facade sends only JWT and empty body; requires session/configuration/same confirmed identity', async () => {
  const h = facade(); await h.api.deleteAccount('user-a');
  assert.equal(h.calls[0][0], 'delete-account');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0][1])), { body: {}, headers: { Authorization: 'Bearer jwt' } });
  assert.equal(h.calls[1], 'clear');
  for (const [options, id, code] of [[{ configured: false }, 'user-a', 'SUPABASE_NOT_CONFIGURED'], [{ session: null }, 'user-a', 'ACCOUNT_AUTH_REQUIRED'], [{}, 'user-b', 'ACCOUNT_AUTH_CHANGED']]) {
    const h = facade(options); await assert.rejects(h.api.deleteAccount(id), e => e.code === code); assert.equal(h.calls.length, 0);
  }
});

test('facade preserves error causes, never claims transport success, and retries cleanup without repeating deletion', async () => {
  for (const code of ['ACCOUNT_STORAGE_FAILED', 'ACCOUNT_AUTH_DELETE_FAILED', 'ACCOUNT_AUTH_REQUIRED']) {
    const original = { context: { json: async () => ({ code }) } };
    const h = facade({ response: { error: original } });
    await assert.rejects(h.api.deleteAccount('user-a'), e => e.code === code && e.cause === original);
    assert.equal(h.calls.includes('clear'), false);
  }
  const cause = new Error('offline'); const h = facade({ throwInvoke: cause });
  await assert.rejects(h.api.deleteAccount('user-a'), e => e.code === 'ACCOUNT_DELETE_UNCONFIRMED' && e.cause === cause);
  const options = { cleanupError: cause }; const failed = facade(options);
  await assert.rejects(failed.api.deleteAccount('user-a'), e => e.code === 'ACCOUNT_LOCAL_CLEANUP_FAILED');
  options.cleanupError = null; await failed.api.finishAccountDeletion();
  assert.equal(failed.calls.filter(Array.isArray).length, 1); assert.equal(failed.calls.filter(c => c === 'clear').length, 2);
});

test('controlled adapter preserves existing sessions, clears only SDK-observed keys, drains and rejects late writes/removals', async () => {
  const values = new Map([['sdk-chosen-key', 'old-session'], ['theme', 'dark']]);
  const gate = defer();
  const storage = { getItem: async k => values.get(k) ?? null,
    setItem: async (k, v) => { await gate.promise; values.set(k, v); }, removeItem: async k => { values.delete(k); } };
  const old = createAuthSessionStorage(storage);
  assert.equal(await old.adapter.getItem('sdk-chosen-key'), 'old-session');
  const write = old.adapter.setItem('sdk-chosen-key', 'rotated'); await Promise.resolve();
  const clear = old.clear();
  assert.equal(await old.adapter.getItem('sdk-chosen-key'), null);
  gate.resolve(); await write; await clear;
  assert.deepEqual([...values], [['theme', 'dark']]);
  const fresh = createAuthSessionStorage(storage);
  await fresh.adapter.setItem('sdk-chosen-key', 'new-login');
  await old.adapter.setItem('sdk-chosen-key', 'late'); await old.adapter.removeItem('sdk-chosen-key');
  assert.equal(await fresh.adapter.getItem('sdk-chosen-key'), 'new-login');
});

test('adapter reports disk failure and permits cleanup retry without reopening old session', async () => {
  let fail = true;
  const storage = { getItem: async () => 'session', removeItem: async () => { if (fail) throw new Error('disk'); } };
  const h = createAuthSessionStorage(storage); await h.adapter.getItem('opaque');
  await assert.rejects(h.clear(), /disk/); assert.equal(await h.adapter.getItem('opaque'), null);
  fail = false; await h.clear();
});

test('controller requires confirmation, blocks duplicates, and distinguishes cleanup from remote failure', async () => {
  const gate = defer(); let calls = 0, cleaned = 0;
  const auth = { getSession: async () => session, deleteAccount: async id => { assert.equal(id, 'user-a'); calls++; await gate.promise; }, finishAccountDeletion: async () => { cleaned++; } };
  const c = createAccountController(auth, () => {}); await c.load();
  await c.deleteAccount(); assert.equal(calls, 0);
  c.requestDeletion(); c.cancelDeletion(); await c.deleteAccount(); assert.equal(calls, 0);
  c.requestDeletion(); const first = c.deleteAccount(); await c.deleteAccount(); c.cancelDeletion();
  assert.equal(calls, 1); assert.equal(c.getState().confirmDelete, true);
  gate.resolve(); await first; assert.equal(c.getState().status, 'signed-out'); assert.equal(c.getState().session, null);
  await c.load(); auth.deleteAccount = async () => { throw Object.assign(new Error(), { code: 'ACCOUNT_LOCAL_CLEANUP_FAILED' }); };
  c.requestDeletion(); await c.deleteAccount(); assert.equal(c.getState().status, 'cleanup-pending');
  await c.load(); assert.equal(c.getState().status, 'cleanup-pending');
  await c.retryCleanup(); assert.equal(cleaned, 1); assert.equal(c.getState().status, 'signed-out');
});

test('account deletion success and failure leave all five real SQLite tables exactly intact', async t => {
  const db = databaseHarness(t);
  const category = await db.api.addCategory('Local');
  await db.api.saveTask({ id: 'task', title: 'Keep', categoryId: category.id });
  const child = await db.api.addSubtask('task', 'Child');
  await db.api.setOccurrenceDone('task', '2026-09-27', true);
  await db.api.setSubtaskOccurrenceDone(child, '2026-09-27', true);
  await db.api.saveTask({ id: 'deleted', title: 'Tombstone' }); await db.api.deleteTask('deleted');
  const before = (await db.api.getBackupSnapshot()).tables;
  assert.equal(Object.values(before).every(rows => rows.length > 0), true);
  for (const options of [{}, { info: { error: { code: 'NoSuchKey' } } },
    { remove: { error: new Error('storage') } }, { auth: { error: new Error('Auth rejected') } },
    { throwAuth: true }, { cleanupError: new Error('disk') }]) {
    const remote = server(options);
    const h = facade({ cleanupError: options.cleanupError, invoke: async () => {
      const response = await remote.handler(request());
      return response.ok ? { data: await response.json() } : { error: { context: response } };
    } });
    const controller = createAccountController({ ...h.api, getSession: async () => session }, () => {});
    await controller.load(); controller.requestDeletion();
    const offset = db.calls.length;
    const success = await controller.deleteAccount();
    assert.equal(success, !(options.remove || options.auth || options.throwAuth || options.cleanupError));
    assert.equal(db.calls.length, offset, 'account flow must issue no SQLite operations');
    assert.deepEqual((await db.api.getBackupSnapshot()).tables, before);
  }
});

test('installed Supabase SDK works with the public adapter and dispose; a new client has no session offline', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const values = new Map([['theme', 'dark']]);
  const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { values.set(k, v); }, removeItem: async k => { values.delete(k); } };
  const tracked = createAuthSessionStorage(storage);
  let requests = 0;
  // Auth-only integration: Realtime must never open a socket (also works on Node 20).
  class UnusedWebSocket { constructor() { throw new Error('Unexpected Realtime connection'); } }
  const options = adapter => ({ realtime: { transport: UnusedWebSocket }, auth: { storage: adapter, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async () => { requests++; return new Response(JSON.stringify(session.user), { status: 200, headers: { 'Content-Type': 'application/json' } }); } } });
  const client = createClient('https://example.supabase.co', 'publishable-test', options(tracked.adapter));
  const part = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const token = `${part({ alg: 'HS256' })}.${part({ sub: 'user-a', exp: Math.floor(Date.now() / 1000) + 3600 })}.${Buffer.from('test-signature').toString('base64url')}`;
  const signed = await client.auth.setSession({ access_token: token, refresh_token: 'refresh-test' });
  assert.equal(signed.error, null);
  assert.equal((await client.auth.getSession()).data.session.user.id, 'user-a');
  await tracked.clear(); await client.auth.dispose();
  // Deliberately exercise an old client after disposal: its writes stay isolated.
  await client.auth.setSession({ access_token: token, refresh_token: 'late-refresh' });
  assert.deepEqual([...values], [['theme', 'dark']]);
  const before = requests;
  const fresh = createClient('https://example.supabase.co', 'publishable-test', options(createAuthSessionStorage(storage).adapter));
  assert.equal((await fresh.auth.getSession()).data.session, null);
  assert.equal(requests, before);
  await fresh.auth.dispose();
});

test('delete confirmation is explicit, accessible and themed; busy disables both actions', async () => {
  const { createRequire } = await import('node:module'); const { default: vm } = await import('node:vm');
  const babel = createRequire(import.meta.url)('@babel/core');
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ActivityIndicator'].map(k => [k, k]));
  native.StyleSheet = { create: x => x };
  const load = path => loadDatabase(null, { entry: `../../src/${path}.js`, stubs: { 'react-native': native } });
  const themes = load('styles/themes').themes, styles = load('features/account/styles/accountStyles').default;
  const module = { exports: {} };
  const code = babel.transformSync(readFileSync(new URL('../src/features/account/components/DeleteAccountConfirmation.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  }).code;
  vm.runInNewContext(code, { module, exports: module.exports, require: () => native,
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) } });
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' ? [node, ...flatten(node.children)] : [];
  for (const name of Object.keys(themes)) for (const mode of ['light', 'dark']) for (const busy of [false, true]) {
    let confirmed = 0, canceled = 0;
    const nodes = flatten(module.exports.default({ busy, styles: styles(name, mode), onConfirm() { confirmed++; }, onCancel() { canceled++; } }));
    const texts = nodes.filter(n => n.type === 'Text').flatMap(n => n.children);
    assert.ok(texts.includes('Tus tareas y demás datos guardados en este dispositivo no se eliminarán.'));
    assert.ok(texts.includes('Esta acción no se puede deshacer.'));
    const buttons = nodes.filter(n => n.type === 'TouchableOpacity');
    assert.equal(buttons.length, 2);
    for (const button of buttons) { assert.equal(button.props.disabled, busy); assert.equal(button.props.accessibilityRole, 'button'); }
    assert.equal(buttons[1].props.style[0].backgroundColor, themes[name][mode].dangerBackground);
    if (!busy) { buttons[0].props.onPress(); buttons[1].props.onPress(); assert.equal(canceled, 1); assert.equal(confirmed, 1); }
  }
});

test('verification failures distinguish invalid identity from Auth outages and never start privileged work', async () => {
  for (const [options, status, code] of [
    [{ identity: { error: { status: 401 } } }, 401, 'ACCOUNT_AUTH_REQUIRED'],
    [{ identity: { error: { status: 403 } } }, 401, 'ACCOUNT_AUTH_REQUIRED'],
    [{ identity: { error: { code: 'user_not_found' } } }, 401, 'ACCOUNT_AUTH_REQUIRED'],
    [{ identity: { error: { status: 500 } } }, 503, 'ACCOUNT_AUTH_CHECK_FAILED'],
    [{ identity: { error: { status: 429 } } }, 503, 'ACCOUNT_AUTH_CHECK_FAILED'],
    [{ identity: { data: { user: null } } }, 503, 'ACCOUNT_AUTH_CHECK_FAILED'],
    [{ throwIdentity: new Error('network') }, 503, 'ACCOUNT_AUTH_CHECK_FAILED'],
  ]) {
    const h = server(options), response = await h.handler(request());
    assert.equal(response.status, status); assert.equal((await response.json()).code, code);
    assert.deepEqual(h.calls, [['verify', 'jwt']]);
  }
});

test('facade distinguishes missing deployment and gateway rejection, preserves original HTTP body, keeps unknown outcomes uncertain', async () => {
  for (const [status, body, code] of [
    [404, { code: 'NOT_FOUND', message: 'Requested function was not found' }, 'ACCOUNT_FUNCTION_NOT_DEPLOYED'],
    [401, { code: 401, message: 'Invalid JWT' }, 'ACCOUNT_FUNCTION_AUTH_FAILED'],
    [403, { message: 'Forbidden' }, 'ACCOUNT_FUNCTION_AUTH_FAILED'],
    [401, { code: 'ACCOUNT_AUTH_REQUIRED' }, 'ACCOUNT_AUTH_REQUIRED'],
    [503, { code: 'ACCOUNT_AUTH_CHECK_FAILED' }, 'ACCOUNT_AUTH_CHECK_FAILED'],
    [404, { message: 'unknown failure' }, 'ACCOUNT_DELETE_UNCONFIRMED'],
    [500, { message: 'internal error' }, 'ACCOUNT_DELETE_UNCONFIRMED'],
  ]) {
    const original = { context: new Response(JSON.stringify(body), { status }) };
    const h = facade({ response: { error: original } });
    await assert.rejects(h.api.deleteAccount('user-a'), e => e.code === code && e.httpStatus === status && e.cause === original);
    assert.deepEqual(await original.context.json(), body);
    assert.equal(h.calls.includes('clear'), false);
  }
});

test('facade itself prevents duplicate calls while network or cleanup is pending', async () => {
  const gate = defer(); const h = facade({ invoke: async () => { await gate.promise; return { data: { status: 'deleted' } }; } });
  const first = h.api.deleteAccount('user-a');
  await assert.rejects(h.api.deleteAccount('user-a'), e => e.code === 'ACCOUNT_DELETE_BUSY');
  gate.resolve(); await first;
  assert.equal(h.calls.filter(Array.isArray).length, 1);
});

test('failed cleanup waits for other removals; late reads and late writes cannot restore a retired session', async () => {
  const read = defer(), remove = defer();
  const h = createAuthSessionStorage({
    getItem: key => key === 'slow' ? read.promise : Promise.resolve('session'),
    removeItem: key => key === 'slow' ? remove.promise : Promise.reject(new Error('disk')),
  });
  const reading = h.adapter.getItem('slow'); await h.adapter.getItem('fails');
  let ended = false;
  const cleaning = h.clear().catch(error => { ended = true; return error; });
  read.resolve('late-session'); assert.equal(await reading, null);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ended, false, 'all removals must finish before a failed cleanup can be retried');
  remove.resolve(); assert.match((await cleaning).message, /disk/);
});
