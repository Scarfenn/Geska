import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const root = new URL('../src/features/tasks/', import.meta.url);
const modulePaths = [
  'TasksScreen.js', 'hooks/useTasksData.js', 'hooks/useTaskEditor.js', 'hooks/useTaskActions.js',
  'domain/taskDates.js', 'domain/taskSelectors.js', 'domain/recurrence.js',
  'services/taskMutations.js', 'services/subtaskMutations.js', 'services/taskCommands.js', 'domain/taskDraft.js', 'services/reminderModel.js',
  'components/CategoryBar.js', 'components/TasksModals.js',
];
const modules = new Map(await Promise.all(modulePaths.map(async path => {
  const source = await readFile(new URL(path, root), 'utf8');
  return [new URL(path, root).pathname, babel.transformSync(source, {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  }).code];
})));
function loadModule(path, context, cache = new Map()) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const localRequire = spec => {
    const resolved = spec.startsWith('@/') ? new URL('../src/' + spec.slice(2) + '.js', import.meta.url).pathname
      : spec.startsWith('.') ? new URL(spec + '.js', 'file://' + path).pathname : '';
    if (modules.has(resolved)) return loadModule(resolved, context, cache);
    if (spec === 'react') return context;
    if (spec === 'react-native') return { ...Object.fromEntries(['Text', 'View', 'TouchableOpacity', 'StatusBar', 'ActivityIndicator', 'ScrollView'].map(n => [n, n])), DeviceEventEmitter: context.DeviceEventEmitter, Alert: context.Alert };
    if (spec.includes('safe-area')) return { SafeAreaView: 'SafeAreaView' };
    if (spec.includes('vector-icons')) return { Ionicons: 'Ionicons' };
    if (spec.endsWith('/styles')) return context.createStyles;
    if (spec.endsWith('/themes')) return { themes: context.themes };
    if (spec.includes('/components/') || spec.includes('/modals/')) return spec.split('/').at(-1);
    return context;
  };
  vm.runInNewContext(modules.get(path), { ...context, module, exports: module.exports, require: localRequire });
  return module.exports;
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise((resolve) => setImmediate(resolve));
const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const task = { id: '1', title: 'Demo', categoryId: 'work', date, repeat_mode: 'none', subtasks: [] };

// Execute the actual JSX with a deterministic hook harness. Native components
// remain inert: these are render-branch tests, not a device/React renderer.
function screen(overrides = {}) {
  let cursor = 0, tree; const slots = [], cleanups = [], effects = [], listeners = new Map();
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const context = { Date,
    React: { createElement: (type, props, ...children) => typeof type === 'function' ? type(props || {}) : ({ type, props: props || {}, children }) },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(current) { const i = cursor++; return slots[i] ||= { current }; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i], deps)) { slots[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
    createStyles: () => new Proxy({}, { get: () => ({ color: '#111111', backgroundColor: '#ffffff' }) }),
    themes: { basic: { light: {} } },
    DeviceEventEmitter: { addListener: (name, fn) => { listeners.set(name, fn); return { remove: () => listeners.delete(name) }; } },
    newTaskId: () => "new-task",
    initDB: async () => {}, getAllTasks: async () => [task], getAllCategories: async () => [{ id: 'work', name: 'Trabajo' }],
    syncTaskReminders: async () => {}, updateTask: async () => {}, updateTaskNotificationIds: async () => {}, Alert: { alert() {} }, console: { error() {} }, ...overrides,
  };
  context.reconcileTaskReminders ||= async (task, persist) => {
    const ids = await context.scheduleTaskReminders(task);
    await persist({ ...task, notification_ids: ids, notification_id: ids[0] ?? null });
    return { status: ids.length ? 'scheduled' : 'empty', ids };
  };
  const component = loadModule(new URL('TasksScreen.js', root).pathname, context).default;
  const render = (props = {}) => { cursor = 0; tree = component({ themeName: 'basic', mode: 'light', ...props }); effects.splice(0).forEach(fn => fn()); return tree; };
  const find = type => { const found = []; function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; if (node.type === type) found.push(node); node.children?.forEach(walk); } walk(tree); return found; };
  render();
  return { render, find, emit: () => listeners.get('tasks-updated')?.(), unmount: () => cleanups.forEach(fn => fn?.()) };
}

