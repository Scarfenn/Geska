import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes } from "@/styles/themes";
import { createThemePreferencesStore, validateThemePreferences } from "@/services/themePreferences";

const store = createThemePreferencesStore(AsyncStorage);

export default function useThemePreferences() {
  const [state, setState] = useState({ themeName: "basic", mode: "light", loaded: false, revision: 0 });
  useEffect(() => {
    let active = true;
    store.load().then(preferences => {
      if (active) setState(current => ({ ...current, ...(current.revision ? {} : preferences), loaded: true }));
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    // Do not overwrite stored preferences just because reading them failed.
    if (state.loaded && state.revision > 0) store.save(state);
  }, [state.themeName, state.mode, state.loaded, state.revision]);
  const setField = field => value => setState(current => {
    const next = typeof value === "function" ? value(current[field]) : value;
    const preferences = validateThemePreferences(
      field === "themeName" ? next : current.themeName,
      field === "mode" ? next : current.mode,
    );
    if (preferences.themeName === current.themeName && preferences.mode === current.mode) return current;
    return { ...current, ...preferences, revision: current.revision + 1 };
  });
  return {
    themeName: state.themeName, mode: state.mode, isThemeLoaded: state.loaded,
    currentTheme: themes[state.themeName][state.mode],
    setThemeName: setField("themeName"), setMode: setField("mode"),
  };
}
