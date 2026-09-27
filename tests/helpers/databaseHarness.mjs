import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const compiled = new Map();

export function createDatabaseLoader(db, { stubs = {}, globals = {} } = {}) {
  const cache = new Map();
  function load(url) {
    if (cache.has(url.href)) return cache.get(url.href).exports;
    const module = { exports: {} }; cache.set(url.href, module);
    if (!compiled.has(url.href)) compiled.set(url.href, babel.transformSync(readFileSync(url, 'utf8'), {
      configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code);
    vm.runInNewContext(compiled.get(url.href), {
      ...globals, module, exports: module.exports, Date, console,
      require(spec) {
        if (spec in stubs) return stubs[spec];
        if (spec === 'expo-sqlite') return { openDatabaseSync: () => db };
        if (spec.startsWith('@/')) return load(new URL('../../src/' + spec.slice(2) + '.js', import.meta.url));
        if (!spec.startsWith('.')) throw new Error(`Unexpected dependency: ${spec}`);
        return load(new URL(spec + '.js', url));
      },
    });
    return module.exports;
  }
  return entry => load(new URL(entry, import.meta.url));
}

export function loadDatabase(db, { entry = "../../src/storage/database.js", stubs = {}, globals = {} } = {}) {
  return createDatabaseLoader(db, { stubs, globals })(entry);
}

export function databaseHarness(t, { stubs = {} } = {}) {
  const child = spawn('python3', [new URL('sqlite_bridge.py', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = []; let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  const rejectPending = error => pending.splice(0).forEach(item => item.reject(error));
  child.on('error', rejectPending);
  child.on('exit', code => rejectPending(new Error(`SQLite bridge exited (${code}): ${stderr}`)));
  createInterface({ input: child.stdout }).on('line', line => {
    const response = JSON.parse(line), item = pending.shift();
    if (response.error) item.reject(new Error(response.error)); else item.resolve(response.result);
  });
  t.after(() => child.stdin.end());
  const calls = []; let intercept = () => {};
  const db = {};
  for (const method of ['execAsync', 'runAsync', 'getAllAsync', 'getFirstAsync']) {
    db[method] = async (sql, params = []) => {
      calls.push({ method, sql, params });
      await intercept(method, sql, params);
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
        child.stdin.write(JSON.stringify({ method, sql, params }) + '\n');
      });
    };
  }
  // Same transaction semantics as the installed expo-sqlite implementation.
  db.withTransactionAsync = async operation => {
    try {
      await db.execAsync('BEGIN'); await operation(); await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK'); throw error;
    }
  };
  const load = createDatabaseLoader(db, { stubs });
  return { db, load, api: load("../../src/storage/database.js"), calls, intercept(fn) { intercept = fn; } };
}
