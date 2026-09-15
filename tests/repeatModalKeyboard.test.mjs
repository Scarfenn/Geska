import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const compile = path => babel.transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
}).code;
const { default: getStyles } = loadDatabase(null, {
  entry: '../../src/features/tasks/styles/repeatModalStyles.js',
  stubs: { 'react-native': { StyleSheet: { create: styles => styles } } },
});
const styles = getStyles('basic', 'light');
const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const code = compile('../src/features/tasks/modals/SubModals/RepeatModal.js');
const domain = { exports: {} };
vm.runInNewContext(compile('../src/features/tasks/domain/repeatEditor.js'), { module: domain, exports: domain.exports, Date });

// Execute the real JSX and state updates; native keyboard/layout events are
// supplied by the harness, so these tests do not measure device animation.
function modal(platform, overrides = {}) {
  const saved = {};
  let closes = 0;
  let cursor = 0, tree, windowHeight = 800;
  const slots = [], effects = [];
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, j) => !Object.is(value, slots[i][j]))) {
        slots[i] = deps; effects.push(fn);
      }
    },
  };
  const native = {
    ...Object.fromEntries(['Modal', 'View', 'Text', 'TextInput', 'TouchableOpacity', 'TouchableWithoutFeedback', 'KeyboardAvoidingView'].map(name => [name, name])),
    Animated: { View: 'Animated.View' }, StyleSheet: { absoluteFillObject: {} },
    Keyboard: { dismiss() {} },
    Platform: { OS: platform }, useWindowDimensions: () => ({ height: windowHeight }),
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    Date, module, exports: module.exports,
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    require: name => {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react-native-reanimated') return {
        __esModule: true, default: { View: 'Reanimated.View', ScrollView: 'Reanimated.ScrollView' },
        LinearTransition: { duration: milliseconds => ({ milliseconds }) },
      };
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) };
      if (name.endsWith('/DatePickerModal')) return 'DatePickerModal';
      if (name.endsWith('/repeatEnd')) return loadDatabase(null, { entry: '../../src/features/tasks/domain/repeatEnd.js' });
      if (name.endsWith('/repeatEditor')) return domain.exports;
      if (name.endsWith('/repeatModalStyles')) return () => styles;
      if (name.endsWith('/useModalAnimation')) return () => ({ animateOpen() {}, animateClose() { closes++; }, closing: { current: false } });
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const props = {
    setRepeatMode: value => { saved.mode = value; },
    setRepeatDays: value => { saved.days = Array.from(value); },
    setRepeatInterval: value => { saved.interval = value; },
    setEndDate: value => { saved.endDate = value; },
    visible: true, repeatMode: 'monthly', repeatDays: ['15'], repeatInterval: 1, selectedDate: new Date(2026, 8, 15), ...overrides };
  const render = () => { cursor = 0; tree = module.exports.default(props); effects.splice(0).forEach(fn => fn()); };
  const find = type => {
    const results = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (node.type === type) results.push(node);
      node.children?.forEach(walk);
    }
    walk(tree); return results;
  };
  render(); render();
  return {
    find, saved,
    picker: () => find('DatePickerModal')[0].props,
    closes: () => closes,
    update(next) { Object.assign(props, next); render(); render(); },
    type(text) { find('TextInput')[0].props.onChangeText(text); render(); },
    press(label) {
      const button = find('TouchableOpacity').find(node => node.props.accessibilityLabel === label
        || node.children.some(child => child?.children?.includes(label)));
      assert.ok(button, label);
      if (!button.props.disabled) button.props.onPress();
      render();
    },
    layout(height, appWindowHeight = height) {
      windowHeight = appWindowHeight;
      find('Animated.View')[0].props.onLayout?.({ nativeEvent: { layout: { height } } });
      render();
    },
    maxHeight: () => find('Reanimated.View').flatMap(node => node.props.style || []).find(style => style?.maxHeight !== undefined).maxHeight,
    input: () => find('TextInput')[0],
  };
}

