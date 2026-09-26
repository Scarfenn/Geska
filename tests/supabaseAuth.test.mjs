import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { databaseHarness, loadDatabase } from './helpers/databaseHarness.mjs';
const require = createRequire(import.meta.url);

function clientHarness(env = {}) {
  const calls = [], storage = {}, client = {};
  const module = { exports: {} };
  const code = require('@babel/core').transformSync(readFileSync(new URL('../src/storage/supabase/client.js', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, {
    module, exports: module.exports, process: { env },
    require(name) {
      if (name === 'react-native-url-polyfill/auto') return {};
      if (name === '@react-native-async-storage/async-storage') return storage;
      if (name === '@supabase/supabase-js') return { createClient(...args) { calls.push(args); return client; } };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { ...module.exports, calls, storage, client, env };
}
function authHarness(getSupabaseClient) {
  return loadDatabase(null, { entry: '../../src/storage/supabase/auth.js', stubs: {
    '@/storage/supabase/client': { getSupabaseClient },
  } });
}
const operations = [
  ['signUpWithEmail', 'signUp', ['test@example.com', ' fake password ']],
  ['signInWithEmail', 'signInWithPassword', ['test@example.com', ' fake password ']],
  ['getSession', 'getSession', []], ['getUser', 'getUser', []], ['signOut', 'signOut', []],
];

test('client stays lazy with configuration present and is created once with AsyncStorage Auth', () => {
  const h = clientHarness({ EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key' });
  assert.equal(h.calls.length, 0);
  assert.equal(h.getSupabaseClient(), h.client);
  assert.equal(h.getSupabaseClient(), h.client);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], h.env.EXPO_PUBLIC_SUPABASE_URL);
  assert.equal(h.calls[0][1], h.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  assert.deepEqual({ ...h.calls[0][2].auth }, {
    storage: h.storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
  });
});

test('missing or blank configuration returns null without creating a client', () => {
  for (const env of [{}, { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' },
    { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key' },
    { EXPO_PUBLIC_SUPABASE_URL: ' ', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key' }]) {
    const h = clientHarness(env);
    assert.equal(h.getSupabaseClient(), null);
    assert.equal(h.calls.length, 0);
  }
});

test('all Auth operations explicitly reject missing configuration; importing Auth is lazy', async () => {
  let calls = 0;
  const api = authHarness(() => { calls++; return null; });
  assert.equal(calls, 0);
  for (const [name, , args] of operations) {
    await assert.rejects(api[name](...args), error => error.code === 'SUPABASE_NOT_CONFIGURED');
  }
});

test('Auth delegates credentials unchanged, returns SDK data, and signs out only this session', async () => {
  const data = { user: { id: 'user' }, session: { access_token: 'test-token' } };
  const calls = [];
  const auth = Object.fromEntries(operations.map(([, method]) => [method, async (...args) => {
    calls.push({ method, args }); return { data, error: null };
  }]));
  const api = authHarness(() => ({ auth }));
  for (const [name, method, args] of operations) {
    const result = await api[name](...args);
    assert.equal(result, name === 'getSession' ? data.session : name === 'getUser' ? data.user : name === 'signOut' ? undefined : data);
    const expected = args.length ? [{ email: args[0], password: args[1] }] : name === 'signOut' ? [{ scope: 'local' }] : [];
    assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), { method, args: expected });
  }
});

test('Auth preserves SDK errors and transport failures; signup without a session is supported', async () => {
  for (const [name, method, args] of operations) {
    const error = new Error('Auth failed'); error.code = 'test_error';
    for (const fail of [async () => ({ data: null, error }), async () => { throw error; }]) {
      const api = authHarness(() => ({ auth: { [method]: fail } }));
      await assert.rejects(api[name](...args), e => e === error);
    }
  }
  const data = { user: { id: 'pending' }, session: null };
  const api = authHarness(() => ({ auth: {
    signUp: async () => ({ data, error: null }), getSession: async () => ({ data: { session: null }, error: null }),
  } }));
  assert.equal(await api.signUpWithEmail('test@example.com', 'password'), data);
  assert.equal(await api.getSession(), null);
});

test('local tasks and backups work after an unconfigured Auth failure without importing Supabase', async t => {
  const client = clientHarness();
  await assert.rejects(authHarness(client.getSupabaseClient).getSession(), e => e.code === 'SUPABASE_NOT_CONFIGURED');
  // The DB loader rejects any Supabase/AsyncStorage import, detecting coupling.
  const h = databaseHarness(t);
  await h.api.saveTask({ id: 'offline', title: 'Local' });
  assert.equal((await h.api.getAllTasks())[0].title, 'Local');
  await h.api.updateTask({ id: 'offline', title: 'Edited' });
  assert.equal((await h.api.getBackupSnapshot()).tables.tasks[0].title, 'Edited');
  await h.api.deleteTask('offline');
  assert.equal((await h.api.getAllTasks()).length, 0);
  assert.equal(client.calls.length, 0);
});
