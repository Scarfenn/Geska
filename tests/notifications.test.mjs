import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notificationHarness } from './helpers/notificationHarness.mjs';

const now = () => new Date(2026, 8, 9, 8);
const task = (overrides = {}) => ({ id: 'task', title: 'Demo', date: '2026-09-09', time: '09:00',
  repeat_mode: 'daily', repeat_interval: 1, reminder_type: 'relative', reminder_value: 0,
  reminder_unit: 'minutes', notification_ids: [], notification_id: null, ...overrides });
const plain = value => JSON.parse(JSON.stringify(value));
const count = (h, method) => h.calls.filter(c => c[0] === method).length;
function plan(taskValue, options = {}) {
  return notificationHarness().load('features/tasks/services/notifications/reminderPlanner.js')
    .planTaskReminders(taskValue, { now: now(), ...options });
}

test('planner has no native side effects, is deterministic and does not mutate inputs', () => {
  const h = notificationHarness();
  const { planTaskReminders } = h.load('features/tasks/services/notifications/reminderPlanner.js');
  const value = task(), from = now(), original = plain(value);
  const first = planTaskReminders(value, { now: from });
  assert.equal(first.length, 16); assert.equal(first[0].date.getHours(), 9);
  assert.deepEqual(plain(first), plain(planTaskReminders(value, { now: from })));
  assert.deepEqual(value, original); assert.equal(from.getTime(), now().getTime());
  assert.equal(h.calls.length, 0);
});

test('planner skips completed occurrences and reminders at or before now', () => {
  const entries = plan(task({ occurrences: [{ date: '2026-09-10', done: true }] }), { now: new Date(2026, 8, 9, 9), limit: 2 });
  assert.deepEqual(Array.from(entries, e => e.occurrenceDate), ['2026-09-11', '2026-09-12']);
  assert.equal(plan(task({ repeat_mode: 'none', done: true })).length, 0);
});

test('relative reminders can cross midnight and all-day offsets use calendar dates', () => {
  const relative = plan(task({ date: '2026-09-10', time: '01:00', repeat_mode: 'none', reminder_value: 3, reminder_unit: 'hours' }), { now: new Date(2026, 8, 9, 21) });
  assert.equal(relative[0].date.getDate(), 9); assert.equal(relative[0].date.getHours(), 22);
  assert.equal(relative[0].occurrenceDate, '2026-09-10');
  const allDay = plan(task({ date: '2026-09-10', time: null, repeat_mode: 'none', reminder_type: 'all_day', reminder_value: 1, reminder_unit: 'days' }));
  assert.equal(allDay[0].date.getTime(), new Date(2026, 8, 9, 9).getTime());
});

test('persistent and after reminders retain completion metadata and obey the limit', () => {
  const entries = plan(task({ reminder_type: 'persistent', time: null }), { now: new Date(2026, 8, 9, 13), limit: 3 });
  assert.deepEqual(Array.from(entries, e => e.persistentHour), [17, 21, 9]);
  const after = task({ repeat_mode: 'none', time: null, reminder_type: 'after', reminder_at: new Date(2026, 8, 9, 11).getTime() });
  assert.equal(plan(after)[0].occurrenceDate, after.date);
  assert.equal(plan({ ...after, done: true }).length, 0);
  assert.equal(plan(task(), { limit: 100 }).length, 16);
});

test('weekly/monthly recurrence, legacy reminders and invalid drafts use the existing domain rules', () => {
  assert.deepEqual(Array.from(plan(task({ repeat_mode: 'weekly', repeat_days: 'L', repeat_interval: 2 }), { limit: 2 }), e => e.occurrenceDate), ['2026-09-21', '2026-10-05']);
  assert.deepEqual(Array.from(plan(task({ date: '2026-01-31', repeat_mode: 'monthly', repeat_days: '31' }), { now: new Date(2026, 1, 1), limit: 2 }), e => e.occurrenceDate), ['2026-03-31', '2026-05-31']);
  assert.equal(plan(task({ reminder_type: null, reminder_minutes: 5 }))[0].date.getMinutes(), 55);
  for (const value of [null, task({ date: 'bad' }), task({ time: '25:00' }), task({ reminder_value: -1 }), task({ title: '' })]) assert.equal(plan(value).length, 0);
});

