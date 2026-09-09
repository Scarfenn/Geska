import { useEffect, useRef, useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  Animated, Easing, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import createStyles from "@/styles/styles";
import {
  WEEK_DAYS, WEEK_DAY_NAMES, MONTH_DAYS, editorDays, toggleRepeatDay,
  parseInterval, repeatSummary,
} from "@/features/tasks/domain/repeatEditor";

const MODES = [
  { key: "none", label: "Ninguno" },
  { key: "daily", label: "Diario" },
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensual" },
];
const MODAL_HEIGHTS = { none: 270, daily: 470, weekly: 570, monthly: 760 };

export default function RepeatModal({
  visible, themeName, mode, selectedDate, repeatMode, setRepeatMode,
  repeatDays, setRepeatDays, repeatInterval, setRepeatInterval,
  endDate, setEndDate, closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [localMode, setLocalMode] = useState(repeatMode || "none");
  const [localWeekDays, setLocalWeekDays] = useState([]);
  const [localMonthDays, setLocalMonthDays] = useState([]);
  const [intervalText, setIntervalText] = useState("1");
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const modalHeight = useRef(new Animated.Value(290)).current;
  const closing = useRef(false);
  const wasVisible = useRef(false);
  const interval = parseInterval(intervalText);
  const canApply = localMode === "none" || interval !== null;
  const selectedDays = localMode === "weekly" ? localWeekDays : localMonthDays;
  const maxHeight = Math.max(0, height - insets.top - insets.bottom - 32);

  // Initialize once per opening; parent updates must not erase an active draft.
  useEffect(() => {
    if (visible && !wasVisible.current) {
      const nextMode = MODES.some((item) => item.key === repeatMode) ? repeatMode : "none";
      setLocalMode(nextMode);
      setLocalWeekDays(editorDays("weekly", nextMode === "weekly" ? repeatDays : [], selectedDate));
      setLocalMonthDays(editorDays("monthly", nextMode === "monthly" ? repeatDays : [], selectedDate));
      setIntervalText(String(parseInterval(repeatInterval) || 1));
      setLocalEndDate(endDate);
      closing.current = false;
      modalHeight.setValue(Math.min(MODAL_HEIGHTS[nextMode], maxHeight));
    }
    wasVisible.current = visible;
  }, [visible, repeatMode, repeatDays, selectedDate, repeatInterval, endDate, maxHeight, modalHeight]);

  useEffect(() => {
    if (!visible) return;
    const animation = Animated.timing(modalHeight, {
      toValue: Math.min(MODAL_HEIGHTS[localMode], maxHeight),
      duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [localMode, maxHeight, visible, modalHeight]);

  const animateOpen = () => {
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const animateClose = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) closeModal();
      else closing.current = false;
    });
  };

  const selectMode = (nextMode) => {
    if (nextMode === localMode) return;
    setLocalMode(nextMode);
    setIntervalText("1");
    if (nextMode === "none") setLocalEndDate(null);
  };

  const handleApply = () => {
    if (!canApply || closing.current) return;
    setRepeatMode(localMode);
    setRepeatDays(localMode === "weekly" || localMode === "monthly" ? [...selectedDays] : []);
    setRepeatInterval(localMode === "none" ? 1 : interval);
    setEndDate(localEndDate);
    animateClose();
  };

  const changeInterval = (amount) => {
    const next = (interval || 1) + amount;
    if (Number.isSafeInteger(next) && next >= 1) setIntervalText(String(next));
  };

  const renderDay = (day, index) => {
    const weekly = localMode === "weekly";
    const selected = selectedDays.includes(day);
    const lastSelected = selected && selectedDays.length === 1;
    return (
      <View key={day} style={styles.repeatDayCell}>
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityLabel={weekly ? WEEK_DAY_NAMES[index] : `Día ${day}`}
          accessibilityState={{ checked: selected, disabled: lastSelected }}
          accessibilityHint={lastSelected ? "Debe quedar al menos un día seleccionado" : undefined}
          disabled={lastSelected}
          onPress={() => (weekly ? setLocalWeekDays : setLocalMonthDays)((days) => toggleRepeatDay(days, day))}
          style={[styles.repeatDayButton, selected && styles.repeatSelection]}
        >
          <Text style={[styles.repeatDayText, selected && styles.repeatSelectedText]}>{day}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onShow={animateOpen} onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={styles.repeatKeyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback onPress={animateClose} accessible={false}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.repeatShell, { transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={[styles.modalBox, styles.repeatModalBox, { height: modalHeight, maxHeight }]}>
              <Text accessibilityRole="header" style={[styles.modalTitle, styles.repeatTitle]}>Repetición</Text>
              <View style={styles.repeatModes}>
                {MODES.map((item) => (
                  <TouchableOpacity key={item.key} accessibilityRole="radio"
                    accessibilityState={{ selected: localMode === item.key }}
                    onPress={() => selectMode(item.key)}
                    style={[styles.repeatModeButton, localMode === item.key && styles.repeatSelection]}>
                    <Text style={[styles.repeatModeText, localMode === item.key && styles.repeatSelectedText]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ScrollView style={styles.repeatScroll} contentContainerStyle={styles.repeatScrollContent} keyboardShouldPersistTaps="handled">
                {(localMode === "weekly" || localMode === "monthly") && (
                  <View style={styles.repeatSection}>
                    <Text style={styles.repeatSectionLabel}>{localMode === "weekly" ? "Días de la semana" : "Días del mes"}</Text>
                    <View style={styles.repeatDaysGrid}>
                      {(localMode === "weekly" ? WEEK_DAYS : MONTH_DAYS).map(renderDay)}
                    </View>
                    {localMode === "monthly" && localMonthDays.some((day) => Number(day) >= 29) && (
                      <Text style={styles.repeatHint}>Se omiten los meses que no tengan estos días.</Text>
                    )}
                  </View>
                )}
                {localMode !== "none" && (
                  <>
                    <View style={styles.repeatSection}>
                      <Text style={styles.repeatSectionLabel}>Intervalo</Text>
                      <View style={styles.repeatIntervalRow}>
                        <Text style={styles.repeatBodyText}>Cada</Text>
                        <View style={styles.rowCenter}>
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reducir intervalo"
                            accessibilityState={{ disabled: !interval || interval <= 1 }} disabled={!interval || interval <= 1}
                            onPress={() => changeInterval(-1)} style={[styles.repeatStepButton, (!interval || interval <= 1) && styles.repeatDisabled]}>
                            <Text style={styles.repeatStepText}>−</Text>
                          </TouchableOpacity>
                          <TextInput accessibilityLabel="Intervalo de repetición" value={intervalText}
                            onChangeText={setIntervalText} keyboardType="number-pad" selectTextOnFocus
                            onBlur={() => { if (interval) setIntervalText(String(interval)); }}
                            style={styles.repeatIntervalInput} />
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Aumentar intervalo"
                            accessibilityState={{ disabled: interval === Number.MAX_SAFE_INTEGER }} disabled={interval === Number.MAX_SAFE_INTEGER}
                            onPress={() => changeInterval(1)} style={[styles.repeatStepButton, interval === Number.MAX_SAFE_INTEGER && styles.repeatDisabled]}>
                            <Text style={styles.repeatStepText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.repeatBodyText}>
                          {localMode === "daily" ? (interval === 1 ? "día" : "días") : localMode === "weekly" ? (interval === 1 ? "semana" : "semanas") : (interval === 1 ? "mes" : "meses")}
                        </Text>
                      </View>
                      {!interval && <Text accessibilityLiveRegion="polite" style={styles.repeatError}>Introduce un número entero mayor o igual a 1.</Text>}
                    </View>
                    <View style={styles.repeatSection}>
                      <Text style={styles.repeatSectionLabel}>Fecha de término</Text>
                      <TouchableOpacity activeOpacity={0.75} style={styles.repeatEndDate}>
                        <Text style={styles.repeatBodyText}>{localEndDate ? localEndDate.toLocaleDateString("es-CL") : "Nunca"}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <Text style={styles.repeatSummary}>{repeatSummary(localMode, interval, selectedDays)}</Text>
              </ScrollView>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !canApply }} disabled={!canApply}
                onPress={handleApply} style={[styles.saveButton, styles.repeatApplyButton, !canApply && styles.repeatDisabled]}>
                <Text style={styles.saveButtonText}>Aplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={animateClose} style={styles.repeatCancelButton}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