test('Android relies on native resize and restores modal space through repeated keyboard cycles without losing the draft', () => {
  const app = modal('android');
  const avoiding = app.find('KeyboardAvoidingView')[0];
  assert.equal(avoiding.props.enabled, false);
  assert.equal(avoiding.props.behavior, undefined);
  app.layout(800);
  const expanded = app.maxHeight();
  app.input().props.onChangeText('12');
  for (let i = 0; i < 3; i++) {
    app.layout(480);
    assert.ok(app.maxHeight() < expanded);
    // Even if an intermediate overlay measurement arrives last, current
    // window dimensions must restore the cap without waiting for onLayout.
    app.layout(560, 800);
    assert.equal(app.maxHeight(), expanded);
    assert.equal(app.input().props.value, '12');
  }
});

test('iOS retains padding avoidance and restores the height after the keyboard closes', () => {
  const app = modal('ios');
  const avoiding = app.find('KeyboardAvoidingView')[0];
  assert.equal(avoiding.props.enabled, true);
  assert.equal(avoiding.props.behavior, 'padding');
  app.layout(800);
  const expanded = app.maxHeight();
  app.layout(450, 800);
  // iOS padding constrains the flexible parent, not a saved height cap.
  assert.equal(app.maxHeight(), expanded);
  app.layout(800);
  assert.equal(app.maxHeight(), expanded);
});


test('screen size changes update the cap without capturing keyboard layout as a base', () => {
  const app = modal('android');
  app.layout(400);
  const compact = app.maxHeight();
  app.layout(900);
  const tall = app.maxHeight();
  assert.ok(tall > compact);
  app.layout(400);
  assert.equal(app.maxHeight(), compact);
  app.layout(500, 900);
  assert.equal(app.maxHeight(), tall);
  assert.equal(app.find('Animated.View')[0].props.onLayout, undefined);
});

test('every wrapper between the height cap and options can shrink while header and buttons stay fixed', () => {
  const app = modal('android');
  const shell = app.find('Reanimated.View').find(node => flatten(node.props.style).maxHeight !== undefined);
  const sliding = shell.children[0];
  const panel = sliding.children[0];
  const scroll = app.find('Reanimated.ScrollView')[0];
  for (const node of [shell, sliding, panel, scroll]) {
    const style = flatten(node.props.style);
    assert.equal(style.flexShrink, 1, node.type);
    assert.equal(style.minHeight, 0, node.type);
    assert.equal(style.height, undefined, 'height must stay content-driven');
  }
  assert.equal(flatten(panel.children[0].props.style).flexShrink, 0);
  assert.equal(flatten(panel.children.at(-1).props.style).flexShrink, 0);
});


test('each frequency remembers its interval, including visits to none and parent refreshes', () => {
  const app = modal('android', { repeatMode: 'daily', repeatInterval: 3 });
  assert.equal(app.input().props.value, '3');
  app.press('Semanal');
  assert.equal(app.input().props.value, '1');
  app.type('2');
  app.press('Mensual');
  app.type('4');
  app.press('Ninguno');
  app.press('Diario');
  assert.equal(app.input().props.value, '3');
  app.update({ repeatInterval: 9 });
  assert.equal(app.input().props.value, '3');
  app.press('Semanal');
  assert.equal(app.input().props.value, '2');
  app.press('Mensual');
  assert.equal(app.input().props.value, '4');
});

test('only the active interval is validated and applied', () => {
  const app = modal('android', { repeatMode: 'daily' });
  app.type('');
  app.press('Aplicar');
  assert.deepEqual(app.saved, {});
  app.press('Semanal');
  app.type('2');
  app.press('Diario');
  assert.equal(app.input().props.value, '');
  app.press('Semanal');
  app.press('Aplicar');
  assert.equal(app.saved.mode, 'weekly');
  assert.equal(app.saved.interval, 2);
  assert.equal(app.closes(), 1);
  app.update({ visible: false });
  app.update({ visible: true, repeatMode: app.saved.mode, repeatInterval: app.saved.interval });
  assert.equal(app.input().props.value, '2');
  app.press('Diario');
  assert.equal(app.input().props.value, '1');
});

test('cancel discards per-frequency edits on reopening without calling setters', () => {
  const app = modal('android', { repeatMode: 'daily', repeatInterval: 3 });
  app.type('8');
  app.press('Semanal');
  app.type('6');
  app.press('Cancelar');
  assert.deepEqual(app.saved, {});
  assert.equal(app.closes(), 1);
  app.update({ visible: false });
  app.update({ visible: true });
  assert.equal(app.input().props.value, '3');
  app.press('Semanal');
  assert.equal(app.input().props.value, '1');
});

