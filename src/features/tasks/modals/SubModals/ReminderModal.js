import useModalAnimation from "@/hooks/useModalAnimation";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

import useReminderOptions from "@/features/tasks/hooks/useReminderOptions";
import { isOptionActive, optionKey } from "@/features/tasks/domain/reminderOptions";

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

  const { options, subtitle, persistentText, select, notice } = useReminderOptions({
    selectedDate, selectedTime, repeatMode,
  });
  const { opacityAnim, slideAnim, scaleAnim, animateOpen, animateClose, mounted, closing } = useModalAnimation(closeModal, { visible, openDuration: 200 });

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