test('real JSX shows loading then categorized tasks even with notifications blocked', async () => {
  const sync = deferred(); const app = screen({ syncTaskReminders: () => sync.promise });
  assert.equal(app.find('ActivityIndicator').length, 1); assert.equal(app.find('TaskList').length, 0);
  await tick(); app.render();
  assert.equal(app.find('ActivityIndicator').length, 0);
  assert.equal(app.find('TaskList')[0].props.tasks[0].id, '1');
  sync.reject(new Error('notifications blocked')); await tick(); app.render();
  assert.equal(app.find('TaskList')[0].props.tasks.length, 1); app.unmount();
});

test('real JSX distinguishes failed startup from an empty database and retry recovers', async () => {
  let fail = true;
  const app = screen({ getAllTasks: async () => { if (fail) throw new Error('read failed'); return []; } });
  await tick(); app.render(); assert.equal(app.find('TaskList').length, 0);
  const retry = app.find('TouchableOpacity').find(node => node.children.some(child => child?.children?.includes('Reintentar')));
  assert.ok(retry); fail = false; await retry.props.onPress(); app.render();
  assert.equal(app.find('TaskList')[0].props.tasks.length, 0); app.unmount();
});

test('failed refresh after visible tasks keeps the list visible', async () => {
  let fail = false;
  const app = screen({ getAllTasks: async () => { if (fail) throw new Error('temporary read failure'); return [task]; } });
  await tick(); app.render(); assert.equal(app.find('TaskList').length, 1);
  fail = true; await app.emit(); app.render();
  assert.equal(app.find('TaskList').length, 1, 'cached tasks must not be replaced by the error view');
  assert.equal(app.find('TaskList')[0].props.tasks[0].id, '1'); app.unmount();
});

test('category read failure never looks like a genuinely empty day', async () => {
  const app = screen({ getAllCategories: async () => { throw new Error('category read failure'); } });
  await tick(); app.render();
  assert.equal(app.find('TaskList').length, 0);
  assert.ok(app.find('Text').some(node => node.props.accessibilityRole === 'alert'));
  app.unmount();
});

test('slow categories keep loading visible until the complete snapshot is ready', async () => {
  const cats = deferred(); const app = screen({ getAllCategories: () => cats.promise });
  await tick(); app.render(); assert.equal(app.find('ActivityIndicator').length, 1);
  cats.resolve([{ id: 'work', name: 'Trabajo' }]); await tick(); app.render();
  assert.equal(app.find('TaskList')[0].props.tasks.length, 1); app.unmount();
});

test('notification update reloads task completion without restarting the screen', async () => {
  let done = false;
  const app = screen({ getAllTasks: async () => [{ ...task, done }] });
  await tick(); app.render(); assert.equal(app.find('TaskList')[0].props.tasks[0].done, false);
  done = true; await app.emit(); app.render();
  assert.equal(app.find('TaskList')[0].props.tasks[0].done, true); app.unmount();
});

test('selected category survives refresh but resets to all if removed', async () => {
  let cats = [{ id: 'work', name: 'Trabajo' }];
  const app = screen({ getAllCategories: async () => cats, getAllTasks: async () => [task, { ...task, id: "2", categoryId: "other" }] });
  await tick(); app.render();
  const category = app.find('TouchableOpacity').find(node => node.children.some(child => child?.children?.includes('Trabajo')));
  category.props.onPress(); app.render();
  await app.emit(); app.render(); assert.equal(app.find('TaskList')[0].props.tasks.length, 1);
  cats = []; await app.emit(); app.render();
  assert.equal(app.find('TaskList')[0].props.tasks.length, 2); app.unmount();
});

test('failed post-notification refresh does not hide the first successful load', async () => {
  let reads = 0;
  const app = screen({ getAllTasks: async () => { if (++reads > 1) throw new Error('refresh failed'); return [task]; } });
  await tick(); app.render();
  assert.equal(app.find('TaskList')[0].props.tasks.length, 1);
  assert.ok(app.find('Text').some(node => node.props.accessibilityRole === 'alert'));
  app.unmount();
});

