import { useRef, useState } from "react";
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
import CustomRepeatModal from "./SubModals/CustomRepeatModal";
import DateSelectorModal from "./SubModals/DateSelectorModal";
import HourModal from "./SubModals/HourModal";
import ReminderModal from "./SubModals/ReminderModal";
import { formatReminder } from "@/features/tasks/services/reminderModel";

export default function TimeModal({
  visible,
  themeName,
  mode,

  selectedDate,
  setSelectedDate,

  selectedTime,
  setSelectedTime,

  repeatMode,
  setRepeatMode,

  repeatDays,
  setRepeatDays,

  reminder,
  setReminder,

  endDate,
  setEndDate,

  onTimeSelected,
  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const [quickSelected, setQuickSelected] = useState(null);
  const [dateVisible, setDateVisible] = useState(false);
  const [hourVisible, setHourVisible] = useState(false);
  const [repeatVisible, setRepeatVisible] = useState(false);
  const [customRepeatVisible, setCustomRepeatVisible] = useState(false);
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
  const quickSelect = (option) => {
    const today = new Date();
    const newDate = new Date(today);

    if (option === "tomorrow") {
      newDate.setDate(today.getDate() + 1);
    } else if (option === "next_monday") {
      const diff = (8 - today.getDay()) % 7 || 7;
      newDate.setDate(today.getDate() + diff);
    }

    setSelectedDate(newDate);
    setReminder(null);
  };

  const handleDateSelected = (date) => {
    setSelectedDate(date);
    setQuickSelected(null);
    setReminder(null);
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
    const hadTime = selectedTime !== null;
    const hasTime = nextTime !== null;

    if (hadTime !== hasTime) {
      setReminder(null);
    }

    setSelectedTime(nextTime);
  };

  // -------------------------------------------------
  // Repetición
  // -------------------------------------------------
  const repeatLabels = {
    none: "Sin repetir",
    daily: "Diario",
    weekly: "Semanal",
    monthly: "Mensual",
    custom: "Personalizado",
  };

  return (
    <>
      {/* Modal de Fecha */}
      <DateSelectorModal
        visible={dateVisible}
        themeName={themeName}
        mode={mode}
        selectedDate={selectedDate}
        onSelectDate={handleDateSelected}
        closeModal={() => setDateVisible(false)}
      />

      {/* Modal de Repetición */}
      <RepeatModal
        visible={repeatVisible}
        closeModal={() => setRepeatVisible(false)}
        openCustomRepeat={() => setCustomRepeatVisible(true)}
        themeName={themeName}
        mode={mode}
        repeatMode={repeatMode}
        setRepeatMode={setRepeatMode}
        repeatDays={repeatDays}
        setRepeatDays={setRepeatDays}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      <CustomRepeatModal
        visible={customRepeatVisible}
        themeName={themeName}
        mode={mode}
        repeatData={{
          mode: repeatMode,
          days: repeatDays,
          endDate,
        }}
        setRepeatData={(data) => {
          if (data.mode) setRepeatMode(data.mode);
          if (data.days) setRepeatDays(data.days);
          if (data.endDate !== undefined) setEndDate(data.endDate);
        }}
        closeModal={() => setCustomRepeatVisible(false)}
      />

      {/* Modal de Hora */}
      <HourModal
        visible={hourVisible}
        themeName={themeName}
        mode={mode}
        selectedTime={selectedTime}
        setSelectedTime={handleSelectedTimeChange}
        closeModal={() => setHourVisible(false)}
      />

      {/* Modal de Recordatorio */}
      <ReminderModal
        visible={reminderVisible}
        themeName={themeName}
        mode={mode}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        repeatMode={repeatMode}
        reminder={reminder}
        setReminder={setReminder}
        closeModal={() => setReminderVisible(false)}
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

                {/* QUICK BUTTONS */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 18,
                  }}
                >
                  {[
                    { label: "Hoy", key: "today" },
                    { label: "Mañana", key: "tomorrow" },
                    { label: "Próx. Lun", key: "next_monday" },
                  ].map((btn) => {
                    const isActive = quickSelected === btn.key;

                    return (
                      <TouchableOpacity
                        key={btn.key}
                        onPress={() => {
                          setQuickSelected(btn.key);
                          quickSelect(btn.key);
                        }}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 14,
                          borderRadius: 10,
                          backgroundColor: theme.card,
                          borderWidth: 1.5,
                          borderColor: isActive
                            ? theme.primary
                            : theme.border,
                        }}
                      >
                        <Text
                          style={[
                            styles.text,
                            {
                              color: isActive
                                ? theme.primary
                                : theme.inactiveCategoryText,
                              fontWeight: isActive ? "600" : "400",
                            },
                          ]}
                        >
                          {btn.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

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
                    <Text
                      style={{
                        ...styles.optionValue,
                        fontStyle: "italic",
                        opacity: 0.8,
                      }}
                    >
                      {formatHumanDate(selectedDate)}
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
                    {formatHumanTime(selectedTime)}
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
                    {repeatLabels[repeatMode] || "Sin repetir"}
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
                        reminder,
                        selectedDate,
                        selectedTime
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
                      date: selectedDate,
                      time: selectedTime,
                      repeatMode,
                      repeatDays,
                      reminder,
                      endDate,
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
