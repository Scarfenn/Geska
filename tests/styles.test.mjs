import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
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
    ['features/tasks/TasksScreen', 'features/tasks/styles/taskScreenStyles'],
    ['features/tasks/components/CategoryBar', 'features/tasks/styles/taskScreenStyles'],
    ['features/tasks/components/TaskList', 'features/tasks/styles/taskListStyles'],
    ['features/tasks/components/TaskCard', 'features/tasks/styles/taskCardStyles'],
    ['features/tasks/components/SubtaskEditorRow', 'styles/modalStyles'],
    ['features/tasks/modals/TaskModal', 'features/tasks/styles/taskModalStyles'],
    ['features/tasks/modals/SubModals/RepeatModal', 'features/tasks/styles/repeatModalStyles'],
    ...['CategoryModal', 'TimeModal', 'SubtaskModal', 'SubModals/HourModal', 'SubModals/ReminderModal', 'SubModals/TaskCategoryModal', 'SubModals/CustomRepeatModal']
      .map(name => ['features/tasks/modals/' + name, 'styles/modalStyles']),
  ];
  for (const [component, styleModule] of consumers) {
    const ast = babel.parseSync(readFileSync(new URL('../src/' + component + '.js', import.meta.url), 'utf8'), { configFile: false, babelrc: false, parserOpts: { plugins: ['jsx'] } });
    const keys = new Set();
    babel.traverse(ast, { MemberExpression({ node }) { if (node.object.name === 'styles' && !node.computed) keys.add(node.property.name); } });
    const { default: getStyles } = load(styleModule);
    for (const [name, mode] of combinations) {
      const styles = getStyles(name, mode);
      for (const key of keys) assert.ok(styles[key], `${component}: missing ${key} (${name}/${mode})`);
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
    assert.equal(card(name, mode).calendarBox, undefined);
    assert.equal(modal(name, mode).taskCardContainer, undefined);
  }
});
