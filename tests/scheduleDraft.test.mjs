import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const load = async name => {
  const source = await readFile(new URL(`../src/features/tasks/domain/${name}.js`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
};
const { loadDatabase } = await import('./helpers/databaseHarness.mjs');
const { createScheduleDraft, scheduleDraftReducer: reduce } = loadDatabase(null, { entry: '../../src/features/tasks/domain/scheduleDraft.js' });
const { formatRepeatLabel, formatHumanDate, formatHumanTime } = await load('scheduleLabels');

test('draft owns its dates and collections; reopening discards cancelled edits', () => {
  const props = { selectedDate: new Date(2026, 8, 13), selectedTime: new Date(2026, 8, 13, 12), repeatDays: ['L'], reminder: { type: 'relative', value: 5 }, endDate: new Date(2026, 9, 10) };
  const draft = createScheduleDraft(props);
  draft.date.setDate(25); draft.time.setHours(18); draft.endDate.setDate(20);
  draft.repeatDays.push('M'); draft.reminder.value = 10;
  assert.equal(props.selectedDate.getDate(), 13);
  assert.equal(props.selectedTime.getHours(), 12);
  assert.equal(props.endDate.getDate(), 10);
  assert.deepEqual(props.repeatDays, ['L']);
  assert.equal(props.reminder.value, 5);
  assert.equal(createScheduleDraft(props).date.getDate(), 13);
});

test('date clears reminder; time only clears it when entering or leaving all-day mode', () => {
  const reminder = { type: 'relative', value: 5 };
  const draft = createScheduleDraft({ selectedTime: new Date(2026, 8, 13, 12), reminder });
  assert.equal(reduce(draft, { field: 'date', value: new Date(2026, 8, 14) }).reminder, null);
  assert.equal(JSON.stringify(reduce(draft, { field: 'time', value: new Date(2026, 8, 13, 13) }).reminder), JSON.stringify(reminder));
  assert.equal(reduce(draft, { field: 'time', value: null }).reminder, null);
  const allDay = createScheduleDraft({ reminder });
  assert.equal(reduce(allDay, { field: 'time', value: new Date() }).reminder, null);
  assert.equal(JSON.stringify(draft.reminder), JSON.stringify(reminder));
});

test('repetition setters compose without dropping previous updates', () => {
  let draft = createScheduleDraft({});
  for (const [field, value] of [['repeatMode', 'monthly'], ['repeatDays', ['13']], ['repeatInterval', 12], ['endDate', new Date(2027, 8, 13)]]) draft = reduce(draft, { field, value });
  assert.equal(draft.repeatMode, 'monthly');
  assert.deepEqual(draft.repeatDays, ['13']);
  assert.equal(draft.repeatInterval, 12);
  assert.equal(draft.endDate.getFullYear(), 2027);
});

test('annual label follows draft date and tolerates missing dates', () => {
  const options = { repeatMode: 'monthly', repeatInterval: 12, repeatDays: ['13'] };
  assert.equal(formatRepeatLabel({ ...options, selectedDate: new Date(2026, 8, 13) }), 'Anual · 13 de septiembre');
  assert.equal(formatRepeatLabel({ ...options, selectedDate: new Date(2026, 9, 13) }), 'Anual · 13 de octubre');
  assert.equal(formatRepeatLabel(options), 'Anual');
  assert.equal(formatRepeatLabel({ repeatMode: 'monthly', repeatDays: [] }), 'Mensual');
});

test('date and time labels preserve defaults and accept a deterministic today', () => {
  const now = new Date(2026, 8, 13, 20);
  assert.equal(formatHumanDate(null, now), 'Nunca');
  assert.equal(formatHumanDate(new Date(2026, 8, 13), now), 'Hoy');
  assert.equal(formatHumanDate(new Date(2026, 8, 14), now), 'Mañana');
  assert.equal(formatHumanTime(null), 'En cualquier momento');
  assert.equal(formatHumanTime(new Date(2026, 8, 13, 0, 5)), '00:05');
});

test('repetition changes discard incompatible after reminders with a notice and retain compatible reminders', () => {
  const after = createScheduleDraft({ reminder: { type: 'after', at: Date.now() + 3600000 } });
  const weekly = reduce(after, { field: 'repeatMode', value: 'weekly' });
  assert.equal(weekly.reminder, null);
  assert.match(weekly.reminderNotice, /no es compatible/);
  const selected = reduce(weekly, { field: 'reminder', value: { type: 'persistent' } });
  assert.equal(selected.reminderNotice, null);
  assert.equal(reduce(selected, { field: 'repeatMode', value: 'monthly' }).reminder.type, 'persistent');
  const timed = createScheduleDraft({ selectedTime: new Date(), reminder: { type: 'relative', value: 5, unit: 'minutes' } });
  assert.equal(reduce(timed, { field: 'repeatMode', value: 'daily' }).reminder.type, 'relative');
});

test('choosing a historical date clears scheduling only in the draft and retains its time', () => {
  const today = new Date(2026, 8, 16, 12);
  const props = { selectedDate: today, selectedTime: new Date(2000, 0, 15, 10, 30), repeatMode: 'weekly',
    repeatDays: ['X'], repeatInterval: 2, endDate: new Date(2027, 0, 1), reminder: { type: 'relative', value: 5, unit: 'minutes' } };
  const original = createScheduleDraft(props);
  const historical = reduce(original, { field: 'date', value: new Date(2026, 8, 15), today });
  assert.equal(historical.repeatMode, 'none');
  assert.equal(historical.repeatDays.length, 0);
  assert.equal(historical.repeatInterval, 1);
  assert.equal(historical.endDate, null);
  assert.equal(historical.reminder, null);
  assert.equal(historical.time.getTime(), props.selectedTime.getTime());
  assert.equal(original.repeatMode, 'weekly');
  assert.equal(original.reminder.type, 'relative');
  const future = reduce(historical, { field: 'date', value: today, today });
  assert.equal(future.repeatMode, 'none', 'returning to today does not silently restore scheduling');
  const reopened = createScheduleDraft({ ...props, selectedDate: new Date(2020, 0, 1) });
  assert.equal(reopened.repeatMode, 'weekly', 'opening an old series must not erase it');
});
