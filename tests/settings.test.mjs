import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

function harness(nativeVersion = null) {
  const cache = new Map(); let selectorProps;
  const React = { createElement(type, props, ...children) {
    const allProps = { ...props, children };
    return typeof type === 'function' ? type(allProps) : { type, props: allProps, children };
  } };
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    if (path.endsWith('.json')) return JSON.parse(source);
    const module = { exports: {} };
    const code = babel.transformSync(source, { configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
    }).code;
    vm.runInNewContext(code, { module, exports: module.exports, React, require(spec) {
      if (spec === 'react-native') return { ...Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'StatusBar'].map(n => [n, n])), StyleSheet: { create: x => x } };
      if (spec === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (spec === 'expo-application') return { nativeApplicationVersion: nativeVersion };
      if (spec === '../../../../app.json') return load('app.json');
      if (spec === '@/components/ThemeSelector') return props => {
        selectorProps = props;
        return props.renderTrigger({ onPress() {}, expanded: false });
      };
      if (spec.startsWith('@/styles/') || spec.startsWith('@/features/settings/')) return load('src/' + spec.slice(2) + '.js');
      throw new Error(`Unexpected dependency (including cloud/storage): ${spec}`);
    } });
    cache.set(path, module.exports); return module.exports;
  }
  return { load, get selectorProps() { return selectorProps; } };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.children || [])] : [];
}

test('settings renders offline in every theme/mode; menu, theme and account are actionable', () => {
  const h = harness('1.2.3');
  const Screen = h.load('src/features/settings/SettingsScreen.js').default;
  const themes = h.load('src/styles/themes.js').themes;
  for (const themeName of Object.keys(themes)) for (const mode of ['light', 'dark']) {
    let opened = 0, destination;
    const setThemeName = () => {}, setMode = () => {};
    const tree = Screen({ navigation: { openDrawer() { opened++; }, navigate(name) { destination = name; } }, themeName, mode, setThemeName, setMode });
    const all = nodes(tree);
    assert.equal(tree.props.style.backgroundColor, themes[themeName][mode].background);
    const buttons = all.filter(n => n.props.accessibilityRole === 'button');
    assert.equal(buttons.length, 3);
    buttons.find(n => n.props.accessibilityLabel === 'Abrir menú de navegación').props.onPress();
    assert.equal(opened, 1);
    buttons.find(n => n.props.accessibilityLabel.startsWith("Cuenta.")).props.onPress();
    assert.equal(destination, "Cuenta");
    assert.ok(buttons.some(n => n.props.accessibilityLabel.includes(mode === 'dark' ? 'Oscuro' : 'Claro')));
    assert.ok(all.some(n => n.props.accessibilityLabel === 'Acerca de Geska. Versión 1.2.3'));
    assert.equal(h.selectorProps.setThemeName, setThemeName);
    assert.equal(h.selectorProps.setMode, setMode);
  }
});

test('app version falls back to Expo config without native application metadata', () => {
  const h = harness();
  assert.equal(h.load('src/features/settings/services/appInfo.js').appVersion, h.load('app.json').expo.version);
});

test('navigation and shared selector JSX compile after adding Settings', () => {
  for (const path of ['App.js', 'src/components/ThemeSelector.js']) {
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.doesNotThrow(() => babel.transformSync(source, { configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
    }));
  }
});
