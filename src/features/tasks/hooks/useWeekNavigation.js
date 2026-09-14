import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { State } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { addCalendarDays, isSameWeek } from "@/features/tasks/domain/calendarDates";

export default function useWeekNavigation(selectedDay, setSelectedDay, width) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const animation = useRef(null);
  const frame = useRef(null);
  const generation = useRef(0);
  const latest = useRef({ selectedDay, setSelectedDay });
  latest.current = { selectedDay, setSelectedDay };
  const stop = () => {
    generation.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    animation.current?.stop();
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  }, []);
  useEffect(() => {
    stop();
    busy.current = false;
    setIsAnimating(false);
    slideAnim.setValue(0);
  }, [width]);
  const haptic = () => { Haptics.selectionAsync().catch(() => {}); };
  const finish = () => {
    busy.current = false;
    setIsAnimating(false);
  };
  const animateToDate = (targetDate, direction) => {
    if (busy.current || !mounted.current) return;
    stop();
    const token = generation.current;
    busy.current = true;
    setIsAnimating(true);
    haptic();
    animation.current = Animated.timing(slideAnim, {
      toValue: direction > 0 ? -width : width,
      duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    });
    animation.current.start(({ finished }) => {
      if (!mounted.current || token !== generation.current) return;
      if (!finished) { slideAnim.setValue(0); finish(); return; }
      slideAnim.setValue(direction > 0 ? width : -width);
      latest.current.setSelectedDay(new Date(targetDate));
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (!mounted.current || token !== generation.current) return;
        animation.current = Animated.timing(slideAnim, {
          toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        });
        animation.current.start(() => {
          if (mounted.current && token === generation.current) finish();
        });
      });
    });
  };
  const selectDay = date => {
    if (busy.current) return;
    latest.current.setSelectedDay(new Date(date));
    haptic();
  };
  const changeWeek = direction => animateToDate(addCalendarDays(latest.current.selectedDay, direction * 7), direction);
  const goToday = () => {
    const today = new Date();
    if (isSameWeek(latest.current.selectedDay, today)) selectDay(today);
    else animateToDate(today, today > latest.current.selectedDay ? 1 : -1);
  };
  const returnToCenter = () => {
    if (busy.current) return;
    stop();
    animation.current = Animated.spring(slideAnim, { toValue: 0, speed: 18, bounciness: 2, useNativeDriver: true });
    animation.current.start();
  };
  const onHandlerStateChange = ({ nativeEvent: { state, translationX, velocityX } }) => {
    if (busy.current) return;
    if (state === State.BEGAN) { stop(); return; }
    if (state === State.CANCELLED || state === State.FAILED) { returnToCenter(); return; }
    if (state !== State.END) return;
    const threshold = Math.min(80, width * 0.2);
    if (translationX > threshold || velocityX > 700) changeWeek(-1);
    else if (translationX < -threshold || velocityX < -700) changeWeek(1);
    else returnToCenter();
  };
  const onGestureEvent = Animated.event([{ nativeEvent: { translationX: slideAnim } }], { useNativeDriver: true });
  return { slideAnim, isAnimating, selectDay, goToday, goPrevWeek: () => changeWeek(-1), goNextWeek: () => changeWeek(1), onGestureEvent, onHandlerStateChange };
}