test('daily wall-clock reminder times survive daylight-saving changes', () => {
  const oldTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const entries = plan(task({ date: '2026-03-07' }), { now: new Date(2026, 2, 7, 8), limit: 3 });
    assert.deepEqual(Array.from(entries, e => e.date.getHours()), [9, 9, 9]);
    assert.equal(entries[1].date - entries[0].date, 23 * 60 * 60 * 1000);
    process.env.TZ = 'America/Santiago';
    const chilean = plan(task({ date: '2026-09-05' }), { now: new Date(2026, 8, 5, 8), limit: 3 });
    assert.deepEqual(Array.from(chilean, e => e.date.getHours()), [9, 9, 9]);
  } finally { if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ; }
});

test('sync twice preserves native IDs and does not persist unchanged notifications', async () => {
  const h = notificationHarness(); let saved = task(); let writes = 0;
  const persist = async value => { saved = value; writes++; };
  await h.api.syncTaskReminders([saved], persist, { now: now() });
  const ids = [...saved.notification_ids];
  await h.api.syncTaskReminders([saved], persist, { now: now() });
  assert.equal(count(h, 'schedule'), 16); assert.equal(count(h, 'cancel'), 0);
  assert.equal(writes, 1); assert.deepEqual([...saved.notification_ids], ids);
});

test('title edits replace content only after replacements exist and keep other tasks untouched', async () => {
  const h = notificationHarness(); const value = task({ repeat_mode: 'none' });
  await h.api.reconcileTaskReminders(value, null, { now: now() });
  h.scheduled.set('other', { identifier: 'other', content: { title: 'Other', data: { type: 'task-reminder', taskId: 'other' } } });
  await h.api.reconcileTaskReminders({ ...value, title: 'Edited' }, null, { now: now() });
  const events = h.calls.filter(c => ['schedule', 'cancel'].includes(c[0]));
  assert.deepEqual(events.map(e => e[0]), ['schedule', 'schedule', 'cancel']);
  assert.equal(h.scheduled.get('n2').content.body, 'Edited'); assert.ok(h.scheduled.has('other'));
});

test('partial scheduling failure rolls back created IDs without cancelling old reminders', async () => {
  const h = notificationHarness(); await h.api.reconcileTaskReminders(task(), null, { now: now() });
  const oldIds = Array.from(h.scheduled.keys());
  const schedule = h.native.scheduleNotificationAsync; let attempts = 0;
  h.native.scheduleNotificationAsync = request => { if (++attempts === 2) throw new Error('quota'); return schedule(request); };
  await assert.rejects(h.api.reconcileTaskReminders(task({ title: 'Edited' }), null, { now: now() }), error => {
    assert.equal(error.createdIds.length, 1); assert.equal(error.pendingCancellationIds.length, 0);
    assert.equal(error.cause.message, 'quota'); return true;
  });
  assert.deepEqual(Array.from(h.scheduled.keys()), oldIds);
});

test('failed cleanup reports leftover IDs and the next run recovers them by key', async () => {
  const h = notificationHarness(); const schedule = h.native.scheduleNotificationAsync;
  let attempts = 0;
  h.native.scheduleNotificationAsync = request => { if (++attempts === 2) throw new Error('quota'); return schedule(request); };
  h.native.cancelScheduledNotificationAsync = async () => { throw new Error('cancel failed'); };
  await assert.rejects(h.api.reconcileTaskReminders(task(), null, { now: now() }), error => {
    assert.deepEqual(Array.from(error.pendingCancellationIds), ['n1']); return true;
  });
  h.native.scheduleNotificationAsync = schedule;
  await h.api.reconcileTaskReminders(task(), null, { now: now() });
  assert.equal(h.scheduled.size, 16); assert.equal(count(h, 'schedule'), 16);
});

