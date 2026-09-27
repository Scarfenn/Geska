import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { CommonActions, DrawerActions, DrawerRouter, StackRouter } from '@react-navigation/routers';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const element = (type, props, ...children) => ({ type, props: props || {}, children });
function load(path, stubs) {
  const module = { exports: {} };
  const code = babel.transformSync(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  }).code;
  vm.runInNewContext(code, { module, exports: module.exports, React: { createElement: element }, console,
    require(spec) {
      assert.ok(spec in stubs, `Unexpected import: ${spec}`);
      return stubs[spec];
    },
  });
  return module.exports;
}

// Persist hook slots across renders, run layout effects only when dependencies
// change, and keep timing animations pending until a simulated frame completes.
// Native rendering is stubbed; navigation state comes from the installed router.
function harness(routeNames = ['Tareas', 'Ajustes']) {
  const router = DrawerRouter({ backBehavior: 'firstRoute' });
  const options = { routeNames, routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options), active;
  const instances = [], starts = [];
  const slot = (kind, create) => {
    const index = active.cursor++;
    if (!active.slots[index]) active.slots[index] = { kind, ...create() };
    assert.equal(active.slots[index].kind, kind);
    return active.slots[index];
  };
  const React = {
    useLayoutEffect(callback, deps) {
      const effect = slot('effect', () => ({}));
      if (!effect.deps || deps.some((dep, i) => dep !== effect.deps[i])) {
        active.effects.push(() => { effect.cleanup?.(); effect.cleanup = callback(); });
        effect.deps = deps;
      }
    },
  };
  const cubic = t => t ** 3;
  const reanimated = {
    __esModule: true, default: { View: 'Animated.View' },
    Easing: { cubic, out: easing => t => 1 - easing(1 - t) },
    useSharedValue(initial) {
      const instance = active;
      return slot('shared', () => {
        let current = initial, pending = null;
        const shared = {
          get value() { return current; },
          set value(next) {
            if (next?.timing) {
              pending = { ...next, from: current };
              starts.push({ name: instance.name, ...pending });
            } else { current = next; pending = null; }
          },
          frame(fraction) {
            if (!pending) return;
            current = pending.from + (pending.to - pending.from) * pending.config.easing(fraction);
            if (fraction === 1) pending = null;
          },
          cancel() { pending = null; },
          get running() { return pending !== null; },
        };
        return { shared };
      }).shared;
    },
    withTiming: (to, config) => ({ timing: true, to, config }),
    cancelAnimation: shared => shared.cancel(),
    useAnimatedStyle: callback => ({ evaluate: callback }),
  };
  const exports = load('src/navigation/DrawerSceneTransition.js', {
    react: React,
    'react-native': { View: 'View', StyleSheet: { create: x => x } },
    '@react-navigation/native': { useIsFocused: () => state.routes[state.index].name === active.name },
    'react-native-reanimated': reanimated,
  });
  function mount(name) {
    const instance = {
      name, slots: [], children: { type: `${name}Scene`, persistedState: {} }, backgroundColor: '#fafafa',
      render() {
        active = this; this.cursor = 0; this.effects = [];
        this.tree = exports.default({ children: this.children, backgroundColor: this.backgroundColor });
        this.effects.forEach(effect => effect());
        active = null;
        return this.tree;
      },
      get shared() { return this.slots.find(s => s.kind === 'shared').shared; },
      style() { return this.tree.children[0].props.style[1].evaluate(); },
      unmount() { this.slots.filter(s => s.kind === 'effect').forEach(s => s.cleanup?.()); },
    };
    instances.push(instance); instance.render(); return instance;
  }
  const render = () => instances.forEach(instance => instance.render());
  return { exports, starts, mount, render,
    dispatch(action) { const next = router.getStateForAction(state, action, options); if (next) state = next; render(); },
    setChildState(childState) { state = { ...state, routes: state.routes.map(r => r.name === 'Ajustes' ? { ...r, state: childState } : r) }; render(); },
    get state() { return state; },
  };
}
const plain = value => JSON.parse(JSON.stringify(value));

