import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const code = require('@babel/core').transformSync(readFileSync(new URL('../src/features/tasks/hooks/useTaskModalDraft.js', import.meta.url), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
function editor() {
  let cursor = 0;
  const slots = [], effects = [];
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i][j]))) { slots[i] = deps; effects.push(fn); } },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => react });
  return (task, category) => {
    cursor = 0; const result = module.exports.default(task, category);
    effects.splice(0).forEach(fn => fn()); return result;
  };
}

test('creating a category preserves text and subtasks in a new task', () => {
  const render = editor();
  const first = render(null, 'old');
  first.setTaskText('My draft'); first.setDraftSubtasks([{ id: 'new-1', text: 'Step', isNew: true }]);
  render(null, 'created');
  const result = render(null, 'created');
  assert.equal(result.selectedCategory, 'created');
  assert.equal(result.taskText, 'My draft');
  assert.equal(result.draftSubtasks[0].text, 'Step');
  result.setSelectedCategory(null); render(null, null);
  assert.equal(render(null, null).taskText, 'My draft');
  assert.equal(editor()(null, null).taskText, '');
});

test('edited tasks accept new categories without resetting draft from refreshed task props', () => {
  const task = { id: 'a', title: 'Original', categoryId: 'old', subtasks: [{ id: 1, text: 'Original step', done: true }] };
  const render = editor();
  render(task, null).setTaskText('Edited');
  render({ ...task }, 'created');
  const result = render({ ...task }, 'created');
  assert.equal(result.taskText, 'Edited'); assert.equal(result.selectedCategory, 'created');
  assert.equal(result.draftSubtasks[0].done, true);
  assert.notEqual(result.draftSubtasks[0], task.subtasks[0]);
  assert.equal(editor()(task, null).taskText, 'Original');
});
