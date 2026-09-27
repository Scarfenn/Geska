import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { StackRouter, CommonActions } from '@react-navigation/routers';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const { createBackupController } = loadDatabase(null, { entry: '../../src/features/backup/services/backupController.js' });
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.children || [])] : [];
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };
const preview = { createdAt: '2026-09-27T00:00:00Z', counts: Object.fromEntries(['categories', 'tasks', 'subtasks'].map(n => [n, { total: 2, deleted: 0 }])) };

async function harness(overrides = {}) {
  let backup, cleanup, flowCalls = 0, reads = 0, uploads = 0, restores = 0, discards = 0;
  const service = {
    getCurrentBackup: async () => { reads++; return { userId: 'u', remote: { lastModified: preview.createdAt } }; },
    uploadBackup: async () => { uploads++; return { userId: 'u', remote: { lastModified: preview.createdAt } }; },
    prepareRestore: async () => preview,
    applyRestore: async () => { restores++; return {}; },
    discardRestore: value => { if (value) discards++; },
    ...overrides,
  };
  const controller = createBackupController(service, next => { backup = { ...next, controller }; });
  await controller.refresh();
  const cache = new Map();
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useCallback: fn => fn, useRef: value => ({ current: value }) };
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    const code = babel.transformSync(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
    }).code;
    vm.runInNewContext(code, { React, module, exports: module.exports, require(spec) {
      if (spec === 'react') return React;
      if (spec === 'react-native') return { ...Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'StatusBar', 'ActivityIndicator'].map(n => [n, n])),
        Platform: { OS: 'android' }, StyleSheet: { create: x => x }, Easing: { out: fn => fn, cubic: x => x } };
      if (spec === '@react-navigation/native') return { useFocusEffect: fn => { cleanup = fn(); } };
      if (spec === '@react-navigation/stack') return { createStackNavigator: () => ({ Navigator: 'Stack', Screen: 'Screen' }), CardStyleInterpolators: { forHorizontalIOS: () => {} } };
      if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (spec === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (spec.endsWith('/hooks/useBackup')) return () => { flowCalls++; return backup; };
      if (spec.endsWith('/SettingsScreen') || spec.endsWith('/ThemeScreen') || spec.endsWith('/AccountScreen')) return () => null;
      if (spec.startsWith('@/')) return load('src/' + spec.slice(2) + '.js');
      throw new Error(spec);
    } });
    cache.set(path, module.exports); return module.exports;
  }
  const { BackupFlow } = load('src/navigation/SettingsStack.js');
  const props = { themeName: 'ocean', mode: 'light' };
  let config = BackupFlow(props);
  const options = { routeNames: config.children.map(n => n.props.name), routeParamList: {}, routeGetIdList: {} };
  const router = StackRouter({ initialRouteName: config.props.initialRouteName });
  let state = router.getInitialState(options), backs = 0;
  const goBack = () => { backs++; cleanup?.(); cleanup = null; state = router.getStateForAction(state, CommonActions.goBack(), options); };
  function screen() {
    config = BackupFlow(props);
    const route = state.routes[state.index];
    const entry = config.children.find(n => n.props.name === route.name);
    const navigation = {
      navigate: name => { state = router.getStateForAction(state, CommonActions.navigate(name), options); },
      goBack, isFocused: () => state.routes[state.index].key === route.key,
    };
    const element = entry.children[0]({ route, navigation });
    function expand(tree) {
      if (Array.isArray(tree)) return tree.map(expand);
      if (!tree || typeof tree !== 'object') return tree;
      if (typeof tree.type === 'function') return expand(tree.type({ ...tree.props, children: tree.children }));
      return { ...tree, children: tree.children.map(expand) };
    }
    return expand(element.type(element.props));
  }
  const button = (tree, text) => nodes(tree).find(n => n.type === 'TouchableOpacity' && (n.props.accessibilityLabel === text || nodes(n).some(c => c.children.includes(text))));
  return { screen, button, goBack, controller, BackupFlow, props, get state() { return state; },
    get counters() { return { reads, uploads, restores, discards, backs, flowCalls }; } };
}