test('step buttons preserve validation limits and affect only the current frequency', () => {
  const app = modal('android', { repeatMode: 'daily' });
  app.press('Reducir intervalo');
  assert.equal(app.input().props.value, '1');
  app.press('Aumentar intervalo');
  assert.equal(app.input().props.value, '2');
  app.press('Semanal');
  app.type(String(Number.MAX_SAFE_INTEGER));
  app.press('Aumentar intervalo');
  assert.equal(app.input().props.value, String(Number.MAX_SAFE_INTEGER));
  app.press('Diario');
  app.press('Reducir intervalo');
  assert.equal(app.input().props.value, '1');
  app.type('0');
  app.press('Ninguno');
  app.press('Aplicar');
  assert.equal(app.saved.mode, 'none');
  assert.equal(app.saved.interval, 1);
  assert.deepEqual(app.saved.days, []);
});


const futureTaskDate = () => { const date = new Date(); date.setDate(date.getDate() + 10); return date; };

test('repeat end picker shares the calendar and task-date minimum, rejecting earlier dates in the handler', () => {
  const start = futureTaskDate();
  const firstRepeat = new Date(start); firstRepeat.setDate(firstRepeat.getDate() + 3);
  const before = new Date(start); before.setDate(before.getDate() - 1);
  const app = modal('android', { selectedDate: start, endDate: null, repeatMode: 'daily' });
  app.type('3');
  app.press('Elegir fecha de término');
  assert.equal(app.picker().visible, true);
  assert.equal(app.picker().title, 'Fin de repetición');
  assert.equal(app.picker().minDate.toDateString(), firstRepeat.toDateString());
  assert.equal(app.picker().initialDate.toDateString(), firstRepeat.toDateString());
  app.picker().onSelect(before); app.update({});
  assert.equal(app.picker().value, null);
  app.picker().onClose(); app.picker().onSelect(firstRepeat); app.update({});
  assert.equal(app.picker().visible, false);
  assert.notEqual(app.picker().value, firstRepeat);
  assert.equal(app.picker().value.toDateString(), firstRepeat.toDateString());
  assert.equal(app.input().props.value, '3');
  assert.deepEqual(app.saved, {}, 'selection stays inside the repetition draft');
  app.press('Aplicar');
  assert.equal(app.saved.endDate.toDateString(), firstRepeat.toDateString());
  assert.equal(app.saved.interval, 3);
});

test('closing the calendar preserves the repeat draft; cancelling repeat discards the chosen end date', () => {
  const start = futureTaskDate();
  const original = new Date(start); original.setDate(original.getDate() + 5);
  const chosen = new Date(start); chosen.setDate(chosen.getDate() + 8);
  const app = modal('ios', { selectedDate: start, endDate: original, repeatMode: 'daily' });
  app.type('4');
  app.press('Elegir fecha de término');
  app.picker().onClose(); app.update({});
  assert.equal(app.picker().value.getTime(), original.getTime());
  assert.equal(app.input().props.value, '4');
  app.press('Elegir fecha de término');
  app.picker().onClose(); app.picker().onSelect(chosen); app.update({});
  app.press('Cancelar');
  assert.deepEqual(app.saved, {});
  app.update({ visible: false }); app.update({ visible: true });
  assert.equal(app.picker().value.getTime(), original.getTime());
  assert.equal(app.picker().visible, false);
});

test('an end before a changed start blocks applying and can be removed or corrected', () => {
  const start = futureTaskDate();
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const laterStart = new Date(start); laterStart.setDate(laterStart.getDate() + 2);
  const nextRepeat = new Date(laterStart); nextRepeat.setDate(nextRepeat.getDate() + 1);
  const app = modal('android', { selectedDate: start, endDate: end, repeatMode: 'daily' });
  app.update({ selectedDate: laterStart });
  app.press('Aplicar');
  assert.deepEqual(app.saved, {});
  assert.equal(app.picker().minDate.toDateString(), nextRepeat.toDateString());
  app.press('Sin fecha de término');
  app.press('Aplicar');
  assert.equal(app.saved.endDate, null);
});


