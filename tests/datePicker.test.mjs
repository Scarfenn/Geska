import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';

process.env.TZ = 'America/Santiago';
const { monthCells, calendarDate, initialCalendarMonth, isDateSelectable, monthHasSelectableDate, yearHasSelectableDate } = loadDatabase(null, { entry: '../../src/features/tasks/domain/datePicker.js' });
const { formatDateLocal } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDates.js' });

test('six Monday-first rows contain each day exactly once, including leap years and Sunday starts', () => {
  for (const [year, month, length, offset] of [[2024, 1, 29, 3], [2025, 1, 28, 5], [2026, 1, 28, 6], [2026, 8, 30, 1], [2026, 10, 30, 6]]) {
    const cells = monthCells(year, month);
    assert.equal(cells.length, 42);
    assert.equal(cells.findIndex(Boolean), offset);
    assert.deepEqual(Array.from(cells.filter(Boolean), date => date.getDate()), Array.from({ length }, (_, i) => i + 1));
    assert.ok(cells.filter(Boolean).every(date => date.getMonth() === month && date.getFullYear() === year));
  }
});

test('month arithmetic crosses years and Santiago daylight saving without dropping calendar days', () => {
  assert.equal(formatDateLocal(calendarDate(2026, 12)), '2027-01-01');
  assert.equal(formatDateLocal(calendarDate(2026, -1)), '2025-12-01');
  assert.equal(calendarDate(99, 0).getFullYear(), 99);
  for (const month of [3, 8]) {
    const dates = monthCells(2026, month).filter(Boolean);
    const unique = new Set(Array.from(dates, formatDateLocal));
    assert.equal(unique.size, dates.length);
    assert.ok(Array.from(dates).every((date, i) => date.getDate() === i + 1));
  }
});

test('limits compare local dates inclusively, irrespective of hours', () => {
  const min = new Date(2026, 8, 6, 23, 30);
  const max = new Date(2026, 8, 15, 1);
  assert.equal(isDateSelectable(calendarDate(2026, 8, 6), min, max), true);
  assert.equal(isDateSelectable(new Date(2026, 8, 15, 23), min, max), true);
  assert.equal(isDateSelectable(calendarDate(2026, 8, 5), min, max), false);
  assert.equal(isDateSelectable(calendarDate(2026, 8, 16), min, max), false);
  assert.equal(isDateSelectable(new Date(NaN), min, max), false);
  assert.equal(monthHasSelectableDate(2026, 7, min, max), false);
  assert.equal(monthHasSelectableDate(2026, 8, min, max), true);
  assert.equal(monthHasSelectableDate(2026, 9, min, max), false);
  assert.equal(yearHasSelectableDate(2027, min, max), false);
  assert.equal(monthHasSelectableDate(2026, 8, max, min), false);
});

test('opening prioritizes selection, then initial date, then today, and clamps browsing to bounds', () => {
  const selected = new Date(2026, 6, 20, 15);
  const initial = new Date(2026, 7, 10);
  const today = new Date(2026, 8, 14);
  const before = selected.getTime();
  const month = (...args) => formatDateLocal(initialCalendarMonth(...args));
  assert.equal(month(selected, initial, null, null, today), '2026-07-01');
  assert.equal(month(null, initial, null, null, today), '2026-08-01');
  assert.equal(month(null, null, null, null, today), '2026-09-01');
  assert.equal(month(selected, null, initial, null, today), '2026-08-01');
  assert.equal(month(today, null, null, initial, today), '2026-08-01');
  assert.equal(selected.getTime(), before);
});
