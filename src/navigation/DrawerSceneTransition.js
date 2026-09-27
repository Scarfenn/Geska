import { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const transition = { duration: 300, easing: Easing.out(Easing.cubic) };
const styles = StyleSheet.create({ fill: { flex: 1 } });

export default function DrawerSceneTransition({ children, backgroundColor }) {
  // screenLayout places this above the child navigator, so this is the Drawer
  // route's focus. Child pushes/pops and opening the menu do not change it.
  const isFocused = useIsFocused();
  const progress = useSharedValue(0);

  useLayoutEffect(() => {
    progress.value = 0;
    if (isFocused) progress.value = withTiming(1, transition);
    return () => cancelAnimation(progress);
  }, [isFocused, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 8 * (1 - progress.value) }],
  }));

  return (
    <View style={[styles.fill, { backgroundColor }]}>
      <Animated.View style={[styles.fill, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

// A stable, navigator-wide layout also covers future Drawer modules without
// remounting their screens or tying the transition to theme updates.
export function drawerScreenLayout({ children, theme }) {
  return (
    <DrawerSceneTransition backgroundColor={theme.colors.background}>
      {children}
    </DrawerSceneTransition>
  );
}
