import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
import { loadDatabase } from './helpers/databaseHarness.mjs';

process.env.TZ = 'America/Santiago';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const compile = path => babel.transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
}).code;
const source = compile('../src/features/tasks/modals/SubModals/DatePickerModal.js');
const stubs = { 'react-native': { StyleSheet: { create: styles => styles } } };
const load = spec => loadDatabase(null, { entry: '../../src/' + spec.slice(2) + '.js', stubs });

// Runs the real picker JSX with deterministic hooks. This covers interactions,
// not native pixel layout or animation timing.
function picker(overrides = {}) {
  let tree, cursor = 0, windowHeight = 800;
  const slots = [], selected = [];
  const closing = { current: false };
  let closeCount = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
  };
  const props = { visible: true, themeName: 'basic', mode: 'light', value: new Date(2026, 8, 15),
    onSelect: date => selected.push(date), onClose: () => closeCount++, ...overrides };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [2026, 8, 14, 12])); } }, module, exports: module.exports,
    React: { createElement: (type, props, ...children) => typeof type === 'function' ? type(props) : ({ type, props: props || {}, children }) },
    require: spec => {
      if (spec === 'react') return react;
      if (spec === 'react-native') return {
        ...Object.fromEntries(['Modal', 'View', 'Text', 'TouchableOpacity', 'TouchableWithoutFeedback', 'ScrollView'].map(n => [n, n])),
        Animated: { View: 'Animated.View' }, StyleSheet: { absoluteFillObject: {} }, useWindowDimensions: () => ({ height: windowHeight }),
      };
      if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (spec === 'expo-haptics') return { selectionAsync: () => Promise.resolve() };
      if (spec === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) };
      if (spec.endsWith('/useModalAnimation')) return onClose => ({
        closing, animateOpen() {}, animateClose(afterClose) {
          if (closing.current) return;
          closing.current = true; onClose(); if (typeof afterClose === 'function') afterClose();
        },
      });
      if (spec.startsWith('@/')) return load(spec);
      throw new Error(`Unexpected import: ${spec}`);
    },
  });
  const render = () => { cursor = 0; tree = module.exports.default(props); };
  const find = type => {
    const found = [];
    const walk = node => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (node.type === type) found.push(node);
      node.children?.forEach(walk);
    };
    walk(tree); return found;
  };
  const button = label => find('TouchableOpacity').find(node => node.props.accessibilityLabel === label || node.children.some(child => child?.children?.includes(label)));
  render();
  return {
    find, button, selected, closes: () => closeCount,
    press(label) { const node = button(label); assert.ok(node, label); if (!node.props.disabled) node.props.onPress(); render(); },
    day(number) { return find('TouchableOpacity').find(node => node.children.some(child => child?.children?.includes(number))); },
    update(next) { Object.assign(props, next); render(); },
    reopen(next = {}) { props.visible = false; render(); slots.length = 0; closing.current = false; Object.assign(props, { visible: true }, next); render(); },
    resize(height) { windowHeight = height; render(); },
  };
}

test('selecting a day returns a fresh local date exactly once and closes', () => {
  const original = new Date(2026, 8, 15, 15);
  const app = picker({ value: original, title: 'Fecha de la tarea' });
  assert.equal(app.day(15).props.accessibilityState.selected, true);
  const day = app.day(20);
  day.props.onPress(); day.props.onPress();
  assert.equal(app.selected.length, 1);
  assert.equal(app.selected[0].getFullYear(), 2026);
  assert.equal(app.selected[0].getMonth(), 8);
  assert.equal(app.selected[0].getDate(), 20);
  assert.notEqual(app.selected[0], original);
  assert.equal(original.getDate(), 15);
  assert.equal(app.closes(), 1);
});

test('browsing months, years and today never selects; reopening starts at the supplied value', () => {
  const app = picker();
  app.press('Mes siguiente');
  app.press('Elegir mes y año');
  assert.equal(app.button('Elegir año'), undefined);
  for (let year = 2026; year < 2030; year++) app.press('Año siguiente');
  app.press('Febrero 2030');
  assert.ok(app.button('Elegir mes y año').children[0].children.includes('Febrero 2030'));
  assert.equal(app.day(29), undefined);
  app.press('Ir a hoy');
  assert.ok(app.find('TouchableOpacity').some(node => node.props.accessibilityHint === 'Hoy'));
  assert.deepEqual(app.selected, []);
  assert.equal(app.closes(), 0);
  app.press('Cancelar');
  app.reopen();
  assert.ok(app.day(15).props.accessibilityState.selected);
  assert.ok(app.button('Elegir mes y año').children[0].children.includes('Septiembre 2026'));
});

