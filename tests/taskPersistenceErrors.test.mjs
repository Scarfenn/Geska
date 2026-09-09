import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const generate = require('@babel/generator').default;

// Exercise the real event callbacks; animation/native widgets are inert here.
function handler(modal, name, dependencies) {
  const source = readFileSync(new URL(`../src/features/tasks/modals/${modal}.js`, import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
  let callback;
  babel.traverse(ast, { VariableDeclarator(path) { if (path.node.id.name === name) callback = path.node.init; } });
  assert.ok(callback);
  return vm.runInNewContext(`(${generate(callback).code})`, { console: { error() {} }, ...dependencies });
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

for (const modal of ['TaskModal', 'CategoryModal', 'AddSubtaskModal']) {
  test(`${modal} waits for persistence and keeps its draft on failure`, async () => {
    let closes = 0, cleared = 0, alerts = 0;
    const pending = deferred();
    const save = handler(modal, 'handleSave', {
      taskText: 'Draft', selectedCategory: 'cat', categoryName: 'Draft category', categoryToEdit: null,
      draftSubtasks: [{ id: 'draft', text: 'Draft subtask' }],
      saveTask: () => pending.promise, saveCategory: () => pending.promise, onSave: () => pending.promise,
      animateClose: () => closes++, setCategoryName: () => cleared++, Alert: { alert: () => alerts++ },
    });
    const saving = save();
    assert.equal(closes, 0); assert.equal(cleared, 0);
    pending.reject(new Error('database failed')); await saving;
    assert.equal(alerts, 1); assert.equal(closes, 0); assert.equal(cleared, 0);
  });
}

test('category deletion failure does not close the modal or change the selected category', async () => {
  let closes = 0, selected = 'cat', alerts = 0;
  const remove = handler('CategoryModal', 'handleDelete', {
    categoryToEdit: { id: 'cat' }, selectedCategory: 'cat', setSelectedCategory: value => { selected = value; },
    deleteCategory: async () => { throw new Error('delete failed'); },
    closeModal: () => closes++, Alert: { alert: () => alerts++ },
  });
  await remove(); assert.equal(closes, 0); assert.equal(selected, 'cat'); assert.equal(alerts, 1);
});
