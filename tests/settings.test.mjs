import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

function harness(nativeVersion = null) {
  const cache = new Map();
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
      if (spec.startsWith('@/styles/') || spec.startsWith('@/features/settings/')) return load('src/' + spec.slice(2) + '.js');
      throw new Error(`Unexpected dependency (including cloud/storage): ${spec}`);
    } });
    cache.set(path, module.exports); return module.exports;
  }
  return { load };
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
    buttons.find(n => n.props.accessibilityLabel.startsWith("Tema.")).props.onPress();
    assert.equal(destination, "ThemeScreen");
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

const flattenStyle = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

test('ThemeScreen renders every real family in both modes, with token previews and accessible selection', () => {
  const h = harness();
  const Screen = h.load('src/features/settings/ThemeScreen.js').default;
  const themes = h.load('src/styles/themes.js').themes;
  for (const themeName of Object.keys(themes)) for (const mode of ['light', 'dark']) {
    let familyCall, modeCall, destination;
    const tree = Screen({ themeName, mode, setThemeName: name => { familyCall = name; }, setMode: value => { modeCall = value; }, navigation: { navigate: name => { destination = name; } } });
    const all = nodes(tree);
    assert.equal(tree.type, 'SafeAreaView');
    assert.equal(tree.props.style.backgroundColor, themes[themeName][mode].background);
    assert.ok(all.some(n => n.type === 'ScrollView'));
    const cards = all.filter(n => n.props.accessibilityLabel?.startsWith('Tema '));
    assert.equal(cards.length, Object.keys(themes).length);
    assert.equal(cards.filter(n => n.props.accessibilityState.selected).length, 1);
    for (const [index, name] of Object.keys(themes).entries()) {
      const card = cards[index], palette = themes[name][mode];
      assert.equal(card.props.accessibilityLabel, `Tema ${name.charAt(0).toUpperCase() + name.slice(1)}`);
      assert.equal(card.props.accessibilityRole, 'button');
      assert.equal(card.props.accessibilityState.selected, name === themeName);
      const check = nodes(card).find(n => n.props.name === 'checkmark-circle');
      assert.equal(Boolean(check), name === themeName);
      assert.equal(flattenStyle(card.props.style).borderColor, name === themeName ? themes[themeName][mode].primaryText : themes[themeName][mode].border);
      const preview = nodes(card).find(n => n.props.accessibilityElementsHidden);
      assert.equal(flattenStyle(preview.props.style).backgroundColor, palette.background);
      assert.deepEqual(nodes(preview).slice(1).map(n => flattenStyle(n.props.style).backgroundColor), [palette.primary, palette.inactiveCategory, palette.card, palette.doneCheck]);
      card.props.onPress();
      assert.equal(familyCall, name);
      assert.equal(modeCall, undefined);
    }
    for (const [label, value] of [['Claro', 'light'], ['Oscuro', 'dark']]) {
      const button = all.find(n => n.props.accessibilityLabel === label);
      assert.equal(button.props.accessibilityState.selected, mode === value);
      assert.equal(flattenStyle(button.props.style).backgroundColor, mode === value ? themes[themeName][mode].primary : undefined);
      button.props.onPress();
      assert.equal(modeCall, value);
    }
    all.find(n => n.props.accessibilityLabel === 'Volver a Ajustes').props.onPress();
    assert.equal(destination, 'Ajustes');
  }
});

test('ThemeScreen derives families dynamically and has no storage or local state dependencies', () => {
  // The strict harness rejects React hooks and all storage/service imports.
  const h = harness();
  const themes = h.load('src/styles/themes.js').themes;
  const Screen = h.load('src/features/settings/ThemeScreen.js').default;
  themes.extraLongFamilyName = themes.ocean;
  const tree = Screen({ themeName: 'extraLongFamilyName', mode: 'dark', navigation: {}, setThemeName() {}, setMode() {} });
  assert.ok(nodes(tree).some(n => n.props.accessibilityLabel === 'Tema ExtraLongFamilyName' && n.props.accessibilityState.selected));
});

test('App passes existing preference setters to hidden ThemeScreen and CustomDrawer preserves its hidden options', () => {
  const source = readFileSync(new URL('../App.js', import.meta.url), 'utf8');
  const ast = babel.parseSync(source, { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
  let route, screen;
  babel.traverse(ast, { JSXElement(path) {
    const opening = path.node.openingElement;
    if (opening.name.name === 'ThemeScreen') screen = opening;
    if (opening.attributes.some(a => a.name?.name === 'name' && a.value?.value === 'ThemeScreen')) route = opening;
  } });
  assert.ok(route); assert.ok(screen);
  const options = route.attributes.find(a => a.name?.name === 'options').value.expression;
  const drawerStyle = options.properties.find(p => p.key.name === 'drawerItemStyle').value;
  assert.equal(drawerStyle.properties.find(p => p.key.name === 'display').value.value, 'none');
  for (const name of ['themeName', 'mode', 'setThemeName', 'setMode']) {
    assert.equal(screen.attributes.find(a => a.name?.name === name).value.expression.name, name);
  }
  // Execute the actual custom drawer with native/navigation primitives stubbed.
  const drawerSource = readFileSync(new URL('../src/components/CustomDrawer.js', import.meta.url), 'utf8');
  const code = babel.transformSync(drawerSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]] }).code;
  const module = { exports: {} };
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props }, children }) };
  const h = harness();
  vm.runInNewContext(code, { module, exports: module.exports, React, require(spec) {
    if (spec === 'react-native') return { View: 'View', Text: 'Text' };
    if (spec === '@react-navigation/drawer') return { DrawerContentScrollView: 'ScrollView', DrawerItemList: 'DrawerItemList' };
    if (spec === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0 }) };
    if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (spec === '@/styles/styles') return () => ({});
    if (spec === '@/styles/themes') return h.load('src/styles/themes.js');
    throw new Error(spec);
  } });
  const tree = module.exports.default({ themeName: 'basic', mode: 'light', state: { routes: [{ key: 'theme', name: 'ThemeScreen' }] }, descriptors: { theme: { options: { drawerItemStyle: { display: 'none' } } } } });
  const lists = nodes(tree).filter(n => n.type === 'DrawerItemList');
  assert.equal(lists.length, 2);
  for (const list of lists) assert.equal(list.props.descriptors.theme.options.drawerItemStyle.display, 'none');
});

test('selection updates the controlled screen and Settings subtitle when App supplies new props', () => {
  const h = harness();
  const Screen = h.load('src/features/settings/ThemeScreen.js').default;
  const Settings = h.load('src/features/settings/SettingsScreen.js').default;
  const themes = h.load('src/styles/themes.js').themes;
  const props = { themeName: 'ocean', mode: 'light', navigation: {}, setThemeName(name) { props.themeName = name; }, setMode(mode) { props.mode = mode; } };
  nodes(Screen(props)).find(n => n.props.accessibilityLabel === 'Tema Coffee').props.onPress();
  nodes(Screen(props)).find(n => n.props.accessibilityLabel === 'Oscuro').props.onPress();
  const updated = Screen(props);
  assert.equal(updated.props.style.backgroundColor, themes.coffee.dark.background);
  assert.ok(nodes(updated).find(n => n.props.accessibilityLabel === 'Tema Coffee').props.accessibilityState.selected);
  assert.ok(nodes(updated).find(n => n.props.accessibilityLabel === 'Oscuro').props.accessibilityState.selected);
  assert.ok(nodes(Settings(props)).some(n => n.props.accessibilityLabel === 'Tema. Coffee · Oscuro'));
});