for (const [action, route, confirm] of [['Crear copia de seguridad', 'UploadConfirmation', 'Reemplazar copia'], ['Restaurar desde la nube', 'RestoreConfirmation', 'Reemplazar datos locales']]) {
  test(`${route}: push preserves preparation; Cancel and Back return to Copias without executing`, async () => {
    for (const cancelButton of [true, false]) {
      const h = await harness();
      await h.button(h.screen(), action).props.onPress();
      assert.deepEqual(h.state.routes.map(r => r.name), ['BackupHome', route]);
      const screen = h.screen();
      assert.ok(h.button(screen, confirm));
      assert.equal(h.counters.reads, 1, 'moving inside BackupFlow must not refresh its controller');
      const flow = h.BackupFlow(h.props);
      const shared = flow.children.map(n => n.children[0]({}).props.backup);
      assert.ok(shared.every(value => value === shared[0]));
      if (cancelButton) h.button(screen, 'Cancelar').props.onPress();
      else h.goBack(); // GO_BACK is the action used by Android's library handler.
      assert.equal(h.state.routes[h.state.index].name, 'BackupHome');
      assert.equal(h.controller.getState().status, 'ready');
      assert.equal(h.counters.uploads + h.counters.restores, 0);
      if (route === 'RestoreConfirmation') assert.equal(h.counters.discards, 1);
    }
  });
  test(`${route}: confirm runs once and returns success to Copias`, async () => {
    const h = await harness();
    await h.button(h.screen(), action).props.onPress();
    const onPress = h.button(h.screen(), confirm).props.onPress;
    const first = onPress(); await onPress(); await first;
    assert.equal(h.counters.uploads + h.counters.restores, 1);
    assert.equal(h.counters.backs, 1);
    assert.equal(h.state.routes[h.state.index].name, 'BackupHome');
    assert.equal(h.controller.getState().status, route === 'RestoreConfirmation' ? 'restored' : 'success');
  });
  test(`${route}: completion after Back does not pop another screen`, async () => {
    const gate = deferred();
    const h = await harness(route === 'RestoreConfirmation' ? { applyRestore: () => gate.promise } : { uploadBackup: () => gate.promise });
    await h.button(h.screen(), action).props.onPress();
    const pending = h.button(h.screen(), confirm).props.onPress();
    await Promise.resolve();
    h.goBack();
    gate.resolve({ userId: 'u', remote: null }); await pending;
    assert.equal(h.counters.backs, 1);
    assert.equal(h.state.routes[h.state.index].name, 'BackupHome');
  });
}

test('restore preparation that finishes after leaving Copias cannot navigate', async () => {
  const gate = deferred();
  const h = await harness({ prepareRestore: () => gate.promise });
  // Leaving the flow calls useBackup's existing focus cleanup.
  const pending = h.button(h.screen(), 'Restaurar desde la nube').props.onPress();
  await Promise.resolve();
  h.controller.cancelPreparation();
  gate.resolve(preview); await pending;
  assert.equal(h.state.routes.length, 1);
  assert.equal(h.counters.discards, 1);
});

test('failed upload returns to Copias with its error instead of losing it to a focus refresh', async () => {
  const h = await harness({ uploadBackup: async () => { throw Object.assign(new Error('offline'), { code: 'BACKUP_UPLOAD_FAILED' }); } });
  h.button(h.screen(), 'Crear copia de seguridad').props.onPress();
  await h.button(h.screen(), 'Reemplazar copia').props.onPress();
  assert.equal(h.state.routes[h.state.index].name, 'BackupHome');
  assert.equal(h.controller.getState().status, 'error');
  assert.match(h.controller.getState().message, /subida/);
  assert.equal(h.counters.reads, 1);
});
