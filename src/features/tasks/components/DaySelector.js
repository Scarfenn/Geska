import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";

export default function DaySelector({
  selectedDay,
  setSelectedDay,
  theme,
}) {
  const { width } = useWindowDimensions();

  const slideAnim =
    useRef(new Animated.Value(0)).current;

  const [isAnimating, setIsAnimating] =
    useState(false);

  const pageDistance = width;

  // ======================================================
  // FECHAS
  // ======================================================

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);

    return d;
  };

  const isSameWeek = (a, b) =>
    isSameDay(
      getWeekStart(a),
      getWeekStart(b)
    );

  const generateWeek = (date) => {
    const days = [];
    const weekStart = getWeekStart(date);

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }

    return days;
  };

  const week = generateWeek(selectedDay);
  const todayDate = new Date();
  const isTodaySelected =
    isSameDay(selectedDay, todayDate);

  // ======================================================
  // TRANSICIÓN DE SEMANA
  // ======================================================

  const animateToDate = (
    targetDate,
    direction
  ) => {
    if (isAnimating) return;

    setIsAnimating(true);
    Haptics.selectionAsync();

    const exitX =
      direction > 0
        ? -pageDistance
        : pageDistance;

    const enterX =
      direction > 0
        ? pageDistance
        : -pageDistance;

    Animated.timing(slideAnim, {
      toValue: exitX,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        setIsAnimating(false);
        return;
      }

      // La semana vieja ya salió por completo.
      // Colocamos la nueva fuera del lado contrario
      // antes de actualizar la fecha visible.
      slideAnim.setValue(enterX);
      setSelectedDay(new Date(targetDate));

      requestAnimationFrame(() => {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
        });
      });
    });
  };

  const changeWeek = (offset) => {
    if (isAnimating) return;

    const targetDate =
      new Date(selectedDay);

    targetDate.setDate(
      targetDate.getDate() + offset * 7
    );

    animateToDate(
      targetDate,
      offset > 0 ? 1 : -1
    );
  };

  const goPrevWeek = () => {
    changeWeek(-1);
  };

  const goNextWeek = () => {
    changeWeek(1);
  };

  const goToday = () => {
    if (isAnimating) return;

    const today = new Date();

    // Si hoy ya está dentro de la semana visible,
    // solo cambia la selección: no hay página que mover.
    if (isSameWeek(selectedDay, today)) {
      Haptics.selectionAsync();
      setSelectedDay(today);
      return;
    }

    animateToDate(
      today,
      today > selectedDay ? 1 : -1
    );
  };

  // ======================================================
  // GESTO
  // ======================================================

  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: slideAnim,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const returnToCenter = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      speed: 18,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  };

  const onHandlerStateChange = (event) => {
    const {
      state,
      translationX,
      velocityX,
    } = event.nativeEvent;

    if (
      state === State.CANCELLED ||
      state === State.FAILED
    ) {
      returnToCenter();
      return;
    }

    if (state !== State.END) return;

    const distanceThreshold =
      Math.min(80, width * 0.2);

    const velocityThreshold = 700;

    const shouldGoPrev =
      translationX > distanceThreshold ||
      velocityX > velocityThreshold;

    const shouldGoNext =
      translationX < -distanceThreshold ||
      velocityX < -velocityThreshold;

    if (shouldGoPrev) {
      changeWeek(-1);
      return;
    }

    if (shouldGoNext) {
      changeWeek(1);
      return;
    }

    returnToCenter();
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <TouchableOpacity
          onPress={goPrevWeek}
          disabled={isAnimating}
          style={{ padding: 10 }}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        <Text
          style={{
            color: theme.text,
            fontSize: 18,
            fontWeight: "600",
            marginHorizontal: 12,
          }}
        >
          {selectedDay.toLocaleDateString(
            "es-CL",
            {
              weekday: "short",
              day: "numeric",
              month: "short",
            }
          )}
        </Text>

        <TouchableOpacity
          onPress={goNextWeek}
          disabled={isAnimating}
          style={{ padding: 10 }}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Semana */}
      <View
        style={{
          overflow: "hidden",
        }}
      >
        <PanGestureHandler
          enabled={!isAnimating}
          activeOffsetX={[-12, 12]}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={
            onHandlerStateChange
          }
        >
          <Animated.View
            style={{
              flexDirection: "row",
              justifyContent:
                "space-between",
              alignItems: "center",
              paddingHorizontal: 6,
              transform: [
                {
                  translateX:
                    slideAnim,
                },
              ],
            }}
          >
            {week.map((d) => {
              const isToday =
                isSameDay(
                  d,
                  todayDate
                );

              const isSelected =
                isSameDay(
                  d,
                  selectedDay
                );

              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  disabled={isAnimating}
                  onPress={() => {
                    setSelectedDay(
                      new Date(d)
                    );
                    Haptics.selectionAsync();
                  }}
                  style={{
                    width: 42,
                    height: 52,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent:
                      "center",
                    backgroundColor:
                      isSelected
                        ? theme.primary
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? theme.onPrimary
                        : theme.text,
                      fontWeight:
                        isSelected
                          ? "700"
                          : "500",
                    }}
                  >
                    {d
                      .toLocaleDateString(
                        "es-CL",
                        {
                          weekday:
                            "short",
                        }
                      )
                      .replace(".", "")[0]
                      .toUpperCase()}
                  </Text>

                  <Text
                    style={{
                      color: isSelected
                        ? theme.onPrimary
                        : theme.text,
                      opacity: isSelected
                        ? 1
                        : 0.8,
                      fontWeight:
                        isSelected
                          ? "700"
                          : "500",
                    }}
                  >
                    {d.getDate()}
                  </Text>

                  {isToday &&
                    !isSelected && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            theme.primary,
                          marginTop: 3,
                        }}
                      />
                    )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Hoy */}
      {!isTodaySelected && (
        <TouchableOpacity
          onPress={goToday}
          disabled={isAnimating}
          style={{
            alignSelf: "center",
            backgroundColor:
              theme.primary,
            paddingVertical: 3,
            paddingHorizontal: 15,
            borderRadius: 20,
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: theme.onPrimary,
              fontWeight: "600",
            }}
          >
            Hoy
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}
