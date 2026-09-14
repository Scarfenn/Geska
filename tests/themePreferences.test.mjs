import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const { createThemePreferencesStore, validateThemePreferences } = loadDatabase(null, { entry: '../../src/services/themePreferences.js' });
const plain = value => JSON.parse(JSON.stringify(value));

test('missing and invalid preferences resolve to available themes', async () => {
  for (const value of [null, '', 'missing', '__proto__']) {
    assert.deepEqual(plain(validateThemePreferences(value, 'invalid')), { themeName: 'basic', mode: 'light' });
  }
  const store = createThemePreferencesStore({ multiGet: async () => [['themeName', 'basic'], ['mode', 'dark']] });
  assert.deepEqual(plain(await store.load()), { themeName: 'basic', mode: 'dark' });
});

test('read errors finish loading with defaults without writing over stored preferences', async () => {
  let errors = 0, writes = 0;
  const store = createThemePreferencesStore({ multiGet: async () => { throw new Error('read failed'); }, multiSet: () => writes++ }, () => errors++);
  assert.deepEqual(plain(await store.load()), { themeName: 'basic', mode: 'light' });
  assert.equal(errors, 1); assert.equal(writes, 0);
});

test('writes serialize and continue after failure, leaving the latest selection last', async () => {
  let release, errors = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const calls = [];
  const store = createThemePreferencesStore({ multiSet: async entries => {
    calls.push(plain(entries));
    if (calls.length === 1) { await gate; throw new Error('write failed'); }
  } }, () => errors++);
  const first = store.save({ themeName: 'basic', mode: 'dark' });
  const last = store.save({ themeName: 'basic', mode: 'light' });
  await Promise.resolve();
  assert.equal(calls.length, 1);
  release(); await first; await last;
  assert.equal(errors, 1); assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], [['themeName', 'basic'], ['mode', 'light']]);
});
