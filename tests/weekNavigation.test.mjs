import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const require = createRequire(import.meta.url);
const calendar = loadDatabase(null, { entry: '../../src/features/tasks/domain/calendarDates.js' });
const code = require('@babel/core').transformSync(readFileSync(new URL('../src/features/tasks/hooks/useWeekNavigation.js', import.meta.url), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;

function harness() {
  const cleanups = [], animations = [], frames = new Map(), selected = [];
  let id = 0;
  const createAnimation = () => {
    const animation = { start(callback) { this.callback = callback; }, stop() { this.callback?.({ finished: false }); } };
    animations.push(animation); return animation;
  };
  const module = { exports: {} };
  const State = { BEGAN: 1, END: 2, CANCELLED: 3, FAILED: 4 };
  vm.runInNewContext(code, {
    module, exports: module.exports, Date,
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    require: name => {
      if (name === 'react') return {
        useRef: current => ({ current }), useState: value => [value, () => {}],
        useEffect: fn => cleanups.push(fn()),
      };
      if (name === 'react-native') return {
        Animated: { Value: class { setValue() {} }, timing: createAnimation, spring: createAnimation, event: () => () => {} },
        Easing: { in: value => value, out: value => value, cubic: 1 },
      };
      if (name === 'react-native-gesture-handler') return { State };
      if (name === 'expo-haptics') return { selectionAsync: () => Promise.resolve() };
      return calendar;
    },
  });
  const hook = module.exports.default(new Date(2026, 11, 28), value => selected.push(value), 360);
  return { hook, animations, frames, selected, State, unmount: () => cleanups.forEach(fn => fn?.()) };
}

test('rapid week changes make one transition and select the next week after exit', () => {
  const { hook, animations, selected, frames } = harness();
  hook.goNextWeek(); hook.goNextWeek();
  assert.equal(animations.length, 1); assert.equal(selected.length, 0);
  animations[0].callback({ finished: true });
  assert.equal(selected.length, 1); assert.equal(selected[0].getFullYear(), 2027); assert.equal(selected[0].getDate(), 4);
  frames.values().next().value();
  animations[1].callback({ finished: true });
});

test('unmount cancels the pending entrance frame and stale exit cannot select a date', () => {
  const first = harness();
  first.hook.goNextWeek(); first.unmount();
  first.animations[0].callback({ finished: true });
  assert.equal(first.selected.length, 0);
  const second = harness();
  second.hook.goNextWeek(); second.animations[0].callback({ finished: true });
  second.unmount(); assert.equal(second.frames.size, 0);
});

test('short or cancelled gestures return to center without changing date', () => {
  const { hook, State, selected, animations } = harness();
  hook.onHandlerStateChange({ nativeEvent: { state: State.END, translationX: 10, velocityX: 20 } });
  hook.onHandlerStateChange({ nativeEvent: { state: State.CANCELLED } });
  assert.equal(selected.length, 0); assert.equal(animations.length, 2);
});
