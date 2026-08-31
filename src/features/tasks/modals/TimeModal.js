import { useRef, useEffect, useState } from "react";
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

export default function TimeModal({
  visible,
  themeName,
  mode,

  selectedDate,
  selectedTime,

  repeatMode,
  repeatDays,
  repeatInterval,

  reminder,
  endDate,

  onTimeSelected,
  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const [draftDate, setDraftDate] =
    useState(selectedDate);

  const [draftTime, setDraftTime] =
    useState(selectedTime);

  const [draftRepeatMode, setDraftRepeatMode] =
    useState(repeatMode);

  const [draftRepeatDays, setDraftRepeatDays] =
    useState(repeatDays);

  const [
    draftRepeatInterval,
    setDraftRepeatInterval,
  ] = useState(repeatInterval);

  const [draftReminder, setDraftReminder] =
    useState(reminder);

  const [draftEndDate, setDraftEndDate] =
    useState(endDate);

  const [dateVisible, setDateVisible] = useState(false);
  const [hourVisible, setHourVisible] = useState(false);
  const [repeatVisible, setRepeatVisible] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);

  // -------------------------------------------------
  // Animaciones principales del modal
  // -------------------------------------------------
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const animateOpen = () => {
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.95);

    Animated.parallel([
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
    ]).start();
  };

  const animateClose = () => {
    Animated.parallel([
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
    ]).start(closeModal);
  };

  // -------------------------------------------------
  // Fecha
  // -------------------------------------------------

  const handleDateSelected = (date) => {
    setDraftDate(date);
    setDraftReminder(null);
  };

  // -------------------------------------------------
  // Formatos
  // -------------------------------------------------
  function formatHumanDate(date) {
    if (!date) return "Nunca";

    const today = new Date();
    const d = new Date(date);

    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    const diff = Math.round((d - today) / 86400000);

    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";

    const names = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    if (diff > 1 && diff <= 6) {
      return `Este ${names[d.getDay()]}`;
    }

    if (diff >= 7 && diff <= 13) {
      return `Próx. ${names[d.getDay()]}`;
    }

    return d.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
  }

  function formatHumanTime(date) {
    if (!date) return "En cualquier momento";

    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");

    return `${h}:${m}`;
  }

  const handleSelectedTimeChange = (nextTime) => {
    const hadTime =
      draftTime !== null;

    const hasTime =
      nextTime !== null;

    if (hadTime !== hasTime) {
      setDraftReminder(null);
    }

    setDraftTime(nextTime);
  };

  function formatRepeatLabel({
    repeatMode,
    repeatDays = [],
    repeatInterval = 1,
  }) {
    if (repeatMode === "none") {
      return "Sin repetir";
    }

    if (repeatMode === "daily") {
      return repeatInterval === 1
        ? "Diario"
        : `Cada ${repeatInterval} días`;
    }

    if (repeatMode === "weekly") {
      const allDaysSelected = repeatDays.length === 7;

      if (allDaysSelected) {
        return repeatInterval === 1
          ? "Diario"
          : `Cada ${repeatInterval} semanas · Todos los días`;
      }

      const daysLabel =
        repeatDays.length > 0
          ? repeatDays.join(", ")
          : "Semanal";

      return repeatInterval === 1
        ? daysLabel
        : `Cada ${repeatInterval} semanas · ${daysLabel}`;
    }

    if (repeatMode === "monthly") {
      const allDaysSelected = 
        repeatDays.length === 31;

      if (allDaysSelected) {
        return repeatInterval === 1
          ? "Diario"
          : `Cada ${repeatInterval} meses · Todos los días`;
      }

      const intervalLabel =
        repeatInterval === 1
          ? "Mensual"
          : `Cada ${repeatInterval} meses`;

      const daysLabel =
        repeatDays.length > 0
          ? `Días ${repeatDays.join(", ")}`
          : null;

      return daysLabel
        ? `${intervalLabel} · ${daysLabel}`
        : intervalLabel;
    }
    if (repeatMode === "monthly" && repeatInterval % 12 === 0) {
      const years = repeatInterval / 12;

      const intervalLabel =
        years === 1
          ? "Anual"
          : `Cada ${years} años`;
      
      const monthLabel = selectedDate.toLocaleDateString("es-CL", {
        month: "long",
      });
      
      const daysLabel =
        repeatDays.length === 1
          ? `${repeatDays[0]} de ${monthLabel}`
          : repeatDays.length > 1
            ? `${repeatDays.join(", ")} de ${monthLabel}`
            : null;

      return daysLabel ? `${intervalLabel} · ${daysLabel}` : intervalLabel;
    }

    return "Sin repetir";
  }

  useEffect(() => {
    if (!visible) return;

    setDraftDate(
      selectedDate
        ? new Date(selectedDate)
        : null
    );

    setDraftTime(
      selectedTime
        ? new Date(selectedTime)
        : null
    );

    setDraftRepeatMode(
      repeatMode || "none"
    );

    setDraftRepeatDays(
      [...(repeatDays || [])]
    );

    setDraftRepeatInterval(
      repeatInterval || 1
    );

    setDraftReminder(
      reminder
        ? { ...reminder }
        : null
    );

    setDraftEndDate(
      endDate
        ? new Date(endDate)
        : null
    );
  }, [visible]);

  return (
    <>
      {/* Modal de Fecha */}
      <DateSelectorModal
        visible={dateVisible}
        themeName={themeName}
        mode={mode}
        selectedDate={draftDate}
        onSelectDate={handleDateSelected}
        closeModal={() => setDateVisible(false)}
      />

      {/* Modal de Repetición */}
      <RepeatModal
        visible={repeatVisible}
        closeModal={() => setRepeatVisible(false)}
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
        visible={hourVisible}
        themeName={themeName}
        mode={mode}

        selectedTime={draftTime}

        setSelectedTime={
          handleSelectedTimeChange
        }

        closeModal={() =>
          setHourVisible(false)
        }
      />

      {/* Modal de Recordatorio */}
      <ReminderModal
        visible={reminderVisible}
        themeName={themeName}
        mode={mode}

        selectedDate={draftDate}
        selectedTime={draftTime}

        repeatMode={draftRepeatMode}

        reminder={draftReminder}
        setReminder={setDraftReminder}

        closeModal={() =>
          setReminderVisible(false)
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
                  onPress={() => setDateVisible(true)}
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
                      style={{ marginLeft: 5 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* HORA */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setHourVisible(true)}
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
                  onPress={() => setRepeatVisible(true)}
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
                  onPress={() => setReminderVisible(true)}
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
                      style={{ marginLeft: 5 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* BOTÓN APLICAR */}
                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 22 }]}
                  onPress={() => {
                    onTimeSelected({
                      date: draftDate,
                      time: draftTime,

                      repeatMode:
                        draftRepeatMode,

                      repeatDays:
                        draftRepeatDays,

                      repeatInterval:
                        draftRepeatInterval,

                      reminder:
                        draftReminder,

                      endDate:
                        draftEndDate,
                    });

                    animateClose();
                  }}
                >
                  <Text style={styles.saveButtonText}>Aplicar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={animateClose}
                  style={{ marginTop: 10 }}
                >
                  <Text style={{ color: "red", textAlign: "center" }}>
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
