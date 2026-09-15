import { useEffect } from "react";
import { NativeModules, Platform } from "react-native";

export default function useAndroidAppTheme(mode, enabled) {
  useEffect(() => {
    if (Platform.OS !== "android" || !enabled) return;
    const nativeTheme = NativeModules.GeskaAppTheme;
    if (!nativeTheme) {
      // Expo Go and development clients built before this module do not include it.
      if (__DEV__) console.warn("Recompila Android para sincronizar el tema del splash de Geska.");
      return;
    }
    nativeTheme.setMode(mode).catch(error => {
      console.warn("No se pudo sincronizar el tema de Android con Geska", error);
    });
  }, [mode, enabled]);
}
