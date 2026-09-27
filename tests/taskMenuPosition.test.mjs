import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const source = await readFile(new URL('../src/features/tasks/domain/taskMenuPosition.js', import.meta.url), 'utf8');
const { taskMenuPosition } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const viewport = { x: 0, y: 24, width: 360, height: 720 };
const insets = { top: 24, bottom: 24 };
const size = { width: 220, height: 110 };
test('menu uses modal-local coordinates below the selected card', () => {
  const p = taskMenuPosition({ x: 10, y: 100, height: 60 }, viewport, size, insets);
  // Modal-local top: 100 - 24 + 60 + the intentional 28-point gap.
  assert.equal(p.left, 42); assert.equal(p.top, 164);
});
test('last card stays near its bottom edge and shifts only enough to fit', () => {
  const p = taskMenuPosition({ x: 200, y: 680, height: 60 }, viewport, size, insets);
  assert.equal(p.left, 132); assert.equal(p.top, 578);
  assert.ok(p.top + size.height <= viewport.height - insets.bottom - 8);
});
test('oversized menu is constrained to safe area on small screens', () => {
  const p = taskMenuPosition({ x: -20, y: 0, height: 60 }, { x: 0, y: 0, width: 180, height: 240 }, { width: 300, height: 400 }, insets);
  assert.equal(p.maxWidth, 164); assert.equal(p.maxHeight, 184);
  assert.equal(p.top, 24); assert.equal(p.left, 8);
});