test('failed persistence leaves recoverable native reminders and does not duplicate on retry', async () => {
  const h = notificationHarness();
  await assert.rejects(h.api.reconcileTaskReminders(task(), async () => { throw new Error('SQLite'); }, { now: now() }), /SQLite/);
  let saved;
  await h.api.reconcileTaskReminders(task(), async value => { saved = value; }, { now: now() });
  assert.equal(count(h, 'schedule'), 16); assert.equal(count(h, 'cancel'), 0);
  assert.equal(saved.notification_ids.length, 16);
});

test('permission denial is distinct from empty and technical failure, without clearing old IDs', async () => {
  const h = notificationHarness(); let persisted = false;
  h.native.getPermissionsAsync = async () => ({ granted: false, canAskAgain: false });
  const denied = await h.api.reconcileTaskReminders(task({ notification_ids: ['old'] }), async () => { persisted = true; }, { now: now() });
  assert.equal(denied.status, 'permission-denied'); assert.deepEqual(Array.from(denied.ids), ['old']);
  assert.equal(persisted, false); assert.equal(count(h, 'schedule'), 0); assert.equal(count(h, 'cancel'), 0);
  assert.equal((await h.api.reconcileTaskReminders(task({ reminder_type: null }), null, { now: now() })).status, 'empty');
  h.native.getPermissionsAsync = async () => { throw new Error('native permissions failed'); };
  await assert.rejects(h.api.reconcileTaskReminders(task(), null, { now: now() }), /native permissions failed/);
});

test('iOS provisional permission is accepted without prompting again', async () => {
  const h = notificationHarness({ platform: 'ios' });
  h.native.getPermissionsAsync = async () => ({ granted: false, ios: { status: 3 } });
  h.native.requestPermissionsAsync = async () => { throw new Error('unexpected prompt'); };
  assert.equal(await h.api.initNotifications(), true); assert.equal(count(h, 'channel'), 0);
});

test('duplicates, completed occurrences and deleted tasks are removed while unrelated notifications survive', async () => {
  const h = notificationHarness(); let saved;
  await h.api.reconcileTaskReminders(task(), async value => { saved = value; }, { now: now() });
  h.scheduled.set('duplicate', { ...h.scheduled.get('n1'), identifier: 'duplicate' });
  h.scheduled.set('orphan', { identifier: 'orphan', content: { data: { type: 'task-reminder', taskId: 'deleted' } } });
  h.scheduled.set('unrelated', { identifier: 'unrelated', content: { title: '⏰ Recordatorio', data: {} } });
  await h.api.syncTaskReminders([{ ...saved, occurrences: [{ date: '2026-09-09', done: true }] }], null, { now: now() });
  assert.equal(h.scheduled.has('n1'), false); assert.equal(h.scheduled.has('duplicate'), false);
  assert.equal(h.scheduled.has('orphan'), false); assert.equal(h.scheduled.has('unrelated'), true);
  assert.equal(h.scheduled.size, 17);
});

test('legacy notifications migrate once and failed cancellation is retryable', async () => {
  const h = notificationHarness();
  h.scheduled.set('legacy', { identifier: 'legacy', content: { title: '⏰ Recordatorio', data: { taskId: 'task' } } });
  const cancel = h.native.cancelScheduledNotificationAsync;
  h.native.cancelScheduledNotificationAsync = async () => { throw new Error('cancel failed'); };
  await assert.rejects(h.api.reconcileTaskReminders(task({ repeat_mode: 'none' }), null, { now: now() }), error => error.pendingCancellationIds.includes('legacy'));
  h.native.cancelScheduledNotificationAsync = cancel;
  await h.api.reconcileTaskReminders(task({ repeat_mode: 'none' }), null, { now: now() });
  assert.equal(h.scheduled.size, 1); assert.equal(count(h, 'schedule'), 1);
});

test('concurrent reconciliations serialize and do not duplicate reminders', async () => {
  const h = notificationHarness();
  const [a, b] = await Promise.all([
    h.api.reconcileTaskReminders(task(), null, { now: now() }),
    h.api.reconcileTaskReminders(task(), null, { now: now() }),
  ]);
  assert.deepEqual(plain(a.ids), plain(b.ids)); assert.equal(count(h, 'schedule'), 16);
});

