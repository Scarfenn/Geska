import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const { getRepeatEndState, canSelectRepeatEndDate } = loadDatabase(null, { entry: '../../src/features/tasks/domain/repeatEnd.js' });
const { formatDateLocal } = loadDatabase(null, { entry: '../../src/features/tasks/domain/taskDates.js' });
const today = new Date(2026, 8, 1, 23);
const weekly = { date: new Date(2026, 8, 8), repeatMode: 'weekly', repeatDays: ['V'], repeatInterval: 1, endDate: null };

test('end can be the first occurrence or any later day, without having to be an occurrence', () => {
  const state = getRepeatEndState(weekly, today);
  assert.equal(formatDateLocal(state.firstOccurrence), '2026-09-11');
  assert.equal(formatDateLocal(state.minimum), '2026-09-11');
  assert.equal(canSelectRepeatEndDate(new Date(2026, 8, 10), weekly, today), false);
  assert.equal(canSelectRepeatEndDate(new Date(2026, 8, 11), weekly, today), true);
  assert.equal(canSelectRepeatEndDate(new Date(2026, 8, 12), weekly, today), true);
  assert.equal(getRepeatEndState({ ...weekly, endDate: new Date(2026, 8, 12) }, today).error, null);
});

test('changing days, interval or start invalidates the chosen end without changing it', () => {
  const endDate = new Date(2026, 8, 11);
  for (const changes of [{ repeatDays: ['L'], repeatInterval: 2 }, { date: new Date(2026, 8, 12) }]) {
    const draft = { ...weekly, endDate, ...changes };
    const before = JSON.stringify(draft);
    assert.match(getRepeatEndState(draft, today).error, /primera repetición/);
    assert.equal(JSON.stringify(draft), before);
  }
});

test('no possible occurrence disables end selection even without an end date', () => {
  const draft = { date: new Date(2026, 1, 1), repeatMode: 'monthly', repeatDays: ['31'], repeatInterval: 12, endDate: null };
  assert.equal(getRepeatEndState(draft, today).minimum, null);
  assert.match(getRepeatEndState(draft, today).error, /ninguna ocurrencia/);
  assert.equal(canSelectRepeatEndDate(new Date(2028, 1, 29), draft, today), false);
});

test('new selections respect today, while existing valid historical ends remain editable', () => {
  const start = new Date(2026, 8, 6, 23);
  const sameDay = new Date(2026, 8, 7, 12);
  const draft = { date: start, repeatMode: 'daily', repeatDays: [], repeatInterval: 1, endDate: sameDay };
  assert.equal(getRepeatEndState(draft, today).error, null);
  assert.equal(canSelectRepeatEndDate(sameDay, draft, today), true);
  assert.equal(canSelectRepeatEndDate(new Date(2026, 8, 5, 23), draft, today), false);
  const laterToday = new Date(2026, 8, 14, 23);
  assert.equal(formatDateLocal(getRepeatEndState(draft, laterToday).minimum), '2026-09-14');
  assert.equal(canSelectRepeatEndDate(sameDay, draft, laterToday), false);
  assert.equal(getRepeatEndState(draft, laterToday).error, null);
  assert.equal(start.getHours(), 23);
});

test('the schedule hook exposes a validation error when changing task date invalidates repeat end', () => {
  let state;
  const { default: useScheduleDraft } = loadDatabase(null, {
    entry: '../../src/features/tasks/hooks/useScheduleDraft.js',
    stubs: { react: {
      useReducer(reducer, props, init) {
        state ||= init(props);
        return [state, action => { state = reducer(state, action); }];
      },
      useState(initial) { return [initial, () => {}]; },
    } },
  });
  const props = { selectedDate: new Date(2030, 0, 8), repeatMode: 'weekly', repeatDays: ['V'], repeatInterval: 1, endDate: new Date(2030, 0, 11) };
  let hook = useScheduleDraft(props);
  assert.equal(hook.repeatEndError, null);
  hook.handleDateSelected(new Date(2030, 0, 12));
  hook = useScheduleDraft(props);
  assert.match(hook.repeatEndError, /primera repetición/);
  assert.equal(hook.draftEndDate.getDate(), 11);
  hook.setDraftEndDate(null);
  assert.equal(useScheduleDraft(props).repeatEndError, null);
});

test('occurrence preview follows the draft and omits daily interval one and the initial date', () => {
  const { isRepeatPreviewDate } = loadDatabase(null, { entry: '../../src/features/tasks/domain/repeatEnd.js' });
  const daily = { date: new Date(2026, 11, 15), repeatMode: 'daily', repeatInterval: 1, repeatDays: [] };
  assert.equal(isRepeatPreviewDate(new Date(2026, 11, 16), daily), false);
  assert.equal(isRepeatPreviewDate(new Date(2026, 11, 15), { ...daily, repeatInterval: 3 }), false);
  assert.equal(isRepeatPreviewDate(new Date(2026, 11, 18), { ...daily, repeatInterval: 3 }), true);
  assert.equal(isRepeatPreviewDate(new Date(2026, 11, 19), { ...daily, repeatInterval: 3 }), false);
  assert.equal(isRepeatPreviewDate(new Date(2026, 8, 11), weekly), true);
  assert.equal(isRepeatPreviewDate(new Date(2026, 8, 12), weekly), false);
  const monthly = { ...daily, repeatMode: 'monthly', repeatDays: ['15'] };
  assert.equal(isRepeatPreviewDate(new Date(2027, 0, 15), monthly), true);
  assert.equal(isRepeatPreviewDate(new Date(2027, 0, 16), monthly), false);
  assert.equal(isRepeatPreviewDate(new Date(2027, 0, 15), { ...monthly, repeatInterval: 2 }), false);
  assert.equal(isRepeatPreviewDate(new Date(2027, 1, 15), { ...monthly, repeatInterval: 2 }), true);
});

test('all-days weekly and monthly schedules omit decoration only when equivalent to daily', () => {
  const { isRepeatPreviewDate } = loadDatabase(null, { entry: '../../src/features/tasks/domain/repeatEnd.js' });
  const date = new Date(2026, 11, 15);
  const candidate = new Date(2026, 11, 16);
  for (const [repeatMode, repeatDays] of [
    ['weekly', ['L', 'M', 'X', 'J', 'V', 'S', 'D']],
    ['monthly', Array.from({ length: 31 }, (_, i) => i + 1)],
  ]) {
    const draft = { date, repeatMode, repeatDays, repeatInterval: 1 };
    assert.equal(isRepeatPreviewDate(candidate, draft), false);
    assert.equal(isRepeatPreviewDate(candidate, { ...draft, repeatDays: repeatDays.join(',') }), false);
    assert.equal(isRepeatPreviewDate(candidate, { ...draft, repeatDays: repeatDays.slice(0, -1) }), true);
    assert.equal(isRepeatPreviewDate(candidate, { ...draft, repeatInterval: 2 }), true);
  }
});

test('editing an existing end still validates and decorates later repetitions', () => {
  const { isRepeatPreviewDate } = loadDatabase(null, { entry: '../../src/features/tasks/domain/repeatEnd.js' });
  const draft = { ...weekly, endDate: new Date(2026, 8, 11) };
  assert.equal(formatDateLocal(getRepeatEndState(draft, today).firstOccurrence), '2026-09-11');
  assert.equal(canSelectRepeatEndDate(new Date(2026, 8, 18), draft, today), true);
  assert.equal(isRepeatPreviewDate(new Date(2026, 8, 18), draft), true);
});
