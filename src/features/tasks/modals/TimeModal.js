import useModalAnimation from "@/hooks/useModalAnimation";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import getModalStyles from "@/styles/modalStyles";
import { themes } from "@/styles/themes";
import { Ionicons } from "@expo/vector-icons";
import RepeatModal from "@/features/tasks/modals/SubModals/RepeatModal";
import DateSelectorModal from "@/features/tasks/modals/SubModals/DateSelectorModal";
import HourModal from "@/features/tasks/modals/SubModals/HourModal";
import ReminderModal from "@/features/tasks/modals/SubModals/ReminderModal";
import { formatReminder } from "@/features/tasks/services/reminderModel";

import useScheduleDraft from "@/features/tasks/hooks/useScheduleDraft";
import { formatHumanDate, formatHumanTime, formatRepeatLabel } from "@/features/tasks/domain/scheduleLabels";

export default function TimeModal(props) {
  return props.visible ? <TimeModalSession {...props} /> : null;
}

function TimeModalSession(props) {
  const { visible, themeName, mode, onTimeSelected, closeModal } = props;
  const styles = getModalStyles(themeName, mode);
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
  const { opacityAnim, slideAnim, scaleAnim, animateOpen, animateClose } = useModalAnimation(closeModal, { visible, openDuration: 260, closeDuration: 200 });

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
                    color: theme.text,
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
                      color={theme.text}
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
                      color={theme.text}
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
                    color: theme.text,
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
                      color={theme.text}
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
                      color={theme.text}
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
