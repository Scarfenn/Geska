import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef } from "react";
import { PanGestureHandler, State } from "react-native-gesture-handler";

export default function DaySelector({
  selectedDay,
  setSelectedDay,
  theme,
  mode,
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animación cuando cambia de semana
  const runSlideAnimation = (direction) => {
    slideAnim.setValue(direction === "left" ? 80 : -80);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 10,
      bounciness: 3,
    }).start();
  };

  // ✅ Semana anterior / siguiente (esto ya te funciona con flechas)
  const changeWeek = (offset) => {
    setSelectedDay((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset * 7);
      return d;
    });
  };

  const goPrevWeek = () => {
    Haptics.selectionAsync();
    changeWeek(-1);
    runSlideAnimation("right");
  };

  const goNextWeek = () => {
    Haptics.selectionAsync();
    changeWeek(1);
    runSlideAnimation("left");
  };

  // Lunes de la semana
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Dom, 1 = Lun...
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const generateWeek = () => {
    const days = [];
    const weekStart = getWeekStart(selectedDay);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const week = generateWeek();
  const today = new Date().toDateString();
  const isTodaySelected = selectedDay.toDateString() === today;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: slideAnim } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.END) {
      if (translationX > 80) {
        // swipe → derecha: semana anterior
        goPrevWeek();
      } else if (translationX < -80) {
        // swipe → izquierda: semana siguiente
        goNextWeek();
      } else {
        // no llegó al umbral → volver al centro
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 10,
        }).start();
      }
    }
  };

  return (
    <>
      {/* Header con flechas */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <TouchableOpacity onPress={goPrevWeek} style={{ padding: 10 }}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <Text
          style={{
            color: theme.text,
            fontSize: 18,
            fontWeight: "600",
            marginHorizontal: 12,
          }}
        >
          {selectedDay.toLocaleDateString("es-CL", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </Text>

        <TouchableOpacity onPress={goNextWeek} style={{ padding: 10 }}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Semana con swipe */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 6,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {week.map((d) => {
            const isToday = d.toDateString() === today;
            const isSelected =
              d.toDateString() === selectedDay.toDateString();

            return (
              <TouchableOpacity
                key={d.toDateString()}
                onPress={() => {
                  setSelectedDay(new Date(d));
                  Haptics.selectionAsync();
                }}
                style={{
                  width: 42,
                  height: 52,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected
                    ? theme.primary
                    : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isSelected ? "#fff" : theme.text,
                    fontWeight: isSelected ? "700" : "500",
                  }}
                >
                  {d
                    .toLocaleDateString("es-CL", { weekday: "short" })
                    .replace(".", "")[0]
                    .toUpperCase()}
                </Text>

                <Text
                  style={{
                    color: isSelected ? "#fff" : theme.text,
                    opacity: isSelected ? 1 : 0.8,
                    fontWeight: isSelected ? "700" : "500",
                  }}
                >
                  {d.getDate()}
                </Text>

                {isToday && !isSelected && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.primary,
                      marginTop: 3,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </PanGestureHandler>

      {/* Botón Hoy */}
      {!isTodaySelected && (
        <TouchableOpacity
          onPress={() => {
            setSelectedDay(new Date());
            Haptics.selectionAsync();
            runSlideAnimation("right");
          }}
          style={{
            alignSelf: "center",
            backgroundColor: theme.primary,
            paddingVertical: 3,
            paddingHorizontal: 15,
            borderRadius: 20,
            marginTop: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Hoy</Text>
        </TouchableOpacity>
      )}
    </>
  );
}
