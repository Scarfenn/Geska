import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import { loadDatabase } from './helpers/databaseHarness.mjs';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const stubs = { 'react-native': { StyleSheet: { create: styles => styles } } };
const load = path => loadDatabase(null, { entry: '../../src/' + path + '.js', stubs });
const { themes } = load('styles/themes');
const combinations = Object.entries(themes).flatMap(([name, modes]) => Object.keys(modes).map(mode => [name, mode]));

test('styles reuse the same palette and stay independent across themes and modes', () => {
  const { default: createThemedStyles } = load('styles/createThemedStyles');
  let builds = 0;
  const getStyles = createThemedStyles(theme => { builds++; return { text: { color: theme.text } }; });
  const light = getStyles('basic', 'light');
  const dark = getStyles('basic', 'dark');
  assert.strictEqual(getStyles('basic', 'light'), light);
  assert.strictEqual(getStyles('basic', 'dark'), dark);
  assert.notStrictEqual(light, dark);
  assert.equal(builds, 2);
  assert.equal(light.text.color, themes.basic.light.text);
  assert.equal(dark.text.color, themes.basic.dark.text);
});

test('focused sheets supply every style used by migrated components for every palette', () => {
  const consumers = [
    'features/tasks/TasksScreen',
    'features/tasks/components/CategoryBar',
    'features/tasks/components/TaskList',
    'features/tasks/components/TaskCard',
    'features/tasks/components/SubtaskEditorRow',
    'features/tasks/modals/TaskModal',
    'features/tasks/modals/SubModals/RepeatModal',
    'features/tasks/modals/SubModals/DatePickerModal',
    ...['CategoryModal', 'TimeModal', 'SubtaskModal', 'SubModals/HourModal', 'SubModals/ReminderModal', 'SubModals/TaskCategoryModal']
      .map(name => 'features/tasks/modals/' + name),
  ];
  const profiles = new Map();
  for (const component of consumers) {
    const ast = babel.parseSync(readFileSync(new URL('../src/' + component + '.js', import.meta.url), 'utf8'), { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
    const profile = { keys: new Set(), children: [], styleModule: null };
    const importedSource = (scope, name) => {
      const binding = scope.getBinding(name)?.path;
      assert.ok(binding?.isImportDefaultSpecifier(), `${component}: ${name} must resolve to a default import`);
      const source = binding.parentPath.node.source.value;
      assert.ok(source.startsWith('@/'), `${component}: expected @/ import for ${name}`);
      return source.slice(2);
    };
    babel.traverse(ast, {
      VariableDeclarator({ node, scope }) {
        if (node.id.name !== 'styles') return;
        assert.equal(node.init?.type, 'CallExpression', `${component}: expected styles factory call`);
        profile.styleModule = importedSource(scope, node.init.callee.name);
      },
      MemberExpression({ node }) {
        if (node.object.name === 'styles' && !node.computed) profile.keys.add(node.property.name);
      },
      JSXOpeningElement({ node, scope }) {
        if (node.attributes.some(attribute => attribute.name?.name === 'styles'
          && attribute.value?.expression?.name === 'styles')) {
          profile.children.push(importedSource(scope, node.name.name));
        }
      },
    });
    profiles.set(component, profile);
  }
  // Components receiving styles through props are checked against the factory
  // actually used by their parent, discovered from its JSX and imports.
  for (const [component, profile] of profiles) {
    const sources = profile.styleModule ? [profile.styleModule]
      : [...profiles.values()].filter(parent => parent.children.includes(component)).map(parent => parent.styleModule);
    assert.ok(sources.length && sources.every(Boolean), `${component}: no real style provider found`);
    for (const source of sources) {
      const { default: getStyles } = load(source);
      for (const [name, mode] of combinations) {
        const styles = getStyles(name, mode);
        for (const key of profile.keys) assert.ok(styles[key], `${component}: missing ${key} in ${source} (${name}/${mode})`);
      }
    }
  }
});

test('compatibility facade and focused sheets preserve colors in all palettes', () => {
  const { default: legacy } = load('styles/styles');
  const { default: card } = load('features/tasks/styles/taskCardStyles');
  const { default: screen } = load('features/tasks/styles/taskScreenStyles');
  const { default: modal } = load('styles/modalStyles');
  for (const [name, mode] of combinations) {
    const theme = themes[name][mode];
    assert.equal(card(name, mode).task.backgroundColor, theme.card);
    assert.equal(card(name, mode).subtaskProgressBadgeComplete.backgroundColor, theme.subtaskCounterCompleteBackground);
    assert.equal(modal(name, mode).saveButton.backgroundColor, theme.primary);
    assert.equal(modal(name, mode).saveButtonText.color, theme.onPrimary);
    assert.equal(legacy(name, mode).categoryContainer.inactiveColor, theme.inactiveCategory);
    assert.equal(screen(name, mode).categoryContainer.inactiveColor, undefined);
    assert.equal(screen(name, mode).modalBox, undefined);
    assert.equal(screen(name, mode).input, undefined);
    // Each load() uses an isolated module cache; compare their rendered values.
    for (const key of ['saveButton', 'saveButtonText']) {
      assert.deepEqual(JSON.parse(JSON.stringify(screen(name, mode)[key])), JSON.parse(JSON.stringify(modal(name, mode)[key])));
    }
    assert.equal(card(name, mode).calendarBox, undefined);
    assert.equal(modal(name, mode).taskCardContainer, undefined);
  }
});

test('empty-list text and inline icon use family tokens in every palette', () => {
  const source = readFileSync(new URL('../src/features/tasks/components/TaskList.js', import.meta.url), 'utf8');
  const code = babel.transformSync(source, { configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs', ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }]],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }) },
    require: name => {
      if (name === 'react-native') return Object.fromEntries(['FlatList', 'Text', 'TouchableWithoutFeedback', 'View'].map(key => [key, key]));
      if (name === 'react-native-reanimated') return {
        __esModule: true,
        default: { FlatList: 'Animated.FlatList' },
        LinearTransition: { duration: milliseconds => ({ milliseconds }) },
      };
      if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
      if (name === '@/features/tasks/components/TaskCard') return 'TaskCard';
      if (name.startsWith('@/')) return load(name.slice(2));
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const flatten = node => !node || typeof node !== 'object' ? [] : [node, ...node.children.flatMap(flatten)];
  for (const [themeName, mode] of combinations) {
    const nodes = flatten(module.exports.default({ tasks: [], themeName, mode }));
    const title = nodes.find(node => node.type === 'Text' && node.children.includes('¡No tienes ninguna tarea!'));
    const description = nodes.find(node => node.type === 'Text' && node.children.some(child => child?.props?.name === 'add-circle-outline'));
    const icon = nodes.find(node => node.props.name === 'add-circle-outline');
    assert.equal(title.props.style.color, themes[themeName][mode].text);
    assert.equal(description.props.style.color, themes[themeName][mode].inactiveCategoryText);
    assert.equal(icon.props.color, description.props.style.color);
  }
});
