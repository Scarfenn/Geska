import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
  ScrollView,
} from "react-native";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

const MODES = [
  { key: "none", label: "Ninguno" },
  { key: "daily", label: "Diario" },
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensual" },
];

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function RepeatModal({
  visible,
  themeName,
  mode,

  selectedDate,

  repeatMode,
  setRepeatMode,

  repeatDays,
  setRepeatDays,

  repeatInterval,
  setRepeatInterval,

  endDate,
  setEndDate,

  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  const [localMode, setLocalMode] = useState(repeatMode);
  const [localWeekDays, setLocalWeekDays] = useState([]);
  const [localMonthDays, setLocalMonthDays] = useState([]);

  const [localInterval, setLocalInterval] = useState(repeatInterval || 1);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  const modalHeight = useRef(new Animated.Value(230)).current;

  const MODAL_HEIGHTS = {
    none: 230,
    daily: 420,
    weekly: 500,
    monthly: 670,
  };

  useEffect(() => {
    if (!visible) return;

    setLocalWeekDays(
      repeatMode === "weekly"
        ? [...(repeatDays || [])]
        : []
    );
    setLocalMonthDays(
      repeatMode === "monthly"
        ? (repeatDays || []).map(String)
        : []
    );
    setLocalMode(repeatMode);
    setLocalInterval(repeatInterval || 1);
    setLocalEndDate(endDate);
  }, [visible]);

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

  const animateClose = (callback) => {
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
    ]).start(() => {
      callback?.();
      closeModal();
    });
  };

  useEffect(() => {
    Animated.timing(modalHeight, {
      toValue: MODAL_HEIGHTS[localMode],
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [localMode]);

  const getDefaultWeekDay = () => {
    if (!selectedDate) return "L";

    const day = new Date(selectedDate).getDay();
    const map = ["D", "L", "M", "X", "J", "V", "S"];

    return map[day];
  };

  const getDefaultMonthDay = () => {
    if (!selectedDate) return 1;
    return new Date(selectedDate).getDate();
  };

  const selectMode = (nextMode) => {
    setLocalMode(nextMode);
    setLocalInterval(1);

    if (nextMode === "none") {
      setLocalEndDate(null);
      return;
    }

    if (nextMode === "weekly" && !localWeekDays.length) {
        setLocalWeekDays([getDefaultWeekDay()]);
    }

    if (nextMode === "monthly" && !localMonthDays.length) {
        setLocalMonthDays([String(getDefaultMonthDay())]);
    }
  };

  const toggleWeekDay = (day) => {
    setLocalWeekDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day]
    );
  };

  const toggleMonthDay = (day) => {
    const value = String(day);

    setLocalMonthDays((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const decreaseInterval = () => {
    setLocalInterval((current) => Math.max(1, current - 1));
  };

  const increaseInterval = () => {
    setLocalInterval((current) => current + 1);
  };

  const handleApply = () => {
    setRepeatMode(localMode);

    if (localMode === "weekly") {
      setRepeatDays(localWeekDays);
    } else if (localMode === "monthly") {
      setRepeatDays(localMonthDays);
    } else {
      setRepeatDays([]);
    }

    setRepeatInterval(localInterval);
    setEndDate(localEndDate);

    animateClose();
  };

  const getUnitLabel = () => {
    if (localMode === "daily") {
      return localInterval === 1 ? "día" : "días";
    }

    if (localMode === "weekly") {
      return localInterval === 1 ? "semana" : "semanas";
    }

    if (localMode === "monthly") {
      return localInterval === 1 ? "mes" : "meses";
    }

    return "";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={animateOpen}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={() => animateClose()}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={{
            width: "90%",
            opacity: opacityAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          }}
        >
        <Animated.View
          style={[
            styles.modalBox,
            {
              width: "100%",
              height: modalHeight,

              borderRadius: 16,

              paddingVertical: 20,
              paddingHorizontal: 18,
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                marginBottom: 16,
              },
            ]}
          >
            Repetición
          </Text>

            {/* SELECTOR */}
            <View
              style={{
                flexDirection: "row",

                borderWidth: 1,
                borderColor: theme.border,

                borderRadius: 12,

                overflow: "hidden",
              }}
            >
              {MODES.map((item) => {
                const active = localMode === item.key;

                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => selectMode(item.key)}
                    activeOpacity={0.75}
                    style={{
                      flex: 1,

                      paddingVertical: 10,

                      alignItems: "center",
                      justifyContent: "center",

                      backgroundColor: active
                        ? theme.primary
                        : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,

                        fontWeight: active
                          ? "700"
                          : "500",

                        color: active
                          ? theme.card
                          : theme.text,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{
              paddingTop: 18,
              paddingBottom: 4,
            }}
          >
            {/* OPCIONES SEMANALES */}
            {localMode === "weekly" && (
              <View
                style={{
                  marginBottom: 18,
                }}
              >
                <Text
                  style={{
                    color: theme.inactiveCategoryText,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  Días de la semana
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  {WEEK_DAYS.map((day) => {
                    const active = localWeekDays.includes(day);

                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleWeekDay(day)}
                        style={{
                          width: 36,
                          height: 36,

                          borderRadius: 18,

                          justifyContent: "center",
                          alignItems: "center",

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
                              ? theme.card
                              : theme.text,

                            fontWeight: active
                              ? "700"
                              : "500",
                          }}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* OPCIONES MENSUALES */}
            {localMode === "monthly" && (
              <View
                style={{
                  marginBottom: 18,
                }}
              >
                <Text
                  style={{
                    color: theme.inactiveCategoryText,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  Días del mes
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {MONTH_DAYS.map((day) => {
                    const active = localMonthDays.includes(String(day));

                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleMonthDay(day)}
                        style={{
                          width: 36,
                          height: 36,

                          borderRadius: 18,

                          justifyContent: "center",
                          alignItems: "center",

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
                              ? theme.card
                              : theme.text,

                            fontSize: 12,

                            fontWeight: active
                              ? "700"
                              : "500",
                          }}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* INTERVALO */}
            {localMode !== "none" && (
              <View
                style={{
                  marginBottom: 18,
                }}
              >
                <Text
                  style={{
                    color: theme.inactiveCategoryText,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  Intervalo
                </Text>

                <View
                  style={{
                    flexDirection: "row",

                    alignItems: "center",
                    justifyContent: "space-between",

                    paddingVertical: 10,
                    paddingHorizontal: 14,

                    borderRadius: 12,

                    borderWidth: 1,
                    borderColor: theme.border,

                    backgroundColor: theme.card,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 15,
                    }}
                  >
                    Cada
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      onPress={decreaseInterval}
                      style={{
                        width: 34,
                        height: 34,

                        borderRadius: 17,

                        justifyContent: "center",
                        alignItems: "center",

                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 20,
                        }}
                      >
                        −
                      </Text>
                    </TouchableOpacity>

                    <Text
                      style={{
                        color: theme.text,

                        minWidth: 38,

                        textAlign: "center",

                        fontSize: 16,
                        fontWeight: "700",

                        marginHorizontal: 6,
                      }}
                    >
                      {localInterval}
                    </Text>

                    <TouchableOpacity
                      onPress={increaseInterval}
                      style={{
                        width: 34,
                        height: 34,

                        borderRadius: 17,

                        justifyContent: "center",
                        alignItems: "center",

                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 20,
                        }}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 15,
                    }}
                  >
                    {getUnitLabel()}
                  </Text>
                </View>
              </View>
            )}

            {/* FECHA DE TÉRMINO */}
            {localMode !== "none" && (
              <View
                style={{
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    color: theme.inactiveCategoryText,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  Fecha de término
                </Text>

                <TouchableOpacity
                  activeOpacity={0.75}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 14,

                    borderRadius: 12,

                    borderWidth: 1,
                    borderColor: theme.border,

                    backgroundColor: theme.card,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 15,
                    }}
                  >
                    {localEndDate
                      ? localEndDate.toLocaleDateString("es-CL")
                      : "Nunca"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                marginTop: 18,
              },
            ]}
            onPress={handleApply}
          >
            <Text style={styles.saveButtonText}>
              Aplicar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => animateClose()}
            style={{
              marginTop: 10,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: theme.inactiveCategoryText,
              }}
            >
              Cancelar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Animated.View>
    </Modal>
  );
}