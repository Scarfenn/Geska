import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const modules = new Map();
for (const path of ['components/TaskList', 'domain/taskSelectors', 'domain/taskDates', 'domain/recurrence']) {
  const source = await readFile(new URL(`../src/features/tasks/${path}.js`, import.meta.url), 'utf8');
  modules.set(`@/features/tasks/${path}`, babel.transformSync(source, {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  }).code);
}
function load(spec) {
  const module = { exports: {} };
  const localRequire = name => {
    if (modules.has(name)) return load(name);
    if (name === 'react-native') return Object.fromEntries(['FlatList', 'Text', 'TouchableWithoutFeedback', 'View'].map(n => [n, n]));
    if (name === 'react-native-reanimated') return {
      __esModule: true,
      default: { FlatList: 'Animated.FlatList' },
      LinearTransition: { duration: milliseconds => ({ milliseconds }) },
    };
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (name.endsWith('/themes')) return { themes: { basic: { light: {} } } };
    if (name.endsWith('Styles')) return () => ({ taskEmptyDescription: {} });
    if (name.endsWith('/TaskCard')) return 'TaskCard';
    throw new Error(`Unexpected import: ${name}`);
  };
  vm.runInNewContext(modules.get(spec), {
    Date, module, exports: module.exports, require: localRequire,
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  });
  return module.exports;
}
const TaskList = load('@/features/tasks/components/TaskList').default;
const { selectTasksForDay } = load('@/features/tasks/domain/taskSelectors');
function renderedTasks(tasks) {
  const tree = TaskList({ tasks, themeName: 'basic', mode: 'light' });
  return tree.children[0].children[0].props.data;
}
const ids = tasks => Array.from(renderedTasks(tasks), task => task.id);
const task = (id, overrides = {}) => ({ id, date: '2026-09-14', repeat_mode: 'none', done: false, time: null, categoryId: 'work', ...overrides });

test('pending tasks precede completed tasks, preserving chronological order and untimed tasks last in each group', () => {
  const tasks = Object.freeze([
    task('done-untimed', { done: true }),
    task('done-early', { done: 1, time: '07:00' }),
    task('pending-untimed'),
    task('pending-late', { time: '15:00' }),
    task('done-late', { done: true, time: '18:00' }),
    task('pending-early', { done: 0, time: '09:00' }),
  ].map(Object.freeze));
  const before = structuredClone(tasks);
  assert.deepEqual(ids(tasks), ['pending-early', 'pending-late', 'pending-untimed', 'done-early', 'done-late', 'done-untimed']);
  assert.deepEqual(tasks, before);
});

test('equal times and untimed tasks retain their incoming order within each completion group', () => {
  const tasks = [
    task('done-a', { done: true, time: '09:00' }), task('pending-a', { time: '09:00' }),
    task('done-b', { done: true, time: '09:00' }), task('pending-b', { time: '09:00' }),
    task('untimed-a'), task('untimed-b'), task('done-untimed-a', { done: true }), task('done-untimed-b', { done: true }),
  ];
  assert.deepEqual(ids(tasks), ['pending-a', 'pending-b', 'untimed-a', 'untimed-b', 'done-a', 'done-b', 'done-untimed-a', 'done-untimed-b']);
});

test('completing and reopening a task moves it between groups', () => {
  const tasks = [task('early', { time: '08:00' }), task('late', { time: '10:00' })];
  assert.deepEqual(ids(tasks), ['early', 'late']);
  tasks[0] = { ...tasks[0], done: true };
  assert.deepEqual(ids(tasks), ['late', 'early']);
  tasks[0] = { ...tasks[0], done: false };
  assert.deepEqual(ids(tasks), ['early', 'late']);
});

test('recurring tasks sort by the selected occurrence, ignoring global completion and other dates', () => {
  const tasks = [
    task('recurring', { repeat_mode: 'daily', done: true, time: '08:00', occurrences: [{ date: '2026-09-14', done: 1 }, { date: '2026-09-15', done: 0 }] }),
    task('pending', { repeat_mode: 'daily', time: '10:00' }),
    task('other-category', { categoryId: 'personal' }),
    task('other-day', { date: '2026-09-13' }),
  ];
  const before = structuredClone(tasks);
  const forDay = day => selectTasksForDay(tasks, new Date(2026, 8, day, 12), 'work');
  assert.deepEqual(ids(forDay(14)), ['pending', 'recurring']);
  assert.deepEqual(ids(forDay(15)), ['recurring', 'pending']);
  assert.deepEqual(ids(forDay(16)), ['recurring', 'pending']);
  assert.deepEqual(tasks, before);
});
