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