test('cancel by task discovers IDs lost before persistence and leaves other reminders', async () => {
  const h = notificationHarness();
  await h.api.reconcileTaskReminders(task(), null, { now: now() });
  await h.api.reconcileTaskReminders(task({ id: 'other', repeat_mode: 'none' }), null, { now: now() });
  await h.api.cancelTaskReminders([], { taskId: 'task' });
  assert.equal(h.scheduled.size, 1); assert.equal(Array.from(h.scheduled.values())[0].content.data.taskId, 'other');
});

test('handler registration is explicit, idempotent and background completion keeps the occurrence date', async () => {
  const h = notificationHarness();
  const { registerNotifications } = h.load('features/tasks/services/notifications/registerNotifications.js');
  assert.equal(h.calls.length, 0);
  registerNotifications(); registerNotifications();
  assert.equal(count(h, 'handler'), 1); assert.equal(count(h, 'listener'), 1); assert.equal(count(h, 'defineTask'), 1);
  const handler = h.calls.find(c => c[0] === 'defineTask')[2];
  await handler({ data: { actionIdentifier: 'complete-task', notification: { request: { content: { data: { taskId: 'task', occurrenceDate: '2026-09-09' } } } } } });
  assert.deepEqual(h.calls.find(c => c[0] === 'complete'), ['complete', 'task', '2026-09-09']);
});

test('ambiguous native creation is rediscovered instead of duplicated on retry', async () => {
  const h = notificationHarness(), schedule = h.native.scheduleNotificationAsync;
  h.native.scheduleNotificationAsync = async request => { await schedule(request); throw new Error('response lost'); };
  await assert.rejects(h.api.reconcileTaskReminders(task(), null, { now: now() }), /programar/);
  h.native.scheduleNotificationAsync = schedule;
  await h.api.reconcileTaskReminders(task(), null, { now: now() });
  assert.equal(h.scheduled.size, 16); assert.equal(count(h, 'schedule'), 16);
});

test('global sync reads the inventory once and reports failed tasks without blocking healthy ones', async () => {
  const h = notificationHarness(), schedule = h.native.scheduleNotificationAsync;
  let reads = 0;
  h.native.getAllScheduledNotificationsAsync = async () => { reads++; return [...h.scheduled.values()]; };
  h.native.scheduleNotificationAsync = request => {
    if (request.content.data.taskId === 'bad') throw new Error('schedule failed');
    return schedule(request);
  };
  await assert.rejects(h.api.syncTaskReminders([task({ id: 'bad' }), task({ id: 'good', repeat_mode: 'none' })], null, { now: now() }), error => {
    assert.equal(error.failures[0].taskId, 'bad'); assert.equal(error.results[0].taskId, 'good'); return true;
  });
  assert.equal(reads, 1); assert.equal(h.scheduled.size, 1);
});

test('legacy public wrappers preserve return shapes and cancellation reports errors', async () => {
  const h = notificationHarness();
  const value = task({ date: '2099-01-01', repeat_mode: 'none' });
  const id = await h.api.scheduleTaskReminder(value);
  assert.equal(typeof id, 'string');
  const updated = await h.api.rescheduleTaskReminders(value);
  assert.equal(updated.notification_id, id); assert.equal(count(h, 'schedule'), 1);
  h.native.cancelScheduledNotificationAsync = async () => { throw new Error('native cancel failed'); };
  await assert.rejects(h.api.cancelTaskReminder(id), error => error.pendingCancellationIds[0] === id);
});

test('a slow permission prompt cannot schedule reminders whose time already passed', async () => {
  const h = notificationHarness(), reference = new Date(2026, 8, 9, 8, 59);
  h.native.getPermissionsAsync = async () => ({ granted: false, canAskAgain: true });
  h.native.requestPermissionsAsync = async () => {
    reference.setHours(9, 1); return { granted: true };
  };
  const result = await h.api.reconcileTaskReminders(task({ repeat_mode: 'none' }), null, { now: reference });
  assert.equal(result.status, 'empty'); assert.equal(count(h, 'schedule'), 0);
});

