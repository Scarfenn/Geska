import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
const source = await readFile(new URL('../src/features/tasks/domain/hourPickerModel.js', import.meta.url), 'utf8');
const { HOURS, MINUTES, ITEM_HEIGHT, LOOP_COUNT, readHourDraft, buildSelectedTime, getIndexFromOffset, getMiddleIndex, getSettledIndex } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('every hour round trips through AM/PM without mutating the selected date', () => {
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(2026, 8, 10, hour, 37, 25, 42);
    const original = date.getTime();
    const draft = readHourDraft(date);
    const result = buildSelectedTime(draft, date);
    assert.equal(result.getHours(), hour);
    assert.equal(result.getMinutes(), 37);
    assert.equal(result.getDate(), 10);
    assert.equal(result.getSeconds(), 0);
    assert.equal(result.getMilliseconds(), 0);
    assert.equal(date.getTime(), original);
  }
  assert.equal(readHourDraft(new Date(2026, 8, 10, 0)).period, 'AM');
  assert.equal(readHourDraft(new Date(2026, 8, 10, 12)).period, 'PM');
});

test('unset or invalid selection starts at noon and invalid drafts are rejected', () => {
  for (const date of [null, undefined, new Date(NaN)]) {
    assert.deepEqual(readHourDraft(date), { hour: '12', minute: '00', period: 'PM' });
  }
  for (const draft of [
    { hour: '0', minute: '00', period: 'AM' },
    { hour: '12', minute: '60', period: 'PM' },
    { hour: '12', minute: '00', period: 'invalid' },
  ]) assert.throws(() => buildSelectedTime(draft));
});

test('wheel offsets round and clamp; recenter preserves every hour and minute', () => {
  for (const values of [HOURS, MINUTES]) {
    const length = values.length * LOOP_COUNT;
    assert.equal(getIndexFromOffset(-44, length), 0);
    assert.equal(getIndexFromOffset(length * ITEM_HEIGHT, length), length - 1);
    assert.equal(getIndexFromOffset(ITEM_HEIGHT * 3.6, length), 4);
    for (let index = 0; index < length; index++) {
      const settled = getSettledIndex(index, values.length);
      assert.equal(values[settled % values.length], values[index % values.length]);
      assert.ok(settled >= values.length * 3 && settled <= length - values.length * 3);
    }
    for (const value of values) {
      const index = getMiddleIndex(values, value);
      assert.equal(values[index % values.length], value);
      assert.equal(getSettledIndex(index, values.length), index);
    }
  }
});

// Exercise animation completion and cancellation without a native renderer.
const { createRequire } = await import('node:module');
const { default: vm } = await import('node:vm');
const require = createRequire(import.meta.url);
const animationSource = require('@babel/core').transformSync(
  await readFile(new URL('../src/hooks/useModalAnimation.js', import.meta.url), 'utf8'),
  { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] },
).code;
function animationHarness() {
  let cursor = 0;
  const slots = [], effects = [], cleanups = [];
  const animations = [];
  const module = { exports: {} };
  const Animated = {
    Value: class { constructor(value) { this.value = value; } setValue(value) { this.value = value; } },
    timing: () => ({}),
    parallel: () => {
      const animation = { start(callback) { this.callback = callback; }, stop() { this.callback?.({ finished: false }); } };
      animations.push(animation);
      return animation;
    },
  };
  vm.runInNewContext(animationSource, {
    module, exports: module.exports,
    require: name => name === 'react'
      ? {
        useRef(current) { const i = cursor++; return slots[i] ||= { current }; },
        useEffect(fn, deps) {
          const i = cursor++;
          if (!slots[i] || deps.some((value, index) => value !== slots[i][index])) {
            slots[i] = deps;
            effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
          }
        },
      }
      : { Animated, Easing: { out: x => x, in: x => x, cubic: 1, ease: 2 } },
  });
  const events = [];
  const render = (visible = true) => {
    cursor = 0;
    const hook = module.exports.default(() => events.push('close'), { visible });
    effects.splice(0).forEach(fn => fn());
    return hook;
  };
  return { hook: render(), render, animations, events, unmount: () => cleanups.forEach(fn => fn?.()) };
}

test('double close commits once, only after the exit finishes', () => {
  const { hook, animations, events } = animationHarness();
  hook.handleShow();
  hook.animateClose(() => events.push('commit'));
  hook.animateClose(() => events.push('duplicate'));
  assert.equal(animations.length, 2);
  assert.deepEqual(events, []);
  animations.at(-1).callback({ finished: true });
  assert.deepEqual(events, ['close', 'commit']);
});

test('unmount or interrupted animation cannot commit a stale selection', () => {
  const { hook, animations, events, unmount } = animationHarness();
  hook.animateClose(() => events.push('commit'));
  unmount();
  animations.at(-1).callback({ finished: true });
  assert.deepEqual(events, []);
});

test('hiding and reopening invalidates the old close callback', () => {
  const { hook, render, animations, events } = animationHarness();
  hook.handleShow();
  hook.animateClose(() => events.push('stale'));
  const previous = animations.at(-1);
  render(false);
  const reopened = render(true);
  reopened.handleShow();
  previous.callback({ finished: true });
  assert.deepEqual(events, []);
  animations.at(-1).callback({ finished: true });
  reopened.animateClose(() => events.push('current'));
  const close = animations.at(-1);
  close.callback({ finished: true });
  close.callback({ finished: true });
  assert.deepEqual(events, ['close', 'current']);
});