test('limits disable dates, months, years and navigation; an initial date does not select anything', () => {
  const app = picker({ value: null, initialDate: new Date(2026, 8, 15), minDate: new Date(2026, 8, 10, 23), maxDate: new Date(2026, 8, 20) });
  assert.equal(app.day(9).props.disabled, true);
  assert.equal(app.day(10).props.disabled, false);
  assert.equal(app.day(20).props.disabled, false);
  assert.equal(app.day(21).props.disabled, true);
  assert.equal(app.day(15).props.accessibilityState.selected, false);
  app.day(9).props.onPress(); // Handler also rejects invalid selection.
  assert.equal(app.selected.length, 0);
  assert.equal(app.button('Mes anterior').props.disabled, true);
  assert.equal(app.button('Mes siguiente').props.disabled, true);
  app.press('Elegir mes y año');
  assert.equal(app.button('Agosto 2026').props.disabled, true);
  assert.equal(app.button('Septiembre 2026').props.disabled, false);
  assert.equal(app.button('Elegir año'), undefined);
  assert.equal(app.button('Año anterior').props.disabled, true);
  assert.equal(app.button('Año siguiente').props.disabled, true);
});

test('cancel, Android back and backdrop dismissal never commit a date', () => {
  for (const method of ['cancel', 'back', 'backdrop']) {
    const app = picker();
    app.press('Mes siguiente');
    if (method === 'cancel') app.press('Cancelar');
    if (method === 'back') app.find('Modal')[0].props.onRequestClose();
    if (method === 'backdrop') app.find('TouchableWithoutFeedback')[0].props.onPress();
    assert.deepEqual(app.selected, []);
    assert.equal(app.closes(), 1);
  }
});

test('window resizing changes the panel cap without resetting month navigation', () => {
  const app = picker();
  const cap = () => app.find('Animated.View')[1].props.style.at(-1).maxHeight;
  const full = cap();
  app.press('Mes siguiente');
  app.resize(450);
  assert.ok(cap() < full);
  app.resize(800);
  assert.equal(cap(), full);
  assert.ok(app.button('Elegir mes y año').children[0].children.includes('Octubre 2026'));
});

