const fs = require('node:fs/promises');
const path = require('node:path');
const { withMainApplication, withDangerousMod } = require('expo/config-plugins');

function registerPackage(contents) {
  if (contents.includes('add(GeskaAppThemePackage())')) return contents;
  const anchor = /PackageList\(this\)\.packages\.apply\s*\{/;
  if (!anchor.test(contents)) throw new Error('GeskaAppTheme: unsupported MainApplication package registration');
  return contents.replace(anchor, '$&\n              add(GeskaAppThemePackage())');
}

function withAndroidAppTheme(config) {
  config = withMainApplication(config, config => {
    if (config.modResults.language !== 'kt') throw new Error('GeskaAppTheme requires Kotlin MainApplication');
    config.modResults.contents = registerPackage(config.modResults.contents);
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    const packageName = config.android.package;
    const directory = path.join(config.modRequest.platformProjectRoot, 'app/src/main/java', ...packageName.split('.'));
    const template = await fs.readFile(path.join(__dirname, 'android-app-theme/GeskaAppThemePackage.kt'), 'utf8');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'GeskaAppThemePackage.kt'), template.replace('__PACKAGE__', packageName));
    return config;
  }]);
}

module.exports = withAndroidAppTheme;
module.exports.registerPackage = registerPackage;
