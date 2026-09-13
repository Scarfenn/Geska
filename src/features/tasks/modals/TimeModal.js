import { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from "react-native";
import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import { Ionicons } from "@expo/vector-icons";
import RepeatModal from "./SubModals/RepeatModal";
import DateSelectorModal from "./SubModals/DateSelectorModal";
import HourModal from "./SubModals/HourModal";
import ReminderModal from "./SubModals/ReminderModal";
import { formatReminder } from "@/features/tasks/services/reminderModel";

import useScheduleDraft from "../hooks/useScheduleDraft";
import { formatHumanDate, formatHumanTime, formatRepeatLabel } from "../domain/scheduleLabels";

export default function TimeModal(props) {
  return props.visible ? <TimeModalSession {...props} /> : null;
}

function TimeModalSession(props) {
  const { visible, themeName, mode, onTimeSelected, closeModal } = props;
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];
  const {
    draft, activeModal, setActiveModal,
    draftDate, handleDateSelected, draftTime, handleSelectedTimeChange,
    draftRepeatMode, setDraftRepeatMode, draftRepeatDays, setDraftRepeatDays,
    draftRepeatInterval, setDraftRepeatInterval, draftReminder, setDraftReminder,
    draftEndDate, setDraftEndDate,
  } = useScheduleDraft(props);

  // -------------------------------------------------
  // Animaciones principales del modal
  // -------------------------------------------------
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const animation = useRef(null);
  const closing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; animation.current?.stop(); };
  }, []);

  const animateOpen = () => {
    if (closing.current) return;
    animation.current?.stop();
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.95);

    animation.current = Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    animation.current.start();
  };

  const animateClose = (commit) => {
    if (closing.current || !mounted.current) return;
    closing.current = true;
    animation.current?.stop();
    animation.current = Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    animation.current.start(({ finished }) => {
      if (!finished || !mounted.current) return;
      closeModal();
      commit?.();
    });
  };

  return (
    <>
      {/* Modal de Fecha */}
      <DateSelectorModal
        visible={activeModal === "date"}
        themeName={themeName}
        mode={mode}
        selectedDate={draftDate}
        onSelectDate={handleDateSelected}
        closeModal={() => setActiveModal(null)}
      />

      {/* Modal de Repetición */}
      <RepeatModal
        visible={activeModal === "repeat"}
        closeModal={() => setActiveModal(null)}
        themeName={themeName}
        mode={mode}

        selectedDate={draftDate}

        repeatMode={draftRepeatMode}
        setRepeatMode={setDraftRepeatMode}

        repeatDays={draftRepeatDays}
        setRepeatDays={setDraftRepeatDays}

        repeatInterval={draftRepeatInterval}
        setRepeatInterval={setDraftRepeatInterval}

        endDate={draftEndDate}
        setEndDate={setDraftEndDate}
      />

      {/* Modal de Hora */}
      <HourModal
        visible={activeModal === "hour"}
        themeName={themeName}
        mode={mode}

        selectedTime={draftTime}

        setSelectedTime={
          handleSelectedTimeChange
        }

        closeModal={() =>
          setActiveModal(null)
        }
      />

      {/* Modal de Recordatorio */}
      <ReminderModal
        visible={activeModal === "reminder"}
        themeName={themeName}
        mode={mode}

        selectedDate={draftDate}
        selectedTime={draftTime}

        repeatMode={draftRepeatMode}

        reminder={draftReminder}
        setReminder={setDraftReminder}

        closeModal={() =>
          setActiveModal(null)
        }
      />

      {/* ============================================ */}
      {/* =============== MODAL BASE ================= */}
      {/* ============================================ */}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onShow={animateOpen}
        onRequestClose={() => activeModal ? setActiveModal(null) : animateClose()}
      >
        <TouchableWithoutFeedback onPress={() => animateClose()}>
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
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim },
                    ],
                    width: "90%",
                    borderRadius: 14,
                    paddingVertical: 20,
                    paddingHorizontal: 20,
                  },
                ]}
              >
                <Text style={[styles.modalTitle, { marginBottom: 20 }]}>
                  Gestionar tiempo
                </Text>

                <Text
                  style={{
                    color: styles.optionLabel.color,
                    marginBottom: 4,
                  }}
                >
                  FECHA Y HORA
                </Text>

                {/* FECHA */}
                <TouchableOpacity
                  style={styles.optionRow}
                  activeOpacity={0.7}
                  onPress={() => setActiveModal("date")}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={styles.text.color}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        { marginLeft: 8 },
                      ]}
                    >
                      Fecha
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.optionValue}>
                      {formatHumanDate(draftDate)}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={theme.inactiveCategoryText}
                      style={{ marginLeft: 2 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* HORA */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setActiveModal("hour")}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={styles.text.color}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        { marginLeft: 8 },
                      ]}
                    >
                      Hora
                    </Text>
                  </View>
                  <Text style={styles.optionValue}>
                    {formatHumanTime(draftTime)}
                  </Text>
                </TouchableOpacity>

                <Text
                  style={{
                    color: styles.optionLabel.color,
                    marginTop: 18,
                    marginBottom: 4,
                  }}
                >
                  REPETICIÓN Y RECORDATORIO
                </Text>

                {/* REPETICIÓN */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setActiveModal("repeat")}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="repeat-outline"
                      size={20}
                      color={styles.text.color}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        { marginLeft: 8 },
                      ]}
                    >
                      Repetición
                    </Text>
                  </View>
                  <Text style={styles.optionValue}>
                    {formatRepeatLabel({
                      selectedDate: draftDate,
                      repeatMode: draftRepeatMode,
                      repeatDays: draftRepeatDays,
                      repeatInterval: draftRepeatInterval,
                    })}
                  </Text>
                </TouchableOpacity>

                {/* RECORDATORIO */}
                <TouchableOpacity
                  style={styles.optionRow}
                  activeOpacity={0.7}
                  onPress={() => setActiveModal("reminder")}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color={styles.text.color}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        { marginLeft: 8 },
                      ]}
                    >
                      Recordatorio
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.optionValue}>
                      {formatReminder(
                        draftReminder,
                        draftDate,
                        draftTime
                      )}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={theme.inactiveCategoryText}
                      style={{ marginLeft: 2 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* BOTÓN APLICAR */}
                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 22 }]}
                  onPress={() => animateClose(() => onTimeSelected(draft))}
                >
                  <Text style={styles.saveButtonText}>Aplicar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => animateClose()}
                  style={{ marginTop: 10 }}
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
    </>
  );
}