test('summary follows the selected end-date draft and clearing it, before applying', () => {
  const start = futureTaskDate();
  const firstRepeat = new Date(start); firstRepeat.setDate(firstRepeat.getDate() + 1);
  const app = modal('android', { selectedDate: start, endDate: null, repeatMode: 'daily' });
  const summary = () => app.find('Text').find(node => node.props.style === styles.repeatSummary).children.join('');
  assert.equal(summary(), 'Todos los días, sin fecha de término.');
  app.press('Elegir fecha de término');
  app.picker().onClose(); app.picker().onSelect(firstRepeat); app.update({});
  const formatted = firstRepeat.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  assert.equal(summary(), `Todos los días, hasta el ${formatted}.`);
  assert.deepEqual(app.saved, {});
  app.press('Sin fecha de término');
  assert.equal(summary(), 'Todos los días, sin fecha de término.');
});

test('weekly day and interval edits recompute the first occurrence and block an earlier end', () => {
  const start = futureTaskDate();
  start.setDate(start.getDate() + (2 - start.getDay() + 7) % 7); // Tuesday.
  const friday = new Date(start); friday.setDate(friday.getDate() + 3);
  const monday = new Date(start); monday.setDate(monday.getDate() + 13); // Next eligible fortnight.
  const app = modal('android', { selectedDate: start, repeatMode: 'weekly', repeatDays: ['V'], repeatInterval: 1, endDate: friday });
  assert.equal(app.picker().minDate.toDateString(), friday.toDateString());
  app.press('lunes'); app.press('viernes');
  app.type('2');
  assert.equal(app.picker().minDate.toDateString(), monday.toDateString());
  assert.equal(app.picker().value.getTime(), friday.getTime(), 'keep the invalid date visible rather than silently moving it');
  app.press('Aplicar');
  assert.deepEqual(app.saved, {});
  app.press('Elegir fecha de término');
  app.picker().onClose(); app.picker().onSelect(monday); app.update({});
  app.press('Aplicar');
  assert.equal(app.saved.endDate.toDateString(), monday.toDateString());
  assert.deepEqual(app.saved.days, ['L']);
  assert.equal(app.saved.interval, 2);
});

test('impossible monthly recurrence disables date selection and apply until corrected', () => {
  const app = modal('android', { selectedDate: new Date(2030, 1, 1), repeatMode: 'monthly', repeatDays: ['31'], repeatInterval: 12, endDate: null });
  assert.equal(app.picker().minDate, null);
  app.press('Elegir fecha de término');
  assert.equal(app.picker().visible, false);
  app.press('Aplicar');
  assert.deepEqual(app.saved, {});
  app.type('1');
  assert.equal(app.picker().minDate.getMonth(), 2);
  assert.equal(app.picker().minDate.getDate(), 31);
  app.press('Aplicar');
  assert.equal(app.saved.interval, 1);
});

test('December 15 monthly task cannot end before its first repetition on January 15', () => {
  const start = new Date(2026, 11, 15);
  const firstRepeat = new Date(2027, 0, 15);
  const app = modal('android', { selectedDate: start, repeatMode: 'monthly', repeatDays: ['15'], repeatInterval: 1, endDate: start });
  assert.equal(app.picker().minDate.toDateString(), firstRepeat.toDateString());
  app.press('Aplicar');
  assert.deepEqual(app.saved, {});
  app.press('Elegir fecha de término');
  app.picker().onSelect(start); app.update({});
  assert.equal(app.picker().value.toDateString(), start.toDateString());
  app.picker().onSelect(new Date(2027, 0, 14)); app.update({});
  assert.equal(app.picker().value.toDateString(), start.toDateString());
  app.picker().onClose(); app.picker().onSelect(firstRepeat); app.update({});
  app.press('Aplicar');
  assert.equal(app.saved.endDate.toDateString(), firstRepeat.toDateString());
});

test('repeat end calendar decorations update with the local interval draft', () => {
  const start = futureTaskDate();
  const next = new Date(start); next.setDate(next.getDate() + 3);
  const app = modal('android', { selectedDate: start, repeatMode: 'daily', repeatInterval: 1 });
  assert.equal(app.picker().isDateHighlighted(next), false);
  app.type('3');
  assert.equal(app.picker().isDateHighlighted(next), true);
  app.type('2');
  assert.equal(app.picker().isDateHighlighted(next), false);
});
