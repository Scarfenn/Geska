import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

export default function useAndroidNavigationBar(mode, enabled) {
  useEffect(() => {
    if (Platform.OS !== "android" || !enabled) return;

    // Edge-to-edge provides the transparent background. Only change contrast here.
    const applyStyle = () => {
      NavigationBar.setButtonStyleAsync(mode === "dark" ? "light" : "dark")
        .catch(error => console.warn("No se pudo actualizar la barra de navegación", error));
    };

    applyStyle();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") applyStyle();
    });
    return () => subscription.remove();
  }, [mode, enabled]);
}
