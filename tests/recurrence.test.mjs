import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// Load this dependency-free Expo module without changing the project's module type.
const source = await readFile(new URL('../src/features/tasks/domain/recurrence.js', import.meta.url), 'utf8');
const { occursOnDate, parseLocalDate } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const task = (overrides = {}) => ({ date: '2026-09-08', repeat_mode: 'none', ...overrides });

test('single tasks use the local calendar date and reject invalid dates', () => {
  assert.equal(occursOnDate(task(), new Date(2026, 8, 8, 23, 59)), true);
  assert.equal(occursOnDate(task(), '2026-09-09'), false);
  for (const date of ['2026-02-29', '2026-13-01', 'bad', null]) {
    assert.equal(parseLocalDate(date), null);
    assert.equal(occursOnDate(task(), date), false);
  }
  assert.equal(occursOnDate(task(), new Date(NaN)), false);
  assert.equal(occursOnDate(null, '2026-09-08'), false);
});

test('daily intervals cross months and years and never occur before the anchor', () => {
  const t = task({ date: '2026-12-30', repeat_mode: 'daily', repeat_interval: 3 });
  assert.equal(occursOnDate(t, '2026-12-27'), false);
  assert.equal(occursOnDate(t, '2026-12-30'), true);
  assert.equal(occursOnDate(t, '2026-12-31'), false);
  assert.equal(occursOnDate(t, '2027-01-02'), true);
});

test('weekly selected days use Monday-based interval weeks', () => {
  const t = task({ repeat_mode: 'weekly', repeat_interval: 2, repeat_days: 'L,M,D' });
  for (const [date, expected] of [
    ['2026-09-07', false], ['2026-09-08', true], ['2026-09-09', false],
    ['2026-09-13', true], ['2026-09-14', false], ['2026-09-15', false],
    ['2026-09-21', true], ['2026-09-22', true],
  ]) assert.equal(occursOnDate(t, date), expected, date);
  assert.equal(occursOnDate(task({ date: '2026-12-30', repeat_mode: 'weekly', repeat_interval: 2 }), '2027-01-13'), true);
});

test('legacy missing selections and intervals retain anchor defaults', () => {
  for (const interval of [undefined, null, 0, -1, 1.5, 'bad']) {
    assert.equal(occursOnDate(task({ repeat_mode: 'daily', repeat_interval: interval }), '2026-09-09'), true);
  }
  assert.equal(occursOnDate(task({ repeat_mode: 'weekly' }), '2026-09-15'), true);
  assert.equal(occursOnDate(task({ repeat_mode: 'weekly' }), '2026-09-14'), false);
  assert.equal(occursOnDate(task({ repeat_mode: 'monthly' }), '2026-10-08'), true);
});

test('monthly selected days skip missing days without shifting to month end', () => {
  const t = task({ date: '2026-01-31', repeat_mode: 'monthly', repeat_days: '15,31' });
  assert.equal(occursOnDate(t, '2026-01-15'), false);
  assert.equal(occursOnDate(t, '2026-02-15'), true);
  assert.equal(occursOnDate(t, '2026-02-28'), false);
  assert.equal(occursOnDate(t, '2026-03-31'), true);
  assert.equal(occursOnDate(t, '2026-04-30'), false);
});

test('monthly intervals support multiple days and yearly leap-day recurrence', () => {
  const t = task({ date: '2026-11-10', repeat_mode: 'monthly', repeat_interval: 2, repeat_days: [10, 20] });
  assert.equal(occursOnDate(t, '2026-12-20'), false);
  assert.equal(occursOnDate(t, '2027-01-20'), true);
  const yearly = task({ date: '2024-02-29', repeat_mode: 'monthly', repeat_interval: 12 });
  assert.equal(occursOnDate(yearly, '2025-02-28'), false);
  assert.equal(occursOnDate(yearly, '2024-03-29'), false);
  assert.equal(occursOnDate(yearly, '2028-02-29'), true);
});

test('calendar intervals remain stable across daylight-saving transitions', () => {
  for (const start of ['2026-09-05', '2026-04-04', '2026-03-07', '2026-10-31']) {
    const t = task({ date: start, repeat_mode: 'daily', repeat_interval: 2 });
    const anchor = parseLocalDate(start);
    for (let offset = 0; offset < 5; offset++) {
      const target = new Date(anchor);
      target.setDate(target.getDate() + offset);
      assert.equal(occursOnDate(t, target), offset % 2 === 0);
    }
  }
});

test('repeat_end remains reserved and evaluation does not mutate input', () => {
  const t = Object.freeze(task({ repeat_mode: 'daily', repeat_end: '2026-09-08' }));
  const date = new Date(2026, 8, 10, 15);
  const timestamp = date.getTime();
  assert.equal(occursOnDate(t, date), true);
  assert.equal(date.getTime(), timestamp);
  assert.equal(occursOnDate(task({ repeat_mode: 'unsupported' }), date), false);
});
