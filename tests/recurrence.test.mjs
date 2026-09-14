import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

// Load this dependency-free Expo module without changing the project's module type.
const source = await readFile(new URL('../src/features/tasks/domain/recurrence.js', import.meta.url), 'utf8');
const { occursOnDate, parseLocalDate, getFirstOccurrence } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
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


const localDay = date => date && `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

test('first occurrence honors the anchor, selected weekdays and interval weeks', () => {
  for (const [overrides, expected] of [
    [{ repeat_mode: 'daily', repeat_interval: 99 }, '2026-09-08'],
    [{ repeat_mode: 'weekly', repeat_days: ['V'], repeat_interval: 2 }, '2026-09-11'],
    [{ repeat_mode: 'weekly', repeat_days: ['L'], repeat_interval: 2 }, '2026-09-21'],
    [{ date: '2026-12-31', repeat_mode: 'weekly', repeat_days: ['L'], repeat_interval: 2 }, '2027-01-11'],
    [{ repeat_mode: 'weekly', repeat_days: ['bad'] }, null],
  ]) assert.equal(localDay(getFirstOccurrence(task(overrides))), expected);
});

test('first monthly occurrence skips missing dates and respects leap years and interval phases', () => {
  for (const [overrides, expected] of [
    [{ date: '2026-04-01', repeat_days: ['31'] }, '2026-05-31'],
    [{ date: '2026-01-20', repeat_days: ['15'], repeat_interval: 2 }, '2026-03-15'],
    [{ date: '2025-02-01', repeat_days: ['29'], repeat_interval: 12 }, '2028-02-29'],
    [{ date: '2097-02-01', repeat_days: ['29'], repeat_interval: 12 }, '2104-02-29'],
    [{ date: '2026-02-01', repeat_days: ['31'], repeat_interval: 12 }, null],
    [{ date: '2026-02-01', repeat_days: ['31'], repeat_interval: 6 }, '2026-08-31'],
    [{ date: '2026-02-01', repeat_days: ['29', '15'], repeat_interval: 12 }, '2026-02-15'],
    [{ date: '2026-01-20', repeat_days: ['15'], repeat_interval: 4800 }, '2426-01-15'],
    [{ date: '2026-01-20', repeat_days: ['15'], repeat_interval: Number.MAX_SAFE_INTEGER }, null],
    [{ date: '2026-01-20', repeat_days: ['20'], repeat_interval: Number.MAX_SAFE_INTEGER }, '2026-01-20'],
  ]) assert.equal(localDay(getFirstOccurrence(task({ repeat_mode: 'monthly', ...overrides }))), expected);
});

test('first occurrence agrees with occursOnDate across calendar and DST boundaries', () => {
  for (const date of ['2026-09-05', '2026-04-04', '2024-02-28', '2026-12-31']) {
    for (const repeat_interval of [1, 2, 3, 12]) {
      for (const [repeat_mode, repeat_days] of [['weekly', ['L', 'V']], ['monthly', ['15', '31']]]) {
        const t = Object.freeze(task({ date, repeat_interval, repeat_mode, repeat_days: Object.freeze(repeat_days) }));
        let expected = parseLocalDate(date);
        for (let attempts = 0; attempts < 400 && !occursOnDate(t, expected); attempts++) {
          expected.setHours(12); expected.setDate(expected.getDate() + 1); expected.setHours(0);
        }
        assert.equal(occursOnDate(t, expected), true);
        const actual = getFirstOccurrence(t);
        assert.equal(localDay(actual), localDay(expected));
        assert.equal(occursOnDate(t, actual), true);
      }
    }
  }
});

test('first occurrence ignores an old end bound and returns null for invalid anchors', () => {
  assert.equal(getFirstOccurrence(task({ date: '2026-02-30' })), null);
  assert.equal(getFirstOccurrence(task({ repeat_mode: 'unsupported' })), null);
  assert.equal(localDay(getFirstOccurrence(task({ repeat_mode: 'weekly', repeat_days: ['V'], repeat_end: '2026-09-09' }))), '2026-09-11');
});

test('first repetition excludes the initial date without changing normal task occurrence semantics', () => {
  for (const [overrides, expected] of [
    [{ date: '2026-12-15', repeat_mode: 'monthly', repeat_days: ['15'], repeat_interval: 1 }, '2027-01-15'],
    [{ date: '2026-12-15', repeat_mode: 'monthly', repeat_days: ['15'], repeat_interval: 2 }, '2027-02-15'],
    [{ date: '2026-12-15', repeat_mode: 'monthly', repeat_days: ['15', '20'], repeat_interval: 2 }, '2026-12-20'],
    [{ date: '2026-12-15', repeat_mode: 'daily', repeat_interval: 3 }, '2026-12-18'],
    [{ date: '2026-12-15', repeat_mode: 'weekly', repeat_days: ['M'], repeat_interval: 2 }, '2026-12-29'],
    [{ date: '2026-12-15', repeat_mode: 'weekly', repeat_days: ['M', 'V'], repeat_interval: 2 }, '2026-12-18'],
    [{ date: '2026-01-31', repeat_mode: 'monthly', repeat_days: ['31'] }, '2026-03-31'],
    [{ date: '2024-02-29', repeat_mode: 'monthly', repeat_interval: 12 }, '2028-02-29'],
    [{ date: '2026-09-05', repeat_mode: 'daily' }, '2026-09-06'],
  ]) {
    const value = task(overrides);
    assert.equal(occursOnDate(value, value.date), true);
    assert.equal(localDay(getFirstOccurrence(value)), value.date);
    const next = getFirstOccurrence(value, { afterStart: true });
    assert.equal(localDay(next), expected);
    assert.equal(occursOnDate(value, next), true);
  }
});
