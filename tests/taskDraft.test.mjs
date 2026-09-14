import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const { prepareTaskDraft, normalizeSubtaskDraft, occurrenceDate } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDraft.js' });
const draft = () => ({ text: ' Task ', categoryId: 'cat', schedule: {
  selectedDate: new Date(2026, 8, 9), selectedTime: new Date(2026, 8, 9, 10, 30),
  repeatMode: 'weekly', repeatDays: ['L', 'L', 'V'], repeatInterval: 2, endDate: null,
  reminder: { type: 'relative', value: 15, unit: 'minutes' },
}, subtasks: [{ id: 3, text: ' Existing ', done: false, sort_order: 20 }, { text: '  ' }, { text: ' New ' }] });

test('draft conversion is pure and only emits editable fields and ordered subtask text', () => {
  const value = { ...draft(), id: 'injected', done: false, notification_ids: ['injected'] };
  const before = JSON.stringify(value); const result = prepareTaskDraft(value);
  assert.equal(JSON.stringify(value), before);
  assert.equal(result.fields.title, 'Task'); assert.equal(result.fields.time, '10:30');
  assert.equal(result.fields.date, '2026-09-09'); assert.equal(result.fields.repeat_days, 'L,V');
  assert.equal(result.fields.reminder_minutes, 15);
  for (const field of ['id', 'done', 'notification_ids', 'description']) assert.equal(field in result.fields, false);
  assert.deepEqual(Array.from(result.subtasks, s => s.sort_order), [0, 1]);
  assert.equal(result.subtasks[0].id, '3'); assert.equal(result.subtasks[0].done, undefined);
  assert.equal(result.subtasks[1].isNew, true);
});

test('invalid titles, dates, intervals, repetition and reminders are rejected before persistence', () => {
  for (const change of [
    value => { value.text = ' '; },
    value => { value.schedule.selectedDate = new Date(NaN); },
    value => { value.schedule.repeatInterval = 0; },
    value => { value.schedule.repeatDays = ['bad']; },
    value => { value.schedule.reminder.value = -1; },
    value => { value.schedule.selectedTime = null; },
    value => { value.schedule.reminder = { type: 'after', at: NaN }; },
  ]) {
    const value = draft(); change(value);
    assert.throws(() => prepareTaskDraft(value), error => error.code === 'INVALID_TASK_DRAFT');
  }
  assert.throws(() => normalizeSubtaskDraft([{ id: 'a', text: 'A' }, { id: 'a', text: 'Duplicate' }]), /duplicada/);
  assert.equal(occurrenceDate(new Date(2026, 8, 9, 23)), '2026-09-09');
  assert.throws(() => occurrenceDate('2026-02-30'), /inválida/);
});

test('saving revalidates the end against the actual first occurrence', () => {
  const value = draft();
  value.schedule.repeatDays = ['L'];
  value.schedule.repeatInterval = 2;
  value.schedule.endDate = new Date(2026, 8, 20);
  assert.throws(() => prepareTaskDraft(value), error => error.code === 'INVALID_TASK_DRAFT' && /primera repetición/.test(error.message));
  value.schedule.endDate = new Date(2026, 8, 21);
  assert.equal(prepareTaskDraft(value).fields.repeat_end, '2026-09-21');
  value.schedule.selectedDate = new Date(2026, 8, 22);
  assert.throws(() => prepareTaskDraft(value), /primera repetición/);
  value.schedule.endDate = null;
  assert.equal(prepareTaskDraft(value).fields.repeat_end, null);
});

test('saving rejects a recurrence with no possible dates before persistence', () => {
  const value = draft();
  Object.assign(value.schedule, { selectedDate: new Date(2026, 1, 1), repeatMode: 'monthly', repeatDays: ['31'], repeatInterval: 12 });
  assert.throws(() => prepareTaskDraft(value), error => error.code === 'INVALID_TASK_DRAFT' && /ninguna ocurrencia/.test(error.message));
});

test('monthly December 15 draft requires an end on or after January 15 at save time', () => {
  const value = draft();
  Object.assign(value.schedule, { selectedDate: new Date(2026, 11, 15), repeatMode: 'monthly', repeatDays: ['15'], repeatInterval: 1 });
  for (const end of [new Date(2026, 11, 15), new Date(2027, 0, 14)]) {
    value.schedule.endDate = end;
    assert.throws(() => prepareTaskDraft(value), /primera repetición/);
  }
  value.schedule.endDate = new Date(2027, 0, 15);
  assert.equal(prepareTaskDraft(value).fields.repeat_end, '2027-01-15');
});
