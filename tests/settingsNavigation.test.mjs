import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { CommonActions, DrawerActions, DrawerRouter, StackRouter } from '@react-navigation/routers';
import { getFocusedRouteNameFromRoute } from '../node_modules/@react-navigation/core/lib/module/getFocusedRouteNameFromRoute.js';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.children || [])] : [];

// Execute real screen callbacks with native views/services stubbed; history is
// reduced by the installed React Navigation routers, not a simulated push/pop.
function harness() {
  const cache = new Map();
  let navigatorCreations = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: value => [value, () => {}], useCallback: fn => fn, useRef: value => ({ current: value }),
  };
  const native = {
    ...Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'StatusBar', 'ActivityIndicator', 'KeyboardAvoidingView'].map(n => [n, n])),
    Platform: { OS: 'android' }, StyleSheet: { create: x => x }, Easing: { cubic: x => x ** 3, out: fn => fn },
  };
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    const code = babel.transformSync(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
      configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
    }).code;
    vm.runInNewContext(code, { module, exports: module.exports, React, require(spec) {
      if (spec === 'react') return React;
      if (spec === 'react-native') return native;
      if (spec === '@react-navigation/native') return { getFocusedRouteNameFromRoute, useFocusEffect() {} };
      if (spec === '@react-navigation/stack') return {
        createStackNavigator() { navigatorCreations++; return { Navigator: () => {}, Screen: () => {} }; },
        CardStyleInterpolators: { forHorizontalIOS: () => {} },
      };
      if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (spec === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (spec.endsWith('/AccountForm') || spec.endsWith('/UploadConfirmation') || spec.endsWith('/RestoreConfirmation')) return () => null;
      if (spec.endsWith('/useAccount')) return () => ({ status: 'signed-out', controller: {} });
      if (spec.endsWith('/useBackup')) return () => ({ status: 'signed-out', controller: {} });
      if (spec.endsWith('/appInfo')) return { appVersion: 'test' };
      if (spec.startsWith('@/')) return load('src/' + spec.slice(2) + '.js');
      throw new Error(spec);
    } });
    cache.set(path, module.exports);
    return module.exports;
  }
  const { default: SettingsStack, settingsDrawerOptions, BackupFlow } = load('src/navigation/SettingsStack.js');
  const props = { themeName: 'ocean', mode: 'light', setThemeName(name) { props.themeName = name; }, setMode(mode) { props.mode = mode; } };
  const config = SettingsStack(props);
  const routeNames = config.children.map(n => n.props.name);
  const options = { routeNames, routeParamList: {}, routeGetIdList: {} };
  const router = StackRouter({ initialRouteName: config.props.initialRouteName });
  let state = router.getInitialState(options);
  const navigation = {
    navigate(name) { state = router.getStateForAction(state, CommonActions.navigate(name), options); },
    goBack() { state = router.getStateForAction(state, CommonActions.goBack(), options); },
  };
  function screen() {
    const route = state.routes[state.index];
    const entry = SettingsStack(props).children.find(n => n.props.name === route.name);
    const element = entry.children[0]({ navigation, route });
    if (element.type === BackupFlow) {
      const flow = BackupFlow(element.props);
      const home = flow.children[0].children[0]({ navigation, route: { name: 'BackupHome' } });
      return home.type(home.props);
    }
    return element.type(element.props);
  }
  function press(label) {
    // Render settings row/section components as well as the screen.
    function expand(tree) {
      if (Array.isArray(tree)) return tree.map(expand);
      if (!tree || typeof tree !== 'object') return tree;
      if (typeof tree.type === 'function') return expand(tree.type({ ...tree.props, children: tree.children }));
      return { ...tree, children: tree.children.map(expand) };
    }
    const button = nodes(expand(screen())).find(n => n.props.accessibilityLabel?.startsWith(label));
    assert.ok(button, label);
    button.props.onPress();
  }
  return { SettingsStack, settingsDrawerOptions, props, config, options, router, navigation, screen, press,
    get state() { return state; }, get creations() { return navigatorCreations; } };
}

for (const [label, route] of [['Tema.', 'ThemeScreen'], ['Cuenta.', 'Cuenta'], ['Copias de seguridad.', 'BackupScreen']]) {
  test(`SettingsHome → ${route} → header Back uses the stack history`, () => {
    const h = harness();
    h.press(label);
    assert.equal(h.state.routes[h.state.index].name, route);
    assert.equal(h.settingsDrawerOptions({ route: { state: h.state } }).swipeEnabled, false);
    h.press(route === 'Cuenta' ? 'Volver' : 'Volver a Ajustes');
    assert.equal(h.state.routes[h.state.index].name, 'SettingsHome');
    assert.equal(h.state.routes.length, 1);
    assert.equal(h.settingsDrawerOptions({ route: { state: h.state } }).swipeEnabled, true);
  });
}

