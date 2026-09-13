import { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

import useReminderOptions from "../../hooks/useReminderOptions";
import { isOptionActive, optionKey } from "../../domain/reminderOptions";

export default function ReminderModal(props) {
  return props.visible ? <ReminderModalSession {...props} /> : null;
}

function ReminderModalSession({
  visible,
  themeName,
  mode,

  selectedDate,
  selectedTime,
  repeatMode,

  reminder,
  setReminder,

  closeModal,
}) {
  const styles =
    createStyles(themeName, mode);

  const theme =
    themes[themeName][mode];

  const opacityAnim = useRef(
    new Animated.Value(0)
  ).current;

  const slideAnim = useRef(
    new Animated.Value(20)
  ).current;

  const scaleAnim = useRef(
    new Animated.Value(0.95)
  ).current;

  const { options, subtitle, persistentText, select, notice } = useReminderOptions({
    selectedDate, selectedTime, repeatMode,
  });
  const animation = useRef(null);
  const closing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; animation.current?.stop(); };
  }, []);

  const animateOpen = () => {
    if (closing.current) return;
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.95);

    animation.current?.stop();
    animation.current = Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        easing:
          Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing:
          Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing:
          Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    animation.current.start();
  };

  const animateClose = () => {
    if (closing.current || !mounted.current) return;
    closing.current = true;
    animation.current?.stop();
    animation.current = Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 160,
        easing:
          Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 160,
        easing:
          Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 160,
        easing:
          Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    animation.current.start(({ finished }) => {
      if (finished && mounted.current) closeModal();
    });
  };

  const selectOption = (option) => {
    if (closing.current || !mounted.current) return;
    const result = select(optionKey(option));
    if (!result.valid) return;
    animateClose();
    setReminder(result.reminder);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={animateOpen}
      onRequestClose={animateClose}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback
          onPress={animateClose}
        >
          <View
            style={
              StyleSheet.absoluteFillObject
            }
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalBox,
            {
              width: "85%",
              borderRadius: 14,

              paddingVertical: 18,
              paddingHorizontal: 18,

              transform: [
                {
                  translateY:
                    slideAnim,
                },
                {
                  scale:
                    scaleAnim,
                },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                marginBottom: 6,
              },
            ]}
          >
            Recordatorio
          </Text>

          <Text
            style={{
              color:
                theme.inactiveCategoryText,

              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {subtitle}
          </Text>

          {notice && <Text accessibilityLiveRegion="polite" style={{ color: theme.inactiveCategoryText, marginBottom: 10 }}>{notice}</Text>}
          {options.map((option) => {
            const active =
              isOptionActive(
                reminder,
                option
              );

            const key = optionKey(option);

            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                activeOpacity={0.7}
                style={[
                  styles.optionRow,
                  {
                    justifyContent:
                      "space-between",
                  },
                ]}
                onPress={() =>
                  selectOption(option)
                }
              >
                <View
                  style={{
                    flex: 1,
                    paddingRight: 8,
                  }}
                >
                  <Text
                    style={[
                      styles.optionLabel,

                      active && {
                        color:
                          theme.primaryText,

                        fontWeight:
                          "600",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>

                  {option.reminder?.type ===
                    "persistent" && (
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        color:
                          theme.inactiveCategoryText,
                      }}
                    >
                      {persistentText}
                    </Text>
                  )}
                </View>

                {active && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={
                      theme.primaryText
                    }
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
