import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const compiled = new Map();
const sourceRoot = new URL('../../src/', import.meta.url);

export function notificationHarness({ platform = 'android' } = {}) {
  const scheduled = new Map(), calls = [], modules = new Map();
  let nextId = 1;
  const native = {
    __esModule: true,
    PermissionStatus: { GRANTED: 'granted' },
    IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
    AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: value => calls.push(['handler', value]),
    setNotificationChannelAsync: async (...args) => calls.push(['channel', ...args]),
    setNotificationCategoryAsync: async (...args) => calls.push(['category', ...args]),
    getPermissionsAsync: async () => ({ granted: true }),
    requestPermissionsAsync: async () => ({ granted: true }),
    getAllScheduledNotificationsAsync: async () => Array.from(scheduled.values()),
    scheduleNotificationAsync: async request => {
      const identifier = `n${nextId++}`;
      calls.push(['schedule', identifier, request]);
      scheduled.set(identifier, { identifier, ...request });
      return identifier;
    },
    cancelScheduledNotificationAsync: async id => { calls.push(['cancel', id]); scheduled.delete(id); },
    addNotificationResponseReceivedListener: callback => calls.push(['listener', callback]),
    registerTaskAsync: async name => calls.push(['registerTask', name]),
    getPresentedNotificationsAsync: async () => [],
    dismissNotificationAsync: async id => calls.push(['dismiss', id]),
  };
  const stubs = {
    'expo-notifications': native,
    'react-native': { Platform: { OS: platform } },
    'expo-application': { applicationId: 'test.app' },
    'expo-intent-launcher': { ActivityAction: { CHANNEL_NOTIFICATION_SETTINGS: 'settings' }, startActivityAsync: async (...args) => calls.push(['settings', ...args]) },
    'expo-task-manager': { defineTask: (...args) => calls.push(['defineTask', ...args]) },
    '@/features/tasks/services/taskCompletion': { completeTask: async (...args) => { calls.push(['complete', ...args]); return true; } },
  };
  const context = vm.createContext({ Date, console: { error() {}, warn() {} } });
  function load(path = 'features/tasks/services/notifications.js') {
    const url = path instanceof URL ? path : new URL(path, sourceRoot);
    if (modules.has(url.href)) return modules.get(url.href).exports;
    const module = { exports: {} }; modules.set(url.href, module);
    if (!compiled.has(url.href)) compiled.set(url.href, babel.transformSync(readFileSync(url, 'utf8'), {
      configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code);
    const execute = vm.runInContext(`(function(require, module, exports) { ${compiled.get(url.href)}\n})`, context);
    execute(spec => {
      if (spec in stubs) return stubs[spec];
      if (spec.startsWith('@/')) return load(new URL(spec.slice(2) + '.js', sourceRoot));
      if (spec.startsWith('.')) return load(new URL(spec + '.js', url));
      throw new Error(`Unexpected dependency: ${spec}`);
    }, module, module.exports);
    return module.exports;
  }
  return { api: load(), load, native, scheduled, calls, stubs };
}
