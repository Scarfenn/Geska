import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';

process.env.TZ = 'America/Santiago';
const { addCalendarDays, generateWeek, getWeekStart, isSameWeek } = loadDatabase(null, { entry: '../../src/features/tasks/domain/calendarDates.js' });
const { formatDateLocal } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDates.js' });

test('calendar navigation crosses month, year and leap-day boundaries without mutating input', () => {
  const date = new Date(2024, 1, 28, 12);
  assert.equal(formatDateLocal(addCalendarDays(date, 1)), '2024-02-29');
  assert.equal(formatDateLocal(addCalendarDays(date, 2)), '2024-03-01');
  assert.equal(formatDateLocal(addCalendarDays(new Date(2026, 11, 31), 1)), '2027-01-01');
  assert.equal(date.getDate(), 28);
  assert.equal(formatDateLocal(getWeekStart(new Date(2027, 0, 3))), '2026-12-28');
  assert.equal(isSameWeek(new Date(2026, 11, 31), new Date(2027, 0, 3)), true);
});

test('Santiago daylight saving transition retains all seven local dates', () => {
  const week = generateWeek(new Date(2026, 8, 6, 12));
  assert.deepEqual(Array.from(week, formatDateLocal), ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']);
  assert.equal(addCalendarDays(new Date(2026, 8, 5, 12), 1).getHours(), 12);
  assert.equal(getWeekStart(new Date(2026, 8, 6, 12)).getHours(), 0);
});

test('editing and saving a repetition end date preserves its local day', () => {
  const values = [];
  const { default: useTaskEditor } = loadDatabase(null, {
    entry: '../../src/features/tasks/hooks/useTaskEditor.js',
    stubs: { react: { useState(initial) {
      const index = values.length; values.push(initial);
      return [initial, value => { values[index] = value; }];
    } } },
  });
  const editor = useTaskEditor(null);
  editor.openModalEdit({ id: 'a', date: '2026-09-13', repeat_end: '2026-09-20' });
  const schedule = values.find(value => value?.selectedDate);
  assert.equal(formatDateLocal(schedule.endDate), '2026-09-20');
  assert.equal(schedule.endDate.getHours(), 0);
});

test('task date selection allows today but rejects past local dates, including DST transitions', () => {
  const { canSelectTaskDate, getMinimumTaskDate } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDates.js' });
  for (const now of [new Date(2026, 8, 6, 23), new Date(2026, 3, 5, 23)]) {
    const today = getMinimumTaskDate(now);
    assert.equal(canSelectTaskDate(today, now), true);
    assert.equal(canSelectTaskDate(addCalendarDays(today, -1), now), false);
    assert.equal(canSelectTaskDate(addCalendarDays(today, 1), now), true);
    assert.equal(now.getHours(), 23);
  }
  assert.equal(canSelectTaskDate(null), false);
  assert.equal(canSelectTaskDate(new Date(NaN)), false);
});

test('schedule date handler rejects past dates before dispatching any draft changes', () => {
  const calls = [];
  const { default: useScheduleDraft } = loadDatabase(null, {
    entry: '../../src/features/tasks/hooks/useScheduleDraft.js',
    stubs: { react: {
      useReducer(reducer, props, create) { return [create(props), action => calls.push(action)]; },
      useState(initial) { return [initial, () => {}]; },
    } },
  });
  const original = new Date(2020, 0, 1);
  const draft = useScheduleDraft({ selectedDate: original });
  assert.equal(draft.draftDate.getTime(), original.getTime(), 'opening does not rewrite an existing past task');
  draft.handleDateSelected(addCalendarDays(draft.minTaskDate, -1));
  assert.equal(calls.length, 0);
  draft.handleDateSelected(draft.minTaskDate);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].field, 'date');
});