test('Copias → Cuenta → header Back returns to Copias, then Ajustes', () => {
  const h = harness();
  h.press('Copias de seguridad.');
  const accountButton = nodes(h.screen()).find(n => n.props.onPress && nodes(n).some(child => child.children.includes('Ir a Cuenta')));
  accountButton.props.onPress();
  assert.deepEqual(h.state.routes.map(r => r.name), ['SettingsHome', 'BackupScreen', 'Cuenta']);
  h.press('Volver');
  assert.equal(h.state.routes[h.state.index].name, 'BackupScreen');
  h.press('Volver a Ajustes');
  assert.equal(h.state.routes.length, 1);
});

test('theme and mode changes retain navigator identity and route keys while updating screen props', () => {
  const h = harness();
  h.press('Tema.');
  const stateBefore = h.state;
  h.press('Tema Coffee');
  h.press('Oscuro');
  const updated = h.SettingsStack(h.props);
  assert.equal(h.creations, 2);
  assert.equal(updated.type, h.config.type);
  assert.equal(updated.props.key, undefined);
  assert.equal(h.state, stateBefore);
  for (let i = 0; i < updated.children.length; i++) {
    assert.equal(updated.children[i].type, h.config.children[i].type);
    assert.equal(updated.children[i].props.name, h.config.children[i].props.name);
    assert.equal(updated.children[i].props.navigationKey, undefined);
  }
  const theme = updated.children.find(n => n.props.name === 'ThemeScreen').children[0]({ navigation: h.navigation });
  assert.equal(theme.props.themeName, 'coffee');
  assert.equal(theme.props.mode, 'dark');
  h.press('Volver a Ajustes');
  assert.equal(h.state.routes.length, 1);
});

test('Android library hardwareBackPress handler uses the same GO_BACK history', () => {
  const h = harness();
  const source = readFileSync(new URL('../node_modules/@react-navigation/native/src/useBackButton.native.tsx', import.meta.url), 'utf8');
  const code = babel.transformSync(source, { filename: 'useBackButton.tsx', configFile: false, babelrc: false,
    presets: ['@babel/preset-typescript'], plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  let handler;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require(spec) {
    if (spec === 'react') return { useEffect: effect => effect() };
    if (spec === 'react-native') return { BackHandler: { addEventListener(event, callback) {
      assert.equal(event, 'hardwareBackPress'); handler = callback; return { remove() {} };
    } } };
    throw new Error(spec);
  } });
  module.exports.useBackButton({ current: { ...h.navigation, canGoBack: () => h.state.index > 0 } });
  for (const route of ['ThemeScreen', 'Cuenta', 'BackupScreen']) {
    h.navigation.navigate(route);
    assert.equal(handler(), true);
    assert.equal(h.state.routes[h.state.index].name, 'SettingsHome');
  }
  h.navigation.navigate('BackupScreen'); h.navigation.navigate('Cuenta');
  assert.equal(handler(), true);
  assert.equal(h.state.routes[h.state.index].name, 'BackupScreen');
  assert.equal(handler(), true);
  assert.equal(handler(), false);
});

test('root settings menu opens Drawer; Drawer Back closes it and firstRoute returns to Tareas', () => {
  const h = harness();
  const router = DrawerRouter({ backBehavior: 'firstRoute' });
  const options = { routeNames: ['Tareas', 'Ajustes'], routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  const dispatch = action => { state = router.getStateForAction(state, action, options); };
  dispatch(CommonActions.navigate('Ajustes'));
  h.navigation.openDrawer = () => dispatch(DrawerActions.openDrawer());
  h.press('Abrir menú de navegación');
  assert.ok(state.history.some(entry => entry.type === 'drawer'));
  dispatch(CommonActions.goBack());
  assert.equal(state.routes[state.index].name, 'Ajustes');
  assert.ok(state.history.every(entry => entry.type !== 'drawer'));
  dispatch(CommonActions.goBack());
  assert.equal(state.routes[state.index].name, 'Tareas');
  assert.equal(router.getStateForAction(state, CommonActions.goBack(), options), null);
  assert.equal(h.settingsDrawerOptions({ route: {} }).swipeEnabled, true);
  assert.equal(h.config.props.screenOptions.gestureEnabled, false);
});
