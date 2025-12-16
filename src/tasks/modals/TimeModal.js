import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from "react-native";
import createStyles from "../styles/styles";
import { Ionicons } from "@expo/vector-icons";
import RepeatModal from "./SubModals/RepeatModal";
import CustomRepeatModal from "./SubModals/CustomRepeatModal";

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

  
  const [repeatVisible, setRepeatVisible] = useState(false);
  const [customRepeatVisible, setCustomRepeatVisible] = useState(false);

  // -------------------------------------------------
  // Animaciones principales del modal
  // -------------------------------------------------
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
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
    }
  }, [visible]);

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
  // Quick buttons
  // -------------------------------------------------
  const quickSelect = (option) => {
    const today = new Date();
    let newDate = new Date(today);

    if (option === "tomorrow") newDate.setDate(today.getDate() + 1);
    else if (option === "next_monday") {
      const diff = (8 - today.getDay()) % 7 || 7;
      newDate.setDate(today.getDate() + diff);
    }

    setSelectedDate(newDate);
  };

  // -------------------------------------------------
  // Formato de Fecha
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
      "Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"
    ];

    if (diff > 1 && diff <= 6) return `Este ${names[d.getDay()]}`;
    if (diff >= 7 && diff <= 13) return `Próx. ${names[d.getDay()]}`;

    return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  }
  
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

  // Render principal
  return (
    <>
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
            if (data.interval) setRepeatInterval(data.interval);
            if (data.endDate !== undefined) setEndDate(data.endDate);
        }}
        closeModal={() => setCustomRepeatVisible(false)}
    />

      {/* ============================================ */}
      {/* =============== MODAL BASE ================= */}
      {/* ============================================ */}

      <Modal visible={visible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
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
                {/* TITLE */}
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
                  ].map((btn) => (
                    <TouchableOpacity
                      key={btn.key}
                      onPress={() => quickSelect(btn.key)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        backgroundColor: mode === "light" ? "#eee" : "#333",
                        borderRadius: 8,
                      }}
                    >
                      <Text style={styles.text}>{btn.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* FECHA */}
                <Text style={{ color: styles.optionLabel.color, marginBottom: 4 }}>
                  FECHA Y HORA
                </Text>

                <View style={styles.optionRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="calendar-outline" size={20} color={styles.text.color} />
                    <Text style={[styles.optionLabel, { marginLeft: 8 }]}>
                      Fecha
                    </Text>
                  </View>
                  <Text style={styles.optionValue}>
                    {formatHumanDate(selectedDate)}
                  </Text>
                </View>

                {/* HORA */}
                <View style={styles.optionRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="time-outline" size={20} color={styles.text.color} />
                    <Text style={[styles.optionLabel, { marginLeft: 8 }]}>
                      Hora
                    </Text>
                  </View>
                  <Text style={styles.optionValue}>
                    {selectedTime || "En cualquier momento"}
                  </Text>
                </View>

                {/* REPETICIÓN */}
                <Text style={{ color: styles.optionLabel.color, marginTop: 18, marginBottom: 4 }}>
                  REPETICIÓN Y RECORDATORIO
                </Text>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setRepeatVisible(true)}  
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="repeat-outline" size={20} color={styles.text.color} />
                    <Text style={[styles.optionLabel, { marginLeft: 8 }]}>
                      Repetición
                    </Text>
                  </View>
                  <Text style={styles.optionValue}>
                    {repeatLabels[repeatMode] || "Sin repetir"}
                  </Text>
                </TouchableOpacity>

                {/* RECORDATORIO */}
                <View style={styles.optionRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="notifications-outline" size={20} color={styles.text.color} />
                    <Text style={[styles.optionLabel, { marginLeft: 8 }]}>
                      Recordatorio
                    </Text>
                  </View>
                  <Text style={styles.optionValue}>
                    {reminder ? `${reminder} min antes` : "Sin recordatorio"}
                  </Text>
                </View>

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

                {/* CANCELAR */}
                <TouchableOpacity onPress={animateClose} style={{ marginTop: 10 }}>
                  <Text style={{ color: "red", textAlign: "center" }}>Cancelar</Text>
                </TouchableOpacity>

              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