test('TimeModal routes date selection to the task draft without modifying repetition end', () => {
  const { createScheduleDraft, scheduleDraftReducer } = load('@/features/tasks/domain/scheduleDraft');
  const endDate = new Date(2026, 11, 31);
  let draft = createScheduleDraft({ selectedDate: new Date(2026, 8, 15), endDate, reminder: { type: 'all_day', value: 0 } });
  let pickerProps;
  const module = { exports: {} };
  vm.runInNewContext(compile('../src/features/tasks/modals/TimeModal.js'), {
    module, exports: module.exports,
    React: { createElement(type, props, ...children) {
      if (typeof type === 'function') return type(props);
      if (type === 'DatePickerModal') pickerProps = props;
      return { type, props, children };
    } },
    require: spec => {
      if (spec === 'react-native') return { Modal: 'Modal', View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', TouchableWithoutFeedback: 'TouchableWithoutFeedback', Animated: { View: 'Animated.View' } };
      if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (spec.endsWith('/useModalAnimation')) return () => ({ animateOpen() {}, animateClose() {} });
      if (spec.endsWith('/useScheduleDraft')) return () => ({
        draft, activeModal: 'date', draftDate: draft.date, draftEndDate: draft.endDate, minTaskDate: new Date(2026, 8, 14),
        handleDateSelected: date => { draft = scheduleDraftReducer(draft, { field: 'date', value: date }); },
        setActiveModal() {},
      });
      if (spec.includes('/SubModals/')) return spec.split('/').at(-1);
      return load(spec);
    },
  });
  module.exports.default({ visible: true, themeName: 'basic', mode: 'light' });
  assert.equal(pickerProps.visible, true);
  assert.equal(pickerProps.title, 'Fecha de la tarea');
  assert.equal(pickerProps.value.getDate(), 15);
  assert.equal(pickerProps.minDate.getDate(), 14);
  const chosen = new Date(2026, 8, 20);
  pickerProps.onSelect(chosen);
  assert.equal(draft.date.getDate(), 20);
  assert.notEqual(draft.date, chosen);
  assert.equal(draft.endDate.getTime(), endDate.getTime());
  assert.equal(draft.reminder, null);
});


test('a past task opens at the minimum month and cannot navigate or select before today', () => {
  const today = new Date(2026, 8, 14);
  const app = picker({ value: new Date(2025, 0, 1), minDate: today });
  assert.ok(app.button('Elegir mes y año').children[0].children.includes('Septiembre 2026'));
  assert.equal(app.day(13).props.disabled, true);
  assert.equal(app.day(14).props.disabled, false);
  app.day(13).props.onPress();
  assert.deepEqual(app.selected, []);
  assert.equal(app.button('Mes anterior').props.disabled, true);
  app.press('Elegir mes y año');
  assert.equal(app.button('Agosto 2026').props.disabled, true);
  assert.equal(app.button('Año anterior').props.disabled, true);
  app.press('Año siguiente');
  assert.equal(app.button('Enero 2027').props.disabled, false);
  app.press('Año anterior');
  assert.equal(app.button('Agosto 2026').props.disabled, true);
});

test('returning to the current year clamps the browsing month before returning to the calendar', () => {
  const app = picker({ value: new Date(2027, 0, 1), minDate: new Date(2026, 8, 14) });
  app.press('Elegir mes y año');
  app.press('Año anterior');
  app.press('Volver al calendario');
  assert.ok(app.button('Elegir mes y año').children[0].children.includes('Septiembre 2026'));
  assert.equal(app.button('Mes anterior').props.disabled, true);
});

test('optional decorative borders do not change selection, limits, or selected-day styling', () => {
  const app = picker({ minDate: new Date(2026, 8, 10), isDateHighlighted: date => [9, 15, 18].includes(date.getDate()), highlightedDateHint: 'Próxima ocurrencia de la tarea' });
  const style = day => Object.assign({}, ...app.day(day).props.style.filter(Boolean));
  assert.equal(style(18).borderStyle, 'dashed');
  assert.equal(app.day(18).props.accessibilityHint, 'Próxima ocurrencia de la tarea');
  assert.equal(style(15).borderStyle, 'solid', 'selected style takes precedence');
  assert.equal(app.day(9).props.accessibilityHint, undefined, 'disabled dates are not decorated');
  assert.equal(style(16).borderStyle, undefined);
  app.day(16).props.onPress();
  assert.equal(app.selected[0].getDate(), 16, 'non-occurrence dates remain valid end dates');
  const plain = picker();
  assert.equal(Object.assign({}, ...plain.day(18).props.style.filter(Boolean)).borderStyle, undefined);
});

test('historical decoration is distinct, accessible and only shown on selectable dates', () => {
  const { isHistoricalTaskDate } = load('@/features/tasks/domain/taskDates');
  const isDateHistorical = date => isHistoricalTaskDate(date, new Date(2026, 8, 14));
  const app = picker({ value: new Date(2026, 8, 12), minDate: new Date(2026, 7, 15), isDateHistorical });
  const style = day => Object.assign({}, ...app.day(day).props.style.filter(Boolean));
  assert.equal(style(13).borderStyle, 'dotted');
  assert.match(app.day(13).props.accessibilityHint, /Fecha histórica/);
  assert.equal(style(12).borderStyle, 'solid', 'selection remains legible');
  assert.ok(app.day(12).children.some(c => c?.props?.name === 'time-outline'), 'selected historical day keeps its marker');
  assert.equal(app.day(14).props.accessibilityHint, 'Hoy');
  assert.equal(app.day(15).props.accessibilityHint, undefined);
  app.press('Mes anterior');
  assert.equal(app.day(14).props.disabled, true);
  assert.equal(app.day(14).props.accessibilityHint, undefined);
  assert.equal(app.day(15).props.disabled, false);
  app.day(15).props.onPress();
  assert.equal(app.selected[0].getMonth(), 7);
  assert.equal(app.selected[0].getDate(), 15);
});

test('TimeModal disables historical scheduling, preserves legacy drafts and re-enables it for today', () => {
  let state, active = null, tree;
  const { default: useScheduleDraft } = loadDatabase(null, {
    entry: '../../src/features/tasks/hooks/useScheduleDraft.js',
    stubs: { react: {
      useReducer(reducer, props, create) { state ??= create(props); return [state, action => { state = reducer(state, action); }]; },
      useState(initial) { return [active ?? initial, value => { active = value; }]; },
    } },
  });
  const module = { exports: {} };
  vm.runInNewContext(compile('../src/features/tasks/modals/TimeModal.js'), {
    module, exports: module.exports,
    React: { createElement: (type, props, ...children) => typeof type === 'function' ? type(props) : ({ type, props: props || {}, children }) },
    require: spec => {
      if (spec === 'react-native') return { Modal: 'Modal', View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', TouchableWithoutFeedback: 'TouchableWithoutFeedback', Animated: { View: 'Animated.View' } };
      if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (spec.endsWith('/useModalAnimation')) return () => ({ animateOpen() {}, animateClose() {} });
      if (spec.endsWith('/useScheduleDraft')) return useScheduleDraft;
      if (spec.includes('/SubModals/')) return spec.split('/').at(-1);
      return load(spec);
    },
  });
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const props = { visible: true, themeName: 'basic', mode: 'light', selectedDate: yesterday, repeatMode: 'weekly', repeatDays: ['L'], repeatInterval: 1 };
  const render = () => { tree = module.exports.default(props); };
  const all = () => {
    const nodes = []; const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; nodes.push(node); node.children?.forEach(walk); }; walk(tree); return nodes;
  };
  const row = icon => all().find(n => n.type === 'TouchableOpacity' && JSON.stringify(n.children).includes(icon));
  render();
  assert.equal(state.repeatMode, 'weekly');
  for (const icon of ['repeat-outline', 'notifications-outline']) {
    assert.equal(row(icon).props.disabled, true);
    row(icon).props.onPress(); assert.equal(active, null);
  }
  assert.ok(!row('time-outline').props.disabled);
  const picker = all().find(n => n.type === 'DatePickerModal');
  picker.props.onSelect(yesterday); render();
  assert.equal(state.repeatMode, 'none');
  picker.props.onSelect(today); render();
  assert.equal(row('repeat-outline').props.disabled, false);
  assert.equal(row('notifications-outline').props.disabled, false);
  row('repeat-outline').props.onPress(); assert.equal(active, 'repeat');
});
