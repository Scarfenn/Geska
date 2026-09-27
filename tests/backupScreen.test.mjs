import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { loadDatabase } from './helpers/databaseHarness.mjs';
const { createBackupController } = loadDatabase(null, { entry: '../../src/features/backup/services/backupController.js' });
const remote = { lastModified: '2026-09-26T12:00:00Z' };
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };

test('loading resolves to authenticated with or without a remote object', async () => {
  for (const value of [null, remote]) {
    const gate = deferred();
    const c = createBackupController({ getCurrentBackup: () => gate.promise }, () => {});
    const pending = c.refresh();
    assert.equal(c.getState().status, 'loading');
    gate.resolve({ userId: 'u', remote: value }); await pending;
    assert.equal(c.getState().status, value ? 'ready' : 'empty');
  }
});

test('configuration, auth, permissions and network errors remain distinct; retry recovers', async () => {
  for (const [code, status] of [['SUPABASE_NOT_CONFIGURED', 'unconfigured'], ['BACKUP_AUTH_REQUIRED', 'signed-out'], ['BACKUP_METADATA_FAILED', 'error']]) {
    let fail = true;
    const error = Object.assign(new Error('original'), { code });
    const c = createBackupController({ getCurrentBackup: async () => { if (fail) throw error; return { userId: 'u', remote }; } }, () => {});
    await c.refresh(); assert.equal(c.getState().status, status); assert.equal(c.getState().error, error);
    fail = false; await c.refresh(); assert.equal(c.getState().status, 'ready');
  }
});

test('upload blocks duplicate taps, updates returned metadata immediately, preserves success with warning', async () => {
  for (const metadataError of [null, new Error('metadata unavailable')]) {
    const gate = deferred(); let calls = 0;
    const c = createBackupController({ getCurrentBackup: async () => ({ userId: 'u', remote: null }), uploadBackup: () => { calls++; return gate.promise; } }, () => {});
    await c.refresh(); const first = c.upload(); const second = c.upload();
    await Promise.resolve(); assert.equal(calls, 1); assert.equal(c.getState().status, 'uploading');
    gate.resolve({ userId: 'u', remote: metadataError ? null : remote, metadataError }); await first; await second;
    assert.equal(c.getState().status, 'success'); assert.equal(c.getState().remote, metadataError ? null : remote);
    assert.match(c.getState().message, metadataError ? /no se pudo actualizar/ : /correctamente/);
  }
});

test('upload errors require refresh and focus refresh waits for ongoing upload', async () => {
  const gate = deferred(); let reads = 0;
  const service = { getCurrentBackup: async () => { reads++; return { userId: 'u', remote }; }, uploadBackup: () => gate.promise };
  const c = createBackupController(service, () => {});
  await c.refresh(); c.upload(); const upload = c.confirmUpload(); const refresh = c.refresh();
  await Promise.resolve(); assert.equal(reads, 1);
  gate.resolve({ userId: 'u', remote, metadataError: null }); await upload; await refresh;
  assert.equal(reads, 2);
  service.uploadBackup = async () => { throw Object.assign(new Error('network'), { code: 'BACKUP_UPLOAD_FAILED' }); };
  c.upload(); await c.confirmUpload(); assert.equal(c.getState().status, 'error');
  assert.equal(c.getState().remote, null);
  await c.refresh(); assert.equal(c.getState().status, 'ready');
  await c.refresh(() => false); assert.equal(reads, 3);
});

function renderHarness() {
  const cache = new Map(); let state;
  const React = { createElement(type, props, ...children) {
    return typeof type === 'function' ? type({ ...props, children }) : { type, props: props || {}, children };
  }, Fragment: 'Fragment', useCallback: fn => fn, useRef: value => ({ current: value }) };
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    const code = babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]] }).code;
    vm.runInNewContext(code, { React, Date, module, exports: module.exports, require(spec) {
      if (spec === 'react') return React;
      if (spec === '@react-navigation/native') return { useFocusEffect() {} };
      if (spec === 'react-native') return { ...Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ScrollView', 'StatusBar', 'ActivityIndicator'].map(n => [n, n])), StyleSheet: { create: x => x } };
      if (spec === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (spec === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (spec.includes('/components/')) return load('src/' + spec.slice(2) + '.js');
      if (spec.endsWith('/hooks/useBackup')) return () => state;
      if (spec.startsWith('@/styles/') || spec.includes('/styles/')) return load('src/' + spec.slice(2) + '.js');
      throw new Error(`Unexpected UI dependency: ${spec}`);
    } });
    cache.set(path, module.exports); return module.exports;
  }
  return { load, get state() { return state; }, setState: value => { state = value; } };
}
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.children || [])] : [];