test('relative, all-day and persistent plans stop at the inclusive occurrence end', () => {
  for (const reminder of [
    {}, { reminder_type: 'all_day', reminder_value: 1, reminder_unit: 'days', time: null },
    { reminder_type: 'persistent', time: null },
  ]) {
    const value = task({ ...reminder, repeat_end: '2026-09-10' });
    const entries = plan(value);
    assert.ok(entries.length > 0);
    assert.ok(entries.every(e => e.occurrenceDate <= '2026-09-10'));
    assert.ok(entries.some(e => e.occurrenceDate === '2026-09-10'));
    assert.equal(plan(value, { now: new Date(2026, 8, 11, 8) }).length, 0);
  }
});

test('shortening, extending and clearing an end reconciles pending notifications', async () => {
  const h = notificationHarness(); let saved = task();
  const persist = async value => { saved = value; };
  const dates = () => Array.from(h.scheduled.values(), n => n.content.data.occurrenceDate);
  await h.api.reconcileTaskReminders(saved, persist, { now: now() });
  const original = [...saved.notification_ids];
  // Full startup sync also repairs notifications saved before end enforcement.
  saved = { ...saved, repeat_end: '2026-09-10' };
  await h.api.syncTaskReminders([saved], persist, { now: now() });
  assert.deepEqual(dates(), ['2026-09-09', '2026-09-10']);
  assert.deepEqual([...saved.notification_ids], original.slice(0, 2));
  assert.equal(count(h, 'cancel'), 14);
  saved = { ...saved, repeat_end: '2026-09-12' };
  await h.api.reconcileTaskReminders(saved, persist, { now: now() });
  assert.deepEqual(dates(), ['2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12']);
  saved = { ...saved, repeat_end: null };
  await h.api.reconcileTaskReminders(saved, persist, { now: now() });
  assert.equal(h.scheduled.size, 16);
  assert.equal(saved.notification_ids.length, 16);
});

test('invalid legacy after reminders are cancelled rather than scheduled on a non-occurrence', async () => {
  const h = notificationHarness();
  let saved = task({ repeat_mode: 'none', time: null, reminder_type: 'after', reminder_at: new Date(2026, 8, 9, 10).getTime() });
  const persist = async value => { saved = value; };
  await h.api.reconcileTaskReminders(saved, persist, { now: now() });
  assert.equal(h.scheduled.size, 1);
  saved = { ...saved, repeat_mode: 'weekly', repeat_days: 'V' };
  await h.api.reconcileTaskReminders(saved, persist, { now: now() });
  assert.equal(h.scheduled.size, 0);
  assert.equal(saved.notification_ids.length, 0);
});

test('fresh storage sync replenishes a consumed queue and retains undelivered IDs', async () => {
  const h = notificationHarness(); let saved = task();
  const persist = async value => { saved = value; };
  await h.api.syncTaskReminders(async () => saved ? [saved] : [], persist, { now: now() });
  const kept = saved.notification_ids.at(-1);
  for (const id of saved.notification_ids.slice(0, -1)) h.scheduled.delete(id);
  await h.api.syncTaskReminders(async () => [saved], persist, { now: new Date(2026, 8, 24, 8) });
  assert.equal(h.scheduled.size, 16);
  assert.ok(saved.notification_ids.includes(kept));
  assert.ok(Array.from(h.scheduled.values()).every(n => n.content.data.occurrenceDate >= '2026-09-24'));
  h.scheduled.clear();
  await h.api.syncTaskReminders(async () => [saved], persist, { now: new Date(2026, 9, 15, 8) });
  assert.equal(h.scheduled.size, 16);
});