function verifyEntry(instance, start) {
  assert.deepEqual(plain(instance.style()), { opacity: 0, transform: [{ translateY: 8 }] });
  assert.equal(start.from, 0);
  assert.equal(start.to, 1);
  assert.equal(start.config.duration, 300);
  instance.shared.frame(0.5);
  assert.ok(instance.style().opacity > 0 && instance.style().opacity < 1);
  assert.ok(instance.style().transform[0].translateY > 0 && instance.style().transform[0].translateY < 8);
  instance.shared.frame(1);
  assert.deepEqual(plain(instance.style()), { opacity: 1, transform: [{ translateY: 0 }] });
}

test('both Drawer directions animate entry, including lazy first mount and Android GO_BACK', () => {
  const h = harness();
  const tasks = h.mount('Tareas');
  verifyEntry(tasks, h.starts.at(-1));
  h.dispatch(CommonActions.navigate('Ajustes'));
  const settings = h.mount('Ajustes'); // Drawer mounts unvisited routes lazily.
  verifyEntry(settings, h.starts.at(-1));
  h.dispatch(CommonActions.navigate('Tareas'));
  verifyEntry(tasks, h.starts.at(-1));
  h.dispatch(CommonActions.navigate('Ajustes'));
  verifyEntry(settings, h.starts.at(-1));
  h.dispatch(CommonActions.goBack());
  assert.equal(h.state.routes[h.state.index].name, 'Tareas');
  verifyEntry(tasks, h.starts.at(-1));
  assert.deepEqual(h.starts.map(a => a.name), ['Tareas', 'Ajustes', 'Tareas', 'Ajustes', 'Tareas']);
});

test('Drawer opening, closing and selecting the current module do not restart entry', () => {
  const h = harness();
  h.mount('Tareas').shared.frame(1);
  h.dispatch(CommonActions.navigate('Ajustes'));
  const settings = h.mount('Ajustes'); settings.shared.frame(1);
  const count = h.starts.length;
  for (const action of [DrawerActions.openDrawer(), DrawerActions.closeDrawer(), DrawerActions.openDrawer(), CommonActions.goBack(), CommonActions.navigate('Ajustes')]) h.dispatch(action);
  assert.equal(h.starts.length, count);
  assert.equal(h.state.routes[h.state.index].name, 'Ajustes');
  assert.equal(settings.style().opacity, 1);
});

test('nested Settings and backup pushes/pops never restart the module animation', () => {
  const h = harness();
  h.dispatch(CommonActions.navigate('Ajustes'));
  const settings = h.mount('Ajustes'); settings.shared.frame(1);
  const stack = StackRouter({ initialRouteName: 'SettingsHome' });
  const options = { routeNames: ['SettingsHome', 'ThemeScreen', 'Cuenta', 'BackupScreen'], routeParamList: {}, routeGetIdList: {} };
  let child = stack.getInitialState(options);
  h.setChildState(child);
  for (const name of ['ThemeScreen', 'Cuenta', 'BackupScreen']) {
    child = stack.getStateForAction(child, CommonActions.navigate(name), options); h.setChildState(child);
    if (name === 'BackupScreen') {
      const backup = StackRouter({ initialRouteName: 'BackupHome' });
      const backupOptions = { routeNames: ['BackupHome', 'UploadConfirmation', 'RestoreConfirmation'], routeParamList: {}, routeGetIdList: {} };
      let backupState = backup.getInitialState(backupOptions);
      for (const confirmation of ['UploadConfirmation', 'RestoreConfirmation']) {
        backupState = backup.getStateForAction(backupState, CommonActions.navigate(confirmation), backupOptions);
        h.setChildState({ ...child, routes: child.routes.map(r => r.name === name ? { ...r, state: backupState } : r) });
        backupState = backup.getStateForAction(backupState, CommonActions.goBack(), backupOptions);
        h.setChildState({ ...child, routes: child.routes.map(r => r.name === name ? { ...r, state: backupState } : r) });
      }
    }
    child = stack.getStateForAction(child, CommonActions.goBack(), options); h.setChildState(child);
  }
  assert.equal(h.starts.length, 1);
  assert.equal(settings.style().opacity, 1);
});

