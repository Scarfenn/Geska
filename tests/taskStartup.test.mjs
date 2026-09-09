import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const hook = await readFile(new URL('../src/features/tasks/hooks/useTasksData.js', import.meta.url), 'utf8');
const prefix = hook.slice(hook.indexOf('export default function useTasksData'), hook.lastIndexOf('return {'));
// Exercise the actual startup callbacks with controlled React state and I/O.
function mount(overrides = {}) {
  const state = [], effects = [];
  const task = { id: '1', categoryId: 'work' };
  const context = {
    useState(initial) { const i = state.length; state.push(initial); return [initial, (value) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef: (current) => ({ current }), useCallback: (fn) => fn,
    useEffect: (fn) => effects.push(fn), createStyles: () => ({}),
    initDB: async () => {}, getAllTasks: async () => [task],
    getAllCategories: async () => [{ id: 'work', name: 'Trabajo' }],
    syncTaskReminders: async () => {}, updateTask: async () => {},
    DeviceEventEmitter: { addListener: () => ({ remove() {} }) },
    console: { error() {} }, ...overrides,
  };
  const component = vm.runInNewContext(prefix.replace('export default ', '') + '\nreturn { loadTasks, setup };\n}; useTasksData', context);
  const callbacks = component({});
  const cleanup = effects[0]();
  effects[1]();
  return { state, callbacks, cleanup };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('categorized tasks are published while notification synchronization is pending', async () => {
  const sync = deferred(); let reads = 0;
  const { state, cleanup } = mount({ syncTaskReminders: () => sync.promise, getAllTasks: async () => { reads++; return [{ id: '1', categoryId: 'work' }]; } });
  await tick();
  assert.equal(reads, 1, 'no extra tasksVersion read on mount');
  assert.equal(state[0].length, 1);
  assert.equal(state[1].length, 2);
  assert.equal(state[2], 'all');
  assert.equal(state[3], false);
  sync.reject(new Error('notification failure'));
  await tick();
  assert.equal(state[0].length, 1);
  assert.equal(state[4], null);
  cleanup();
});

test('reads wait for initialization and initialization failure can be retried', async () => {
  const initialization = deferred(); let attempts = 0, reads = 0;
  const { state, callbacks, cleanup } = mount({
    initDB: () => ++attempts === 1 ? initialization.promise : Promise.resolve(),
    getAllTasks: async () => { reads++; return [{ id: '1' }]; },
  });
  await tick(); assert.equal(reads, 0);
  initialization.reject(new Error('database unavailable'));
  await tick(); assert.match(state[4], /No se pudieron cargar/);
  await callbacks.setup();
  assert.equal(state[4], null); assert.equal(state[0].length, 1);
  cleanup();
});

test('an older read cannot overwrite a newer result or update after unmount', async () => {
  const sync = deferred();
  let pending = null;
  const { state, callbacks, cleanup } = mount({ syncTaskReminders: () => sync.promise, getAllTasks: () => pending ? pending.promise : Promise.resolve([{ id: 'initial' }]) });
  await tick();
  const older = deferred(); pending = older; const oldRead = callbacks.loadTasks(); await tick();
  const newer = deferred(); pending = newer; const newRead = callbacks.loadTasks(); await tick();
  newer.resolve([{ id: 'new' }]); await newRead;
  older.resolve([]); await oldRead;
  assert.equal(state[0][0].id, 'new');
  const last = deferred(); pending = last; const lastRead = callbacks.loadTasks(); await tick(); cleanup();
  last.resolve([]); await lastRead; assert.equal(state[0][0].id, 'new');
  sync.resolve(); await tick();
});

const database = await readFile(new URL('../src/storage/database.js', import.meta.url), 'utf8');
test('SQLite initialization is shared by concurrent callers and retries after failure', async () => {
  const first = deferred(); let schemaCalls = 0;
  const db = {
    execAsync: async (sql) => { if (sql.includes('CREATE TABLE')) { schemaCalls++; if (schemaCalls === 1) await first.promise; } },
    getAllAsync: async () => [], runAsync: async () => {},
  };
  const init = vm.runInNewContext(database.replace(/^import .*;\n/gm, '').replace(/export /g, '') + '\ninitDB', {
    SQLite: { openDatabaseSync: () => db }, console: { log() {}, error() {} },
  });
  const a = init(), b = init(); assert.equal(a, b); assert.equal(schemaCalls, 1);
  first.reject(new Error('schema failure'));
  await assert.rejects(a); await assert.rejects(b);
  await init(); assert.equal(schemaCalls, 2);
  await init(); assert.equal(schemaCalls, 2);
});