test('tasksVersion change triggers a refresh but unchanged props do not', async () => {
  let reads = 0;
  const app = screen({ getAllTasks: async () => { reads++; return [task]; } });
  await tick(); app.render(); const baseline = reads;
  app.render(); await tick(); assert.equal(reads, baseline);
  app.render({ tasksVersion: 2 }); await tick(); assert.equal(reads, baseline + 1);
  app.render({ tasksVersion: 2 }); await tick(); assert.equal(reads, baseline + 1); app.unmount();
});

test('retrying a failed refresh clears the alert and updates cached tasks', async () => {
  let fail = false, title = 'Demo';
  const app = screen({ getAllTasks: async () => { if (fail) throw new Error('transient failure'); return [{ ...task, title }]; } });
  await tick(); app.render(); fail = true; await app.emit(); app.render();
  const retry = app.find('TouchableOpacity').find(node => node.children.some(child => child?.children?.includes('Reintentar')));
  assert.ok(retry); fail = false; title = 'Updated'; await retry.props.onPress(); app.render();
  assert.equal(app.find('TaskList')[0].props.tasks[0].title, 'Updated');
  assert.equal(app.find('Text').filter(node => node.props.accessibilityRole === 'alert').length, 0); app.unmount();
});

test('new task saves the selected schedule, category, subtasks and reminder IDs', async () => {
  const saved = [], updated = [], subtasks = [];
  const app = screen({
    applyReminderToTask: value => value,
    createTaskWithSubtasks: async (value, drafts) => { saved.push(value); subtasks.push(...drafts); return { ...value, subtasks: drafts }; },
    addSubtask: async (...args) => subtasks.push(args),
    scheduleTaskReminders: async () => ['notification-1'],
    updateTask: async value => updated.push(value),
    updateTaskNotificationIds: async value => updated.push(value),
  });
  await tick(); app.render();
  app.find('TouchableOpacity').find(node => node.children.some(child => child?.props?.name === 'add' && child.props.size === 32)).props.onPress();
  app.render(); assert.equal(app.find('TaskModal')[0].props.visible, true);
  const selectedDate = new Date(2026, 8, 15);
  app.find('TimeModal')[0].props.onTimeSelected({ date: selectedDate, time: null, repeatMode: 'weekly', repeatDays: ['M'], repeatInterval: 2, reminder: null, endDate: null });
  app.render();
  app.find('TaskModal')[0].props.saveTask({ text: ' New task ', categoryId: 'work', subtasks: [{ text: ' First ' }] });
  await tick();
  assert.equal(saved[0].title, 'New task'); assert.equal(saved[0].date, '2026-09-15');
  assert.equal(saved[0].categoryId, 'work'); assert.equal(saved[0].repeat_interval, 2);
  assert.equal(saved[0].repeat_days, 'M'); assert.equal(subtasks[0].text, 'First');
  assert.equal(updated[0].notification_ids[0], 'notification-1'); app.unmount();
});

test('editing submits one aggregate draft and preserves task identity', async () => {
  const original = { ...task, notification_ids: ['old'], subtasks: [{ id: 'a', text: 'Before', sort_order: 0 }] };
  const calls = [], updates = [];
  const app = screen({
    getAllTasks: async () => [original],
    editTaskWithSubtasks: async (id, fields, drafts) => { calls.push({ id, fields, drafts }); return { ...original, ...fields }; },
    updateTaskNotificationIds: async value => updates.push(value),
    scheduleTaskReminders: async () => ['new'],
  });
  await tick(); app.render(); app.find('TaskList')[0].props.startEditTask(original); app.render();
  await app.find('TaskModal')[0].props.saveTask({ text: 'Edited', categoryId: 'work', subtasks: [{ id: 'a', text: 'After' }, { id: 'draft', isNew: true, text: 'New' }] });
  assert.equal(calls.length, 1); assert.equal(calls[0].id, original.id);
  assert.equal(calls[0].fields.title, 'Edited'); assert.equal(calls[0].fields.done, undefined);
  assert.equal(calls[0].drafts[0].text, 'After'); assert.equal(calls[0].drafts[1].sort_order, 1);
  assert.equal(updates[0].notification_ids[0], 'new'); app.unmount();
});

