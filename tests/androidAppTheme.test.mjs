import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const { registerPackage } = require('../plugins/withAndroidAppTheme');

test('native package registration is idempotent and fails on unsupported templates', () => {
  const source = 'PackageList(this).packages.apply {\n // existing packages\n}';
  const result = registerPackage(source);
  assert.match(result, /add\(GeskaAppThemePackage\(\)\)/);
  assert.match(result, /existing packages/);
  assert.equal(registerPackage(result), result);
  assert.throws(() => registerPackage('unsupported'), /unsupported/);
});

function runHook({ mode = 'dark', enabled = true, os = 'android', missing = false, reject = false } = {}) {
  const calls = [], warnings = [];
  const source = readFileSync(new URL('../src/hooks/useAndroidAppTheme.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export default function', 'function');
  const context = {
    useEffect: callback => callback(), Platform: { OS: os }, __DEV__: true,
    NativeModules: missing ? {} : { GeskaAppTheme: { setMode: value => {
      calls.push(value);
      return reject ? Promise.reject(new Error('native failure')) : Promise.resolve();
    } } },
    console: { warn: (...args) => warnings.push(args) }, mode, enabled,
  };
  vm.runInNewContext(source + '\nuseAndroidAppTheme(mode, enabled);', context);
  return { calls, warnings };
}

test('synchronizes loaded light/dark preferences, never the loading default or other platforms', () => {
  for (const mode of ['light', 'dark']) assert.deepEqual(runHook({ mode }).calls, [mode]);
  assert.deepEqual(runHook({ enabled: false }).calls, []);
  assert.deepEqual(runHook({ os: 'ios' }).calls, []);
  assert.deepEqual(runHook({ os: 'web' }).calls, []);
});

test('old development builds and native errors do not crash startup', async () => {
  assert.equal(runHook({ missing: true }).warnings.length, 1);
  const result = runHook({ reject: true });
  await Promise.resolve();
  assert.equal(result.warnings.length, 1);
});
