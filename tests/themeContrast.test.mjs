import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const native = { StyleSheet: { create: value => value }, ...Object.fromEntries(['View', 'Text', 'TouchableOpacity'].map(name => [name, name])) };
const load = path => loadDatabase(null, { entry: `../../src/${path}.js`, stubs: { 'react-native': native } });
const { themes } = load('styles/themes');
const combinations = Object.entries(themes).flatMap(([name, modes]) => Object.entries(modes).map(([mode, theme]) => ({ name, mode, theme })));
const flatten = tree => Array.isArray(tree) ? tree.flatMap(flatten) : tree && typeof tree === 'object' ? [tree, ...flatten(tree.children || [])] : [];
const styleOf = node => Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useState: value => [value, () => {}], useRef: () => ({ current: null }) };
function jsx(path, stubs = {}) {
  const module = { exports: {} };
  const code = babel.transformSync(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  }).code;
  vm.runInNewContext(code, { module, exports: module.exports, React, console, require(spec) {
    if (spec in stubs) return stubs[spec];
    if (spec === 'react-native') return native;
    if (spec === 'react') return React;
    if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (spec.startsWith('@/') && (spec.endsWith('Styles') || spec === '@/styles/themes')) return load(spec.slice(2));
    throw new Error(`Unexpected dependency: ${spec}`);
  } });
  return module.exports.default;
}
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
const luminance = channels => channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
function contrast(foreground, background, opacity = 1) {
  const bg = rgb(background);
  const fg = rgb(foreground).slice(0, 3).map((value, i) => value * opacity + bg[i] * (1 - opacity));
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function readable(foreground, background, threshold, label, opacity = 1) {
  assert.match(foreground, /^#[0-9a-f]{6}$/i, `${label}: no hidden alpha`);
  assert.ok(contrast(foreground, background, opacity) >= threshold, `${label}: ${contrast(foreground, background, opacity).toFixed(3)} < ${threshold}`);
}

test('rendered task hours and preview hours retain text contrast across all twenty palettes', () => {
  const Card = jsx('src/features/tasks/components/TaskCard.js');
  const Preview = jsx('src/features/settings/components/ThemePreview.js');
  for (const { name, mode, theme } of combinations) {
    for (const done of [false, true]) {
      const tree = Card({ themeName: name, mode, task: { id: 'demo', title: 'Demo', time: '18:00', done } });
      const hour = flatten(tree).find(node => node.type === 'Text' && node.children.includes('18:00'));
      const style = styleOf(hour);
      assert.equal(style.color, done ? theme.doneText : theme.inactiveCategoryText);
      readable(style.color, theme.card, 4.5, `${name}/${mode} hour done=${done}`, style.opacity ?? 1);
    }
    const previewHour = flatten(Preview({ palette: theme })).find(node => node.type === 'Text' && node.children.includes('18:00'));
    const style = styleOf(previewHour);
    assert.equal(style.color, theme.inactiveCategoryText);
    readable(style.color, theme.card, 4.5, `${name}/${mode} preview hour`, style.opacity ?? 1);
  }
});

test('task and subtask indicators meet non-text contrast on both real surfaces', () => {
  for (const { name, mode, theme } of combinations) {
    for (const token of ['pendingCheck', 'doneCheck']) for (const surface of ['card', 'background']) {
      readable(theme[token], theme[surface], 3, `${name}/${mode} ${token}/${surface}`);
    }
  }
});

test('input outlines, placeholders, empty text and date indicators use legible tokens without changing decorative borders', () => {
  const modal = load('styles/modalStyles').default;
  const account = load('features/account/styles/accountStyles').default;
  const repeat = load('features/tasks/styles/repeatModalStyles').default;
  const dates = load('features/tasks/styles/datePickerModalStyles').default;
  const list = load('features/tasks/styles/taskListStyles').default;
  for (const { name, mode, theme } of combinations) {
    const m = modal(name, mode), a = account(name, mode), r = repeat(name, mode), d = dates(name, mode), l = list(name, mode);
    for (const color of [m.input.borderColor, a.input.borderColor, r.repeatIntervalInput.borderBottomColor]) {
      for (const surface of [theme.card, theme.background]) readable(color, surface, 3, `${name}/${mode} input border`);
    }
    readable(m.textSecondary.color, m.input.backgroundColor, 4.5, `${name}/${mode} placeholder`);
    for (const textStyle of [l.taskEmptyTitle, l.taskEmptyDescription]) readable(textStyle.color, theme.background, 4.5, `${name}/${mode} empty text`);
    for (const indicator of [d.pickerToday, d.pickerHighlighted]) readable(indicator.borderColor, theme.card, 3, `${name}/${mode} date indicator`);
    assert.equal(d.pickerSelected.backgroundColor, theme.primary);
    assert.equal(a.form.borderColor, theme.border);
    assert.equal(m.optionRow.borderBottomColor, theme.border);
  }
});

test('actual Drawer options provide opaque selected backgrounds and readable selected text in every palette', () => {
  let preferences;
  const stubs = {
    '@/hooks/useThemePreferences': () => preferences,
    '@/hooks/useAndroidAppTheme': () => {}, '@/hooks/useAndroidNavigationBar': () => {},
    'expo-splash-screen': { preventAutoHideAsync: () => Promise.resolve() },
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer', DefaultTheme: { colors: {} }, DarkTheme: { colors: {} } },
    '@react-navigation/drawer': { createDrawerNavigator: () => ({ Navigator: 'DrawerNavigator', Screen: 'DrawerScreen' }) },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureHandlerRootView' },
  };
  for (const name of ['tasks/TasksScreen', 'calendar/CalendarScreen', 'account/AccountScreen', 'settings/SettingsScreen', 'settings/ThemeScreen']) stubs[`@/features/${name}`] = name;
  stubs['@/components/CustomDrawer'] = 'CustomDrawer';
  const App = jsx('App.js', stubs);
  for (const { name, mode, theme } of combinations) {
    preferences = { themeName: name, mode, currentTheme: theme, isThemeLoaded: true };
    const options = flatten(App()).find(node => node.type === 'DrawerNavigator').props.screenOptions;
    assert.equal(options.drawerActiveBackgroundColor, theme.primary);
    assert.equal(options.drawerActiveTintColor, theme.onPrimary);
    readable(options.drawerActiveTintColor, options.drawerActiveBackgroundColor, 4.5, `${name}/${mode} drawer`);
  }
});
