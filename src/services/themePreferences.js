import { themes } from "@/styles/themes";

export function validateThemePreferences(themeName, mode) {
  const validTheme = typeof themeName === "string" && Object.hasOwn(themes, themeName) ? themeName : "basic";
  const validMode = (mode === "light" || mode === "dark") && themes[validTheme][mode] ? mode : "light";
  return { themeName: validTheme, mode: validMode };
}

export function createThemePreferencesStore(storage, reportError = console.warn) {
  let writes = Promise.resolve();
  return {
    async load() {
      try {
        const entries = Object.fromEntries(await storage.multiGet(["themeName", "mode"]));
        return validateThemePreferences(entries.themeName, entries.mode);
      } catch (error) {
        reportError("No se pudo cargar el tema", error);
        return validateThemePreferences(null, null);
      }
    },
    save(preferences) {
      const { themeName, mode } = validateThemePreferences(preferences.themeName, preferences.mode);
      writes = writes.then(() => storage.multiSet([["themeName", themeName], ["mode", mode]]))
        .catch(error => { reportError("No se pudo guardar el tema", error); });
      return writes;
    },
  };
}