test('real JSX renders all states in all 10 families/modes, routes to Account and goes back and disables upload', () => {
  const h = renderHarness();
  const Screen = h.load('src/features/backup/BackupScreen.js').default;
  const themes = h.load('src/styles/themes.js').themes;
  assert.equal(Object.keys(themes).length, 10);
  for (const themeName of Object.keys(themes)) for (const mode of ['light', 'dark']) {
    for (const status of ['loading', 'unconfigured', 'signed-out', 'empty', 'ready', 'uploading', 'success', 'error']) {
      let destination, uploaded = 0;
      h.setState({ status, busy: status === 'uploading', remote: ['ready', 'success'].includes(status) ? remote : null,
        message: ['unconfigured', 'error'].includes(status) ? 'Error claro' : null,
        controller: { getState: () => ({ status, busy: status === "uploading" }), upload() { uploaded++; }, refresh() {} } });
      const tree = Screen({ themeName, mode, backup: h.state, navigation: { navigate(name) { destination = name; }, goBack() { destination = "back"; } } });
      const all = nodes(tree);
      assert.equal(tree.props.style.backgroundColor, themes[themeName][mode].background);
      all.find(n => n.props.accessibilityLabel === 'Volver a Ajustes').props.onPress(); assert.equal(destination, 'back');
      const buttonWithText = text => all.find(n => n.type === 'TouchableOpacity' && nodes(n).some(child => child.type === 'Text' && child.children.includes(text)));
      if (status === 'signed-out') { buttonWithText('Ir a Cuenta').props.onPress(); assert.equal(destination, 'Cuenta'); }
      if (status === 'uploading') assert.equal(buttonWithText('Creando copia…').props.disabled, true);
      if (status === 'ready') { buttonWithText('Crear copia de seguridad').props.onPress(); assert.equal(uploaded, 1); }
      if (status === 'empty') assert.ok(all.some(n => n.children.includes('Sin copia en la nube')));
      if (status === 'error') assert.equal(buttonWithText('Crear copia de seguridad'), undefined);
    }
  }
});

test('hook queries only on focus and ignores updates after blur', async () => {
  let focus, state, requests = 0;
  const refs = [];
  const hook = loadDatabase(null, { entry: '../../src/features/backup/hooks/useBackup.js', stubs: {
    react: {
      useCallback: fn => fn,
      useRef: value => { const ref = { current: value }; refs.push(ref); return ref; },
      useState: value => { state = value; return [value, next => { state = next; }]; },
    },
    '@react-navigation/native': { useFocusEffect: fn => { focus = fn; } },
    '@/features/backup/services/restoreService': {},
    '@/features/backup/services/backupService': { getCurrentBackup: async () => { requests++; return { userId: 'u', remote }; } },
  } }).default;
  const view = hook();
  assert.equal(requests, 0);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const blur = focus(); await tick();
  assert.equal(requests, 1); assert.equal(state.status, 'ready');
  view.controller.upload(); assert.equal(state.status, 'confirm-upload');
  blur(); const oldState = state;
  assert.equal(view.controller.getState().status, 'ready');
  await view.controller.confirmUpload();
  assert.equal(view.controller.getState().busy, false);
  await view.controller.refresh(); assert.equal(state, oldState);
  focus(); await tick(); assert.equal(requests, 3);
});


test('restore confirmation shows active counts and history without technical metadata in every theme', () => {
  const h = renderHarness();
  const Confirmation = h.load('src/features/backup/components/RestoreConfirmation.js').default;
  const getStyles = h.load('src/features/backup/styles/backupStyles.js').default;
  const themes = h.load('src/styles/themes.js').themes;
  for (const themeName of Object.keys(themes)) for (const mode of ['light', 'dark']) {
    let applied = 0;
    const preview = { createdAt: '2026-09-26T12:00:00.000Z', formatVersion: 731, schemaVersion: 842, counts: {
      categories: { total: 8, deleted: 3 }, tasks: { total: 12, deleted: 2 }, subtasks: { total: 6, deleted: 6 },
      task_occurrences: { total: 951, deleted: 17 }, subtask_occurrences: { total: 963, deleted: 19 },
    } };
    const original = JSON.stringify(preview);
    const tree = Confirmation({ preview,
      styles: getStyles(themeName, mode), busy: false, onApply() { applied++; }, onCancel() {} });
    const all = nodes(tree);
    const button = all.find(n => n.type === 'TouchableOpacity' && n.children.some(c => c.children?.includes('Reemplazar datos locales')));
    button.props.onPress(); assert.equal(applied, 1);
    assert.equal(button.props.style[0].backgroundColor, themes[themeName][mode].dangerBackground);
    assert.ok(all.some(n => n.props.accessibilityRole === 'alert' && n.children.join('').includes('Tus datos locales serán reemplazados por esta copia')));
    const texts = all.filter(n => n.type === 'Text').map(n => n.children.join(''));
    for (const expected of ['Categorías: 5', 'Tareas: 10', 'Subtareas: 0',
      `Copia del ${new Date(preview.createdAt).toLocaleString()}`,
      'La copia también incluye el historial de las tareas.']) assert.ok(texts.includes(expected));
    assert.doesNotMatch(texts.join(' '), /formatVersion|schemaVersion|Formato|Esquema|eliminadas|Ocurrencias|task_occurrences|subtask_occurrences|731|842|951|963/);
    assert.equal(texts.filter(text => /^(Categorías|Tareas|Subtareas):/.test(text)).length, 3);
    assert.equal(JSON.stringify(preview), original);
  }
});


