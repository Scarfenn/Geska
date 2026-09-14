import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

// Only the container transition lives here; callers own drafts and persistence.
export default function useModalAnimation(closeModal, {
  visible = true, distance = 20, scale = 0.95, openDuration = 220, closeDuration = 160,
  openEasing = Easing.out(Easing.cubic), scaleEasing = Easing.out(Easing.ease),
  closeEasing = Easing.in(Easing.ease), opacityEasing = openEasing,
} = {}) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(distance)).current;
  const scaleAnim = useRef(new Animated.Value(scale ?? 1)).current;
  const animation = useRef(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const closing = useRef(false);
  const shown = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const stop = () => { generation.current++; animation.current?.stop(); };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  }, []);
  useEffect(() => {
    if (!visible) {
      stop();
      shown.current = false;
      closing.current = false;
      opacityAnim.setValue(0);
      slideAnim.setValue(distance);
      scaleAnim.setValue(scale ?? 1);
    }
  }, [visible]);
  const animate = (open, callback) => {
    stop();
    const token = generation.current;
    const tracks = [[opacityAnim, open ? 1 : 0, opacityEasing], [slideAnim, open ? 0 : distance, openEasing]];
    if (scale != null) tracks.push([scaleAnim, open ? 1 : scale, scaleEasing]);
    animation.current = Animated.parallel(tracks.map(([value, toValue, easing]) => Animated.timing(value, {
      toValue, duration: open ? openDuration : closeDuration,
      ...(open ? easing ? { easing } : {} : closeEasing ? { easing: closeEasing } : {}),
      useNativeDriver: true,
    })));
    animation.current.start(({ finished }) => {
      if (generation.current !== token || !mounted.current || !visibleRef.current) return;
      if (!finished) { closing.current = false; shown.current = false; return; }
      generation.current++;
      callback?.();
    });
  };
  const animateOpen = () => {
    if (!mounted.current || !visibleRef.current || shown.current || closing.current) return;
    shown.current = true;
    animate(true);
  };
  const animateClose = (afterClose) => {
    if (!mounted.current || !visibleRef.current || closing.current) return;
    closing.current = true;
    animate(false, () => {
      closeModal();
      if (typeof afterClose === "function") afterClose();
    });
  };
  return { opacityAnim, slideAnim, scaleAnim, mounted, closing, animateOpen, handleShow: animateOpen, animateClose };
}
