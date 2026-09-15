import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';

function duringClockChange(run) {
  const OriginalDate = globalThis.Date;
  const timezone = process.env.TZ;
  process.env.TZ = 'America/Santiago';
  globalThis.Date = class extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [2026, 8, 6, 12])); }
  };
  try { run(); } finally {
    globalThis.Date = OriginalDate;
    if (timezone === undefined) delete process.env.TZ; else process.env.TZ = timezone;
  }
}

test('editing on the DST transition preserves every stored hour and minute through save', () => {
  duringClockChange(() => {
    const { parseTimeString } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDates.js' });
    const { prepareTaskDraft } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDraft.js' });
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 30, 59]) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const result = prepareTaskDraft({ text: 'Edited title', schedule: {
          selectedDate: new Date(2026, 8, 10), selectedTime: parseTimeString(time),
          repeatMode: 'none', repeatInterval: 1,
        } });
        assert.equal(result.fields.time, time);
        assert.equal(result.fields.date, '2026-09-10');
      }
    }
  });
});

test('selecting midnight during DST keeps the chosen hour and uses the task day for reminders', () => {
  duringClockChange(() => {
    const { buildSelectedTime } = loadDatabase(null, { entry: '../../src/features/tasks/domain/hourPickerModel.js' });
    const { formatTime } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDates.js' });
    const { planTaskReminders } = loadDatabase(null, { entry: '../../src/features/tasks/services/notifications/reminderPlanner.js' });
    const chosen = buildSelectedTime({ hour: '12', minute: '30', period: 'AM' });
    assert.equal(formatTime(chosen), '00:30');
    const task = { id: 'time', title: 'Demo', date: '2026-09-10', time: formatTime(chosen), repeat_mode: 'none',
      reminder_type: 'relative', reminder_value: 0, reminder_unit: 'minutes' };
    const entries = planTaskReminders(task, { now: new Date() });
    assert.equal(entries[0].date.getTime(), new Date(2026, 8, 10, 0, 30).getTime());
    // Only the actual occurrence's nonexistent time is normalized for delivery.
    const transition = planTaskReminders({ ...task, date: '2026-09-06' }, { now: new Date(2026, 8, 5, 12) });
    assert.equal(transition[0].date.getTime(), new Date(2026, 8, 6, 1, 30).getTime());
    assert.equal(task.time, '00:30');
  });
});

test('reference time round trips every minute in multiple time zones and rejects malformed storage', () => {
  const timezone = process.env.TZ;
  const { parseTimeString, formatTime } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDates.js' });
  const { readHourDraft, buildSelectedTime } = loadDatabase(null, { entry: '../../src/features/tasks/domain/hourPickerModel.js' });
  try {
    for (const zone of ['America/Santiago', 'America/New_York', 'Australia/Sydney', 'UTC']) {
      process.env.TZ = zone;
      for (let minute = 0; minute < 1440; minute++) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        assert.equal(formatTime(buildSelectedTime(readHourDraft(parseTimeString(time)))), time, zone);
      }
    }
    for (const value of [null, '', 'bad', '24:00', '12:60', '-1:30', '00:30:00']) {
      assert.equal(parseTimeString(value), null);
    }
  } finally {
    if (timezone === undefined) delete process.env.TZ; else process.env.TZ = timezone;
  }
});