test('theme/children rerenders preserve progress and state instead of restarting or remounting', () => {
  const h = harness();
  const tasks = h.mount('Tareas'); tasks.shared.frame(0.5);
  const before = plain(tasks.style()), state = h.state, originalType = tasks.tree.type;
  for (const backgroundColor of ['#101c24', '#ffffff', '#123456']) {
    tasks.backgroundColor = backgroundColor;
    tasks.children = { ...tasks.children, theme: backgroundColor };
    tasks.render();
    assert.deepEqual(plain(tasks.style()), before);
    assert.equal(tasks.tree.type, originalType);
    assert.equal(tasks.tree.props.key, undefined);
    assert.equal(tasks.tree.children[0].children[0], tasks.children);
    assert.equal(tasks.tree.props.style[1].backgroundColor, backgroundColor);
    assert.equal(h.state, state);
  }
  assert.equal(h.starts.length, 1);
  tasks.shared.frame(1); tasks.render();
  assert.equal(tasks.style().opacity, 1);
  assert.equal(h.starts.length, 1);
});

test('rapid module changes and unmount cancel pending animations; reentry starts from zero', () => {
  const h = harness();
  const tasks = h.mount('Tareas'); tasks.shared.frame(0.5);
  h.dispatch(CommonActions.navigate('Ajustes'));
  assert.equal(tasks.shared.running, false);
  const settings = h.mount('Ajustes'); settings.shared.frame(0.5);
  h.dispatch(CommonActions.navigate('Tareas'));
  assert.equal(settings.shared.running, false);
  verifyEntry(tasks, h.starts.at(-1));
  h.dispatch(CommonActions.navigate('Ajustes'));
  assert.equal(settings.style().opacity, 0);
  settings.unmount();
  assert.equal(settings.shared.running, false);
});

test('a future Drawer module inherits exactly the same layout and transition', () => {
  const h = harness(['Tareas', 'Ajustes', 'Calendario']);
  h.mount('Tareas');
  h.dispatch(CommonActions.navigate('Calendario'));
  const calendar = h.mount('Calendario');
  verifyEntry(calendar, h.starts.at(-1));
  const children = { type: 'CalendarScene' };
  const layout = h.exports.drawerScreenLayout({ children, theme: { colors: { background: '#123456' } } });
  assert.equal(layout.type, h.exports.default);
  assert.equal(layout.children[0], children);
  assert.equal(layout.props.backgroundColor, '#123456');
});

test('App installs a stable screenLayout only on the Drawer, across theme rerenders', () => {
  const h = harness();
  let preferences;
  const { default: App } = load('App.js', {
    '@/hooks/useThemePreferences': () => preferences,
    '@/hooks/useAndroidAppTheme': () => {}, '@/hooks/useAndroidNavigationBar': () => {},
    'expo-splash-screen': { preventAutoHideAsync: () => Promise.resolve() },
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer', DefaultTheme: { colors: {} }, DarkTheme: { colors: {} } },
    '@react-navigation/drawer': { createDrawerNavigator: () => ({ Navigator: 'DrawerNavigator', Screen: 'DrawerScreen' }) },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider' },
    'react-native-gesture-handler': { GestureHandlerRootView: 'GestureHandlerRootView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '@/features/tasks/TasksScreen': 'TasksScreen', '@/features/calendar/CalendarScreen': 'CalendarScreen',
    '@/navigation/SettingsStack': { __esModule: true, default: 'SettingsStack', settingsDrawerOptions: () => ({}) },
    '@/navigation/DrawerSceneTransition': h.exports, '@/components/CustomDrawer': 'CustomDrawer',
  });
  const flatten = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...(tree.children || []).flatMap(flatten)];
  for (const mode of ['light', 'dark', 'light']) {
    preferences = { mode, themeName: 'basic', isThemeLoaded: true, currentTheme: {} };
    const all = flatten(App());
    const layouts = all.filter(n => n.props.screenLayout);
    assert.equal(layouts.length, 1);
    assert.equal(layouts[0].type, 'DrawerNavigator');
    assert.equal(layouts[0].props.screenLayout, h.exports.drawerScreenLayout);
    assert.equal(layouts[0].props.backBehavior, 'firstRoute');
    const routes = all.filter(n => n.type === 'DrawerScreen');
    assert.deepEqual(routes.map(n => n.props.name), ['Tareas', 'Ajustes']);
    const settings = routes[1].children[0]({});
    assert.equal(settings.type, 'SettingsStack');
    assert.equal(settings.props.key, undefined);
  }
});