test('a stale action dismisses only the exact notification and unrelated actions do nothing', async () => {
  const h = notificationHarness();
  h.stubs['@/features/tasks/services/taskCompletion'].completeTask = async () => false;
  h.native.getPresentedNotificationsAsync = async () => ['other-occurrence', 'stale'].map(identifier => ({ request: { identifier, content: { data: { taskId: 'task' } } } }));
  const { handleNotificationResponse } = h.load('features/tasks/services/notificationResponseHandler.js');
  const response = { actionIdentifier: h.api.COMPLETE_TASK_ACTION_ID, notification: { request: { identifier: 'stale', content: { data: { taskId: 'task', occurrenceDate: '2026-09-09' } } } } };
  assert.equal(await handleNotificationResponse(response), false);
  assert.deepEqual(h.calls.filter(c => c[0] === 'dismiss'), [['dismiss', 'stale']]);
  await handleNotificationResponse({ ...response, actionIdentifier: 'default' });
  assert.equal(count(h, 'dismiss'), 1);
});

test('queued foreground sync reads the latest task state only when it can reconcile', async () => {
  const h = notificationHarness(); let release, entered, reads = 0;
  const waiting = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const inventory = h.native.getAllScheduledNotificationsAsync;
  h.native.getAllScheduledNotificationsAsync = async () => {
    entered(); await gate; return inventory();
  };
  let current = task();
  const first = h.api.reconcileTaskReminders(current, null, { now: now() });
  await waiting;
  const resume = h.api.syncTaskReminders(async () => { reads++; return [current]; }, null, { now: now() });
  assert.equal(reads, 0);
  current = { ...current, repeat_end: '2026-09-10' };
  release(); await first; await resume;
  assert.equal(reads, 1);
  assert.equal(h.scheduled.size, 2);
});

test('planner schedules distant occurrences without a ten-year horizon', () => {
  for (const [settings, expected] of [
    [{ repeat_mode: 'daily', repeat_interval: 4000 }, '2037-08-28'],
    [{ repeat_mode: 'weekly', repeat_interval: 600, repeat_days: 'M' }, '2038-03-16'],
    [{ repeat_mode: 'monthly', repeat_interval: 132, repeat_days: '15' }, '2037-09-15'],
  ]) {
    const value = task({ ...settings, date: '2026-09-15' });
    const entries = plan(value, { now: new Date(2026, 8, 16, 8) });
    assert.equal(entries.length, 16);
    assert.equal(entries[0].occurrenceDate, expected);
    const ended = plan({ ...value, repeat_end: expected }, { now: new Date(2026, 8, 16, 8) });
    assert.equal(ended.length, 1);
    const completed = plan({ ...value, occurrences: [{ date: expected, done: true }] }, { now: new Date(2026, 8, 16, 8) });
    assert.equal(completed[0].occurrenceDate, entries[1].occurrenceDate);
  }
});

test('advance notice starts from the future occurrence while retaining reminders due today', () => {
  const from = new Date(2026, 8, 9, 8);
  const relative = plan(task({ date: '2026-09-10', time: '09:00', reminder_value: 24, reminder_unit: 'hours', repeat_end: '2026-09-10' }), { now: from });
  assert.equal(relative.length, 1);
  assert.equal(relative[0].date.getTime(), new Date(2026, 8, 9, 9).getTime());
  const allDay = plan(task({ date: '2026-09-16', time: null, reminder_type: 'all_day', reminder_value: 7, reminder_unit: 'days', repeat_end: '2026-09-16' }), { now: from });
  assert.equal(allDay.length, 1);
  assert.equal(allDay[0].date.getTime(), new Date(2026, 8, 9, 9).getTime());
  // Very large advance notice must jump over expired reminders too.
  const distant = plan(task({ reminder_value: 24 * 4000, reminder_unit: 'hours' }), { now: from, limit: 1 });
  assert.equal(distant.length, 1);
  assert.ok(distant[0].date > from);
});

test('impossible schedules, exhausted bounds and year overflow return an empty plan', () => {
  assert.equal(plan(task({ date: '2026-02-01', repeat_mode: 'monthly', repeat_days: '31', repeat_interval: 12 })).length, 0);
  assert.equal(plan(task({ repeat_interval: Number.MAX_SAFE_INTEGER }), { now: new Date(2026, 8, 10) }).length, 0);
  assert.equal(plan(task({ date: '9999-12-31' }), { now: new Date(9999, 11, 31, 10) }).length, 0);
  assert.equal(plan(task({ reminder_value: Number.MAX_VALUE })).length, 0);
});
