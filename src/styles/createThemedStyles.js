import { StyleSheet } from "react-native";
import { themes } from "@/styles/themes";

// Theme definitions are static. Each factory shares one stylesheet per palette
// and mode across all of its mounted consumers.
export default function createThemedStyles(build) {
  const cache = new WeakMap();
  return (themeName = "basic", mode = "light") => {
    const theme = themes[themeName][mode];
    let modes = cache.get(theme);
    if (!modes) { modes = new Map(); cache.set(theme, modes); }
    if (!modes.has(mode)) modes.set(mode, StyleSheet.create(build(theme, mode, themeName)));
    return modes.get(mode);
  };
}
