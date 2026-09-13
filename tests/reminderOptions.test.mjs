import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const { getAvailableOptions, getSubtitle, persistentDescription, optionKey, resolveReminderOption } = loadDatabase(null, { entry: '../../src/features/tasks/domain/reminderOptions.js' });
const date = (day, hour = 0, minute = 0) => new Date(2026, 8, day, hour, minute);
const keys = (context, now) => Array.from(getAvailableOptions(context, now), optionKey);

test('missing or past nonrepeating date only allows clearing the reminder', () => {
  const now = date(13, 12);
  assert.deepEqual(keys({}, now), ['none']);
  assert.deepEqual(keys({ selectedDate: date(12) }, now), ['none']);
  assert.match(getSubtitle({}, now), /Selecciona una fecha/);
  assert.equal(resolveReminderOption({}, 'none', now).reminder, null);
});

test('a timed option that expires after rendering is rejected at selection', () => {
  const context = { selectedDate: date(13), selectedTime: date(13, 12) };
  const key = 'relative-5-minutes';
  assert.ok(keys(context, date(13, 11, 54)).includes(key));
  assert.equal(resolveReminderOption(context, key, date(13, 11, 55)).valid, false);
  assert.equal(resolveReminderOption(context, 'relative-0-minutes', date(13, 12)).valid, false);
});

test('after-hours uses click time and cannot cross the selected day', () => {
  const context = { selectedDate: date(13) };
  const now = date(13, 22, 59);
  const result = resolveReminderOption(context, 'after-1', now);
  assert.equal(result.valid, true);
  assert.equal(result.reminder.at, now.getTime() + 3600000);
  assert.equal(resolveReminderOption(context, 'after-1', date(13, 23, 1)).valid, false);
  assert.equal(resolveReminderOption(context, 'after-1', date(14, 0)).valid, false);
});

test('recurring tasks retain future-occurrence options even with a past anchor', () => {
  const context = { selectedDate: date(12), repeatMode: 'daily' };
  const now = date(13, 22);
  assert.ok(keys(context, now).includes('persistent-4-hours'));
  assert.ok(keys({ ...context, selectedTime: date(12, 9) }, now).includes('relative-60-minutes'));
  assert.match(persistentDescription(context, now), /Horarios habituales/);
});

test('today shows only remaining persistent times and removes exhausted option', () => {
  const context = { selectedDate: date(13) };
  assert.equal(persistentDescription(context, date(13, 13)), 'Hoy quedan: 17:00 · 21:00');
  assert.ok(!keys(context, date(13, 21)).includes('persistent-4-hours'));
  assert.match(persistentDescription({ selectedDate: date(14) }, date(13, 22)), /09:00/);
});
