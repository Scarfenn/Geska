import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseHarness, loadDatabase } from './helpers/databaseHarness.mjs';
const { createAccountController } = loadDatabase(null, { entry: '../../src/features/account/services/accountController.js' });
const session = { user: { email: 'user@example.com' } };
const fields = { mode: 'signup', email: ' user@example.com ', password: 'password', confirmation: 'password' };
function harness(overrides = {}) {
  const calls = [], states = [];
  const auth = {
    getSession: async () => null,
    signUpWithEmail: async (...args) => { calls.push(args); return { session }; },
    signInWithEmail: async (...args) => { calls.push(args); return { session }; },
    signOut: async () => { calls.push('logout'); }, ...overrides,
  };
  return { controller: createAccountController(auth, s => states.push(s)), calls, states };
}

test('initial session is loading until resolved; null and existing session have distinct states', async () => {
  for (const value of [null, session]) {
    let resolve;
    const h = harness({ getSession: () => new Promise(r => { resolve = r; }) });
    assert.equal(h.controller.getState().status, 'loading');
    const loading = h.controller.load();
    assert.equal(h.controller.getState().status, 'loading');
    assert.equal(h.controller.getState().busy, true);
    resolve(value); await loading;
    assert.equal(h.controller.getState().status, value ? 'signed-in' : 'signed-out');
    assert.equal(h.controller.getState().session, value);
  }
});

test('signup awaiting confirmation never represents a user as signed in', async () => {
  const h = harness({ signUpWithEmail: async () => ({ user: session.user, session: null }) });
  await h.controller.load();
  assert.equal(await h.controller.submit(fields), true);
  assert.equal(h.controller.getState().status, 'signed-out');
  assert.equal(h.controller.getState().session, null);
  assert.match(h.controller.getState().message, /Revisa tu correo/);
});

for (const mode of ['signup', 'login']) {
  test(`${mode} establishes returned session and trims email without changing password`, async () => {
    const h = harness(); await h.controller.load();
    await h.controller.submit({ ...fields, mode, password: ' password ', confirmation: ' password ' });
    assert.equal(h.controller.getState().session, session);
    assert.equal(h.controller.getState().status, 'signed-in');
    assert.deepEqual(Array.from(h.calls[0]), ['user@example.com', ' password ']);
    assert.equal('password' in h.controller.getState(), false);
  });
  test(`${mode} keeps original error internally and displays a comprehensible message`, async () => {
    const error = Object.assign(new Error('sdk original'), { code: 'invalid_credentials' });
    const h = harness({ [mode === 'signup' ? 'signUpWithEmail' : 'signInWithEmail']: async () => { throw error; } });
    await h.controller.load(); await h.controller.submit({ ...fields, mode });
    assert.equal(h.controller.getState().error, error);
    assert.match(h.controller.getState().message, /correo o la contraseña/);
    assert.equal(h.controller.getState().status, 'signed-out');
    assert.equal(h.controller.getState().busy, false);
  });
}

test('validation prevents calls for missing fields and mismatched passwords', async () => {
  const h = harness(); await h.controller.load();
  for (const patch of [{ email: '' }, { password: '' }, { password: 'short' }, { confirmation: 'different' }]) {
    assert.equal(await h.controller.submit({ ...fields, ...patch }), false);
  }
  assert.match(h.controller.getState().message, /no coinciden/);
  assert.equal(h.calls.length, 0);
});

test('duplicate submissions are blocked synchronously before UI rerenders', async () => {
  let resolve, calls = 0;
  const h = harness({ signUpWithEmail: () => { calls++; return new Promise(r => { resolve = r; }); } });
  await h.controller.load();
  const first = h.controller.submit(fields);
  assert.equal(await h.controller.submit(fields), false);
  assert.equal(calls, 1);
  resolve({ session }); await first;
  assert.equal(h.controller.getState().busy, false);
});

test('configuration/network failures show an unavailable state with retry instead of login', async () => {
  let fail = true;
  const error = Object.assign(new Error('not configured'), { code: 'SUPABASE_NOT_CONFIGURED' });
  const h = harness({ getSession: async () => { if (fail) throw error; return null; } });
  await h.controller.load();
  assert.equal(h.controller.getState().status, 'unavailable');
  assert.equal(h.controller.getState().error, error);
  assert.match(h.controller.getState().message, /sin cuenta/);
  fail = false; await h.controller.load();
  assert.equal(h.controller.getState().status, 'signed-out');
});

test('logout preserves actual SQLite data, and logout failure preserves the displayed session', async t => {
  const db = databaseHarness(t);
  await db.api.saveTask({ id: 'local', title: 'Keep me' });
  const before = await db.api.getBackupSnapshot();
  const h = harness({ getSession: async () => session });
  await h.controller.load(); await h.controller.logout();
  assert.equal(h.controller.getState().status, 'signed-out');
  assert.equal(h.calls[0], 'logout');
  assert.deepEqual((await db.api.getBackupSnapshot()).tables, before.tables);
  const failed = harness({ getSession: async () => session, signOut: async () => { throw new Error('offline'); } });
  await failed.controller.load(); await failed.controller.logout();
  assert.equal(failed.controller.getState().session, session);
  assert.equal(failed.controller.getState().status, 'signed-in');
});
