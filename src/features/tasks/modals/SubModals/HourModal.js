import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, StyleSheet } from "react-native";
import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import TimeWheel from "@/features/tasks/components/time/TimeWheel";
import useHourDraft from "@/features/tasks/hooks/useHourDraft";
import useHourModalAnimation from "@/features/tasks/hooks/useHourModalAnimation";
import { HOURS, MINUTES, CENTER_PADDING, ITEM_HEIGHT } from "@/features/tasks/domain/hourPickerModel";

export default function HourModal(props) {
  if (!props.visible) return null;
  // Reset the draft and both native wheels together, never on AM/PM changes.
  const sessionKey = props.selectedTime instanceof Date ? String(props.selectedTime.getTime()) : "none";
  return <HourModalSession key={sessionKey} {...props} />;
}

function HourModalSession({ visible, themeName, mode, selectedTime, setSelectedTime, closeModal }) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];
  const { initial, hourRef, minuteRef, period, setPeriod, isMoving, setMoving, canApply, buildTime } = useHourDraft(selectedTime);
  const { opacityAnim, slideAnim, scaleAnim, handleShow, animateClose } = useHourModalAnimation(closeModal);
  const applyTime = () => {
    if (!canApply()) return;
    const date = buildTime();
    animateClose(() => setSelectedTime(date));
  };
  const clearTime = () => animateClose(() => setSelectedTime(null));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={handleShow}
      onRequestClose={() => animateClose()}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback
          onPress={() => animateClose()}
        >
          <View
            style={
              StyleSheet.absoluteFillObject
            }
          />
        </TouchableWithoutFeedback>

        {/* Caja */}
        <Animated.View
          style={[
            styles.modalBox,
            {
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

              width: "85%",
              borderRadius: 14,
              paddingVertical: 18,
              paddingHorizontal: 18,
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                marginBottom: 10,
              },
            ]}
          >
            Hora
          </Text>

          {/* Picker */}
          <View
            style={{
              backgroundColor:
                theme.card,

              borderWidth: 1,
              borderColor:
                theme.border,

              borderRadius: 12,

              paddingVertical: 10,
              paddingHorizontal: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  position: "relative",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* Fondo de la fila seleccionada */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",

                    top:
                      CENTER_PADDING,

                    left: 16,
                    right: 10,

                    height: ITEM_HEIGHT,

                    borderRadius: 10,

                    backgroundColor:
                      theme.primary,

                    opacity: 0.08,
                  }}
                />

                {/* Hora */}
                <TimeWheel values={HOURS} initialValue={initial.hour}
                  valueRef={hourRef} textColor={theme.text} label="Hora"
                  onMovingChange={(active) => setMoving("hour", active)} />

                <Text
                  pointerEvents="none"
                  style={{
                    fontSize: 22,
                    fontWeight: "600",
                    marginHorizontal: 4,
                    color: theme.text,
                  }}
                >
                  :
                </Text>

                {/* Minuto */}
                <TimeWheel values={MINUTES} initialValue={initial.minute}
                  valueRef={minuteRef} textColor={theme.text} label="Minutos"
                  onMovingChange={(active) => setMoving("minute", active)} />
              </View>

              {/* AM / PM */}
              <View
                style={{
                  marginHorizontal: 6,

                  borderRadius: 9,

                  borderWidth: 1,
                  borderColor:
                    theme.border,

                  overflow: "hidden",
                }}
              >
                {["AM", "PM"].map(
                  (value) => {
                    const active =
                      period === value;

                    return (
                      <TouchableOpacity
                        key={value}
                        accessibilityRole="button"
                        accessibilityLabel={value}
                        accessibilityState={{ selected: active }}
                        activeOpacity={0.75}
                        onPress={() =>
                          setPeriod(value)
                        }
                        style={{
                          width: 44,
                          height: 38,

                          justifyContent:
                            "center",

                          alignItems:
                            "center",

                          backgroundColor:
                            active
                              ? theme.primary
                              : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,

                            fontWeight:
                              active
                                ? "700"
                                : "500",

                            color:
                              active
                                ? theme.onPrimary
                                : theme.inactiveCategoryText,
                          }}
                        >
                          {value}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>
          </View>

          {/* Sin hora */}
          <TouchableOpacity
            onPress={clearTime}
            style={{
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color:
                  theme.inactiveCategoryText,

                textAlign: "center",
              }}
            >
              En cualquier momento
            </Text>
          </TouchableOpacity>

          {/* Aplicar */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                marginTop: 16,
                opacity: isMoving ? 0.5 : 1,
              },
            ]}
            onPress={applyTime}
            disabled={isMoving}
            accessibilityRole="button"
            accessibilityState={{ disabled: isMoving }}
          >
            <Text
              style={
                styles.saveButtonText
              }
            >
              Aplicar
            </Text>
          </TouchableOpacity>

          {/* Cancelar */}
          <TouchableOpacity
            onPress={() => animateClose()}
            style={{
              marginTop: 10,
            }}
          >
            <Text
              style={{
                color:
                  theme.inactiveCategoryText,

                textAlign: "center",
              }}
            >
              Cancelar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}