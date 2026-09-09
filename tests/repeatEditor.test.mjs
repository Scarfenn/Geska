import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const source = await readFile(new URL('../src/features/tasks/domain/repeatEditor.js', import.meta.url), 'utf8');
const { parseInterval, editorDays, toggleRepeatDay, repeatSummary } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('interval accepts positive safe integers and rejects invalid drafts', () => {
  for (const value of ['', '0', '-1', '1.5', '1e3', 'abc', null, '9007199254740992']) assert.equal(parseInterval(value), null);
  assert.equal(parseInterval('002'), 2);
  assert.equal(parseInterval(12), 12);
});

test('legacy empty selections show the anchor day and invalid days are removed', () => {
  const date = new Date(2026, 8, 8);
  assert.deepEqual(editorDays('weekly', [], date), ['M']);
  assert.deepEqual(editorDays('monthly', [], date), ['8']);
  assert.deepEqual(editorDays('weekly', ['V', 'bad', 'L', 'L'], date), ['L', 'V']);
  assert.deepEqual(editorDays('monthly', [31, '15', '32'], date), ['15', '31']);
});

test('last selected day stays selected without mutating the draft', () => {
  const days = Object.freeze(['M']);
  assert.deepEqual(toggleRepeatDay(days, 'M'), ['M']);
  assert.deepEqual(toggleRepeatDay(days, 'J'), ['M', 'J']);
  assert.deepEqual(toggleRepeatDay(['M', 'J'], 'M'), ['J']);
});

test('summaries describe the actual interval and sort the selected days', () => {
  assert.equal(repeatSummary('none', null, []), 'Esta tarea no se repite.');
  assert.equal(repeatSummary('daily', 3, []), 'Cada 3 días.');
  assert.equal(repeatSummary('weekly', 2, ['J', 'L']), 'Cada 2 semanas, lunes y jueves.');
  assert.equal(repeatSummary('monthly', 1, ['31', '15']), 'Cada mes, los días 15 y 31.');
});
