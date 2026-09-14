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
  assert.equal(repeatSummary('daily', 3, []), 'Cada 3 días, sin fecha de término.');
  assert.equal(repeatSummary('weekly', 2, ['J', 'L']), 'Cada 2 semanas, lunes y jueves, sin fecha de término.');
  assert.equal(repeatSummary('monthly', 1, ['31', '15']), 'Cada mes, los días 15 y 31, sin fecha de término.');
});


test('summaries include the inclusive local end date for every repetition frequency', () => {
  const end = new Date(2026, 10, 30, 23, 30);
  const original = end.getTime();
  assert.equal(repeatSummary('daily', 1, [], end), 'Todos los días, hasta el 30 de noviembre de 2026.');
  assert.equal(repeatSummary('weekly', 2, ['J', 'L'], end), 'Cada 2 semanas, lunes y jueves, hasta el 30 de noviembre de 2026.');
  assert.equal(repeatSummary('monthly', 1, ['15', '31'], end), 'Cada mes, los días 15 y 31, hasta el 30 de noviembre de 2026.');
  assert.equal(end.getTime(), original);
});

test('summary keeps validation and no-repetition messages instead of describing an invalid schedule', () => {
  assert.equal(repeatSummary('none', 1, [], new Date()), 'Esta tarea no se repite.');
  assert.equal(repeatSummary('daily', null, [], new Date()), 'Introduce un intervalo para ver la repetición.');
  assert.equal(repeatSummary('daily', 1, [], new Date(NaN)), 'Revisa la fecha de término.');
});
