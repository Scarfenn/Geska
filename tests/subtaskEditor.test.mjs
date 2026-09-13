import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const code = require('@babel/core').transformSync(readFileSync(new URL('../src/features/tasks/hooks/useSubtaskDraft.js', import.meta.url), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
function editor(rows) {
  let cursor = 0;
  const slots = [];
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useCallback(fn) { const i = cursor++; return slots[i] ||= fn; },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => react });
  return () => { cursor = 0; return module.exports.default(rows); };
}

test('editing and reopening retain completion and new identities without mutating input', () => {
  const rows = [{ id: 'new-1', text: 'Draft', isNew: true, done: true }];
  const render = editor(rows);
  render().updateText('new-1', 'Changed');
  assert.equal(render().draftSubtasks[0].text, 'Changed');
  assert.equal(render().draftSubtasks[0].isNew, true);
  assert.equal(render().draftSubtasks[0].done, true);
  assert.equal(rows[0].text, 'Draft');
  assert.equal(editor(rows)().draftSubtasks[0].text, 'Draft');
});

test('insert follows identity after reorder; focus waits for the input to mount', () => {
  const render = editor([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]);
  render().setDraftSubtasks([...render().draftSubtasks].reverse());
  render().insertAfter('b');
  const rows = render().draftSubtasks;
  assert.equal(rows[0].id, 'b'); assert.equal(rows[2].id, 'a');
  const id = rows[1].id;
  let focused = 0;
  render().registerInput(id, { focus() { focused++; } });
  render().registerInput(id, null);
  render().registerInput(id, { focus() { focused++; } });
  assert.equal(focused, 1);
  render().removeDraft(id);
  assert.equal(render().draftSubtasks.length, 2);
});

test('blank submit does not insert; deleting all rows permits adding a fresh row', () => {
  const render = editor([]);
  const id = render().draftSubtasks[0].id;
  render().handleSubmitEditing(id);
  assert.equal(render().draftSubtasks.length, 1);
  render().removeDraft(id);
  assert.equal(render().draftSubtasks.length, 0);
  render().insertAfter();
  assert.equal(render().draftSubtasks.length, 1);
  assert.notEqual(render().draftSubtasks[0].id, id);
});