test('recurring completion writes the selected occurrence and reschedules the refreshed task', async () => {
  const recurring = { ...task, repeat_mode: 'daily', occurrences: [] };
  const writes = [], updated = [];
  const app = screen({
    getAllTasks: async () => [recurring],
    changeTaskCompletion: async (id, options) => { writes.push([id, options.date, options.done]); return { task: recurring, changed: true }; },
    scheduleTaskReminders: async () => ['rescheduled'],
    updateTask: async value => updated.push(value),
    updateTaskNotificationIds: async value => updated.push(value),
  });
  await tick(); app.render(); app.find('TaskList')[0].props.toggleTaskDone(task.id); await tick();
  assert.deepEqual(writes[0], [task.id, date, undefined]);
  assert.equal(updated[0].notification_ids[0], 'rescheduled'); app.unmount();
});

test('a category created from the task editor is selected in that editor', async () => {
  const app = screen({ addCategory: async name => ({ id: 'new-category', name }) });
  await tick(); app.render();
  app.find('TaskModal')[0].props.openAddCategoryModal(); app.render();
  assert.equal(app.find('CategoryModal')[0].props.visible, true);
  await app.find('CategoryModal')[0].props.saveCategory({ name: 'New category' }); app.render();
  assert.equal(app.find('TaskModal')[0].props.selectedCategoryForTask, 'new-category');
  assert.equal(app.find('CategoryModal')[0].props.visible, false); app.unmount();
});

test('task editor stays open when the persistence action rejects', async () => {
  const failure = new Error('database failed');
  const app = screen({ applyReminderToTask: value => value, createTaskWithSubtasks: async () => { throw failure; } });
  await tick(); app.render();
  app.find('TouchableOpacity').find(node => node.children.some(child => child?.props?.name === 'add' && child.props.size === 32)).props.onPress();
  app.render();
  await assert.rejects(app.find('TaskModal')[0].props.saveTask({ text: 'Draft', subtasks: [] }), e => e === failure);
  app.render(); assert.equal(app.find('TaskModal')[0].props.visible, true); app.unmount();
});

test('a reminder failure after saving warns without presenting the task save as failed', async () => {
  let saves = 0, warnings = 0;
  const app = screen({
    applyReminderToTask: value => value, createTaskWithSubtasks: async value => { saves++; return value; },
    reconcileTaskReminders: async () => { throw new Error('native scheduling failed'); },
    Alert: { alert: title => { assert.equal(title, 'Tarea guardada'); warnings++; } },
  });
  await tick(); app.render();
  app.find('TouchableOpacity').find(node => node.children.some(child => child?.props?.name === 'add' && child.props.size === 32)).props.onPress();
  app.render(); await app.find('TaskModal')[0].props.saveTask({ text: 'Saved task', subtasks: [] });
  app.render(); assert.equal(saves, 1); assert.equal(warnings, 1);
  assert.equal(app.find('TaskModal')[0].props.visible, false); app.unmount();
});

test('double save shares one in-flight command and exposes saving state until completion', async () => {
  const pending = deferred(); let saves = 0;
  const app = screen({
    createTaskWithSubtasks: async value => { saves++; await pending.promise; return value; },
    scheduleTaskReminders: async () => [],
  });
  await tick(); app.render();
  app.find('TouchableOpacity').find(node => node.children.some(child => child?.props?.name === 'add' && child.props.size === 32)).props.onPress();
  app.render(); const modal = app.find('TaskModal')[0];
  const a = modal.props.saveTask({ text: 'One task', subtasks: [] });
  const b = modal.props.saveTask({ text: 'One task', subtasks: [] });
  await tick(); app.render();
  assert.equal(saves, 1); assert.equal(app.find('TaskModal')[0].props.isSaving, true);
  pending.resolve(); await Promise.all([a, b]); app.render();
  assert.equal(app.find('TaskModal')[0].props.isSaving, false); app.unmount();
});