test('existing backup requires confirmation; cancellation and repeated taps never duplicate upload', async () => {
  const gate = deferred(); let uploads = 0, reads = 0;
  const c = createBackupController({
    getCurrentBackup: async () => { reads++; return { userId: 'u', remote }; },
    uploadBackup: () => { uploads++; return gate.promise; },
  }, () => {});
  await c.refresh();
  c.upload(); c.upload();
  assert.equal(c.getState().status, 'confirm-upload');
  assert.equal(uploads, 0);
  c.cancelUpload(); await c.confirmUpload();
  assert.equal(c.getState().status, 'ready');
  assert.equal(uploads, 0); assert.equal(reads, 1);
  c.upload();
  const first = c.confirmUpload(), second = c.confirmUpload();
  c.upload(); c.cancelUpload();
  assert.equal(c.getState().busy, true);
  await Promise.resolve(); assert.equal(uploads, 1);
  assert.equal(c.getState().status, 'uploading');
  gate.resolve({ userId: 'u', remote, metadataError: null });
  await first; await second;
  await c.confirmUpload(); assert.equal(uploads, 1);
  assert.equal(c.getState().status, 'success');
});

test('successful first upload still requires replacement confirmation when metadata is unavailable', async () => {
  let uploads = 0;
  const c = createBackupController({
    getCurrentBackup: async () => ({ userId: 'u', remote: null }),
    uploadBackup: async () => { uploads++; return { userId: 'u', remote: null, metadataError: new Error('metadata') }; },
  }, () => {});
  await c.refresh(); await c.upload(); assert.equal(uploads, 1);
  c.upload(); assert.equal(c.getState().status, 'confirm-upload');
  assert.equal(uploads, 1);
  c.cancelUpload(); assert.equal(c.getState().status, 'success');
});

test('replacement UI uses remote date only, themed destructive action and controller callbacks', async () => {
  const h = renderHarness();
  const Screen = h.load('src/features/backup/BackupConfirmationScreen.js').default;
  const themes = h.load('src/styles/themes.js').themes;
  for (const themeName of Object.keys(themes)) for (const mode of ['light', 'dark']) {
    for (const value of [remote, { lastModified: null }, { lastModified: 'invalid' }, null]) {
      let confirmed = 0, canceled = 0;
      h.setState({ status: 'confirm-upload', busy: false, remote: value, controller: {
        getState: () => ({ busy: false }), confirmUpload() { confirmed++; }, cancelUpload() { canceled++; },
      } });
      const all = nodes(Screen({ themeName, mode, backup: h.state, route: { name: "UploadConfirmation" }, navigation: { goBack() {}, isFocused: () => false } }));
      const button = text => all.find(n => n.type === 'TouchableOpacity' && nodes(n).some(c => c.children.includes(text)));
      assert.equal(button('Crear copia ahora'), undefined);
      assert.equal(button('Actualizar información'), undefined);
      const message = all.find(n => n.type === 'Text' && n.children.some(c => typeof c === 'string' && c.startsWith('Ya existe una copia'))).children.join('');
      assert.equal(message, `Ya existe una copia guardada${value === remote ? ` (${new Date(remote.lastModified).toLocaleString()})` : ''}. Al crear una nueva, esa copia será reemplazada.`);
      const confirm = button('Reemplazar copia');
      assert.equal(confirm.props.style[0].backgroundColor, themes[themeName][mode].dangerBackground);
      await confirm.props.onPress(); button('Cancelar').props.onPress();
      assert.equal(confirmed, 1); assert.equal(canceled, 1);
    }
  }
});
