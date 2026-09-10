import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export default function useHourModalAnimation(closeModal) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const animation = useRef(null);
  const closing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      animation.current?.stop();
    };
  }, []);
  const animate = (open, callback) => {
    animation.current?.stop();
    animation.current = Animated.parallel(
      [[opacityAnim, open ? 1 : 0], [slideAnim, open ? 0 : 20], [scaleAnim, open ? 1 : 0.95]]
        .map(([value, toValue]) => Animated.timing(value, {
          toValue, duration: open ? 220 : 180,
          easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.ease),
          useNativeDriver: true,
        })),
    );
    animation.current.start(({ finished }) => {
      if (finished && mounted.current) callback?.();
    });
  };
  return {
    opacityAnim, slideAnim, scaleAnim,
    handleShow: () => { if (!closing.current) animate(true); },
    animateClose: (commit) => {
      if (closing.current || !mounted.current) return;
      closing.current = true;
      // Commit after the exit animation so a new selectedTime cannot remount
      // the visible session halfway through closing.
      animate(false, () => {
        closeModal();
        if (typeof commit === "function") commit();
      });
    },
  };
}
