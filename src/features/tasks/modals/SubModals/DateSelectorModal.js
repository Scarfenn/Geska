import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDay(a, b) {
  if (!a || !b) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getInitialWindowStart(selectedDate) {
  const today = startOfDay(new Date());
  const selected = startOfDay(selectedDate || today);
  const diffDays = Math.round((selected - today) / DAY_MS);

  if (diffDays >= 0 && diffDays < WINDOW_DAYS) {
    return today;
  }

  const start = new Date(selected);
  start.setDate(start.getDate() - 3);
  return start;
}

function formatRange(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + WINDOW_DAYS - 1);

  const start = startDate.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });

  const end = endDate.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${start} — ${end}`;
}

export default function DateSelectorModal({
  visible,
  themeName,
  mode,
  selectedDate,
  onSelectDate,
  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const [windowStart, setWindowStart] = useState(
    getInitialWindowStart(selectedDate)
  );

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (!visible) return;

    setWindowStart(getInitialWindowStart(selectedDate));
  }, [visible, selectedDate]);

  const animateOpen = () => {
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.96);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 160,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 160,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(closeModal);
  };

  const shiftWindow = (direction) => {
    Haptics.selectionAsync();

    setWindowStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + direction * WINDOW_DAYS);
      return next;
    });
  };

  const days = Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = new Date(windowStart);
    date.setDate(windowStart.getDate() + index);
    return date;
  });

  const today = startOfDay(new Date());

  const handleSelect = (date) => {
    Haptics.selectionAsync();
    onSelectDate(new Date(date));
    animateClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={animateOpen}
    >
      <TouchableWithoutFeedback onPress={animateClose}>
        <Animated.View
          style={[
            styles.modalOverlay,
            { opacity: opacityAnim },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalBox,
                {
                  width: "92%",
                  borderRadius: 14,
                  paddingVertical: 20,
                  paddingHorizontal: 18,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <Text style={[styles.modalTitle, { marginBottom: 4 }]}>
                Seleccionar fecha
              </Text>

              <Text
                style={{
                  color: theme.inactiveCategoryText,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Elige el día en que quieres realizar la tarea
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => shiftWindow(-1)}
                  hitSlop={8}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={theme.text}
                  />
                </TouchableOpacity>

                <Text
                  style={{
                    color: theme.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {formatRange(windowStart)}
                </Text>

                <TouchableOpacity
                  onPress={() => shiftWindow(1)}
                  hitSlop={8}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingVertical: 4,
                  paddingHorizontal: 2,
                }}
              >
                {days.map((date) => {
                  const active = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, today);

                  const weekday = date
                    .toLocaleDateString("es-CL", { weekday: "short" })
                    .replace(".", "")
                    .toUpperCase();

                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(date)}
                      style={{
                        width: 58,
                        minHeight: 72,
                        marginRight: 8,
                        paddingVertical: 9,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active
                          ? theme.primary
                          : theme.card,
                        borderWidth: 1,
                        borderColor: active
                          ? theme.primary
                          : theme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: active
                            ? theme.onPrimary
                            : theme.inactiveCategoryText,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {weekday}
                      </Text>

                      <Text
                        style={{
                          color: active ? theme.onPrimary : theme.text,
                          fontSize: 20,
                          fontWeight: "700",
                          marginTop: 2,
                        }}
                      >
                        {date.getDate()}
                      </Text>

                      <Text
                        style={{
                          color: active
                            ? theme.onPrimary
                            : theme.inactiveCategoryText,
                          fontSize: 10,
                          marginTop: 1,
                        }}
                      >
                        {date.toLocaleDateString("es-CL", {
                          month: "short",
                        })}
                      </Text>

                      {isToday && !active && (
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: theme.primary,
                            marginTop: 3,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                onPress={() => handleSelect(today)}
                style={{
                  alignSelf: "center",
                  marginTop: 14,
                  paddingVertical: 7,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.primary,
                }}
              >
                <Text
                  style={{
                    color: theme.primaryText,
                    fontWeight: "600",
                  }}
                >
                  Ir a hoy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={animateClose}
                style={{ marginTop: 12 }}
              >
                <Text style={styles.modalCancelText}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
