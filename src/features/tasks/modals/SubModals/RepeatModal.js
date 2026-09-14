import useModalAnimation from "@/hooks/useModalAnimation";
import { useEffect, useRef, useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,
  Animated, StyleSheet, Keyboard, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from "react-native";
import Reanimated, { LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import getRepeatModalStyles from "@/features/tasks/styles/repeatModalStyles";
import DatePickerModal from "@/features/tasks/modals/SubModals/DatePickerModal";
import { getRepeatEndState, canSelectRepeatEndDate } from "@/features/tasks/domain/repeatEnd";
import {
  WEEK_DAYS, WEEK_DAY_NAMES, MONTH_DAYS, editorDays, toggleRepeatDay,
  parseInterval, repeatSummary,
} from "@/features/tasks/domain/repeatEditor";

const modalLayoutTransition = LinearTransition.duration(220);

const MODES = [
  { key: "none", label: "Ninguno" },
  { key: "daily", label: "Diario" },
  { key: "weekly", label: "Semanal" },
  { key: "monthly", label: "Mensual" },
];

export default function RepeatModal({
  visible, themeName, mode, selectedDate, repeatMode, setRepeatMode,
  repeatDays, setRepeatDays, repeatInterval, setRepeatInterval,
  endDate, setEndDate, closeModal,
}) {
  const styles = getRepeatModalStyles(themeName, mode);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [localMode, setLocalMode] = useState(repeatMode || "none");
  const [localWeekDays, setLocalWeekDays] = useState([]);
  const [localMonthDays, setLocalMonthDays] = useState([]);
  const [intervalDrafts, setIntervalDrafts] = useState({ daily: "1", weekly: "1", monthly: "1" });
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const { opacityAnim, slideAnim, animateOpen, animateClose, closing } = useModalAnimation(closeModal, { visible, scale: null, opacityEasing: null, closeEasing: null });
  const wasVisible = useRef(false);
  const intervalText = intervalDrafts[localMode] ?? "1";
  const setIntervalText = (text) => setIntervalDrafts((drafts) => ({ ...drafts, [localMode]: text }));
  const interval = parseInterval(intervalText);
  const selectedDays = localMode === "weekly" ? localWeekDays : localMonthDays;
  const repeatDraft = { date: selectedDate, repeatMode: localMode,
    repeatDays: selectedDays, repeatInterval: interval, endDate: localEndDate };
  const { minimum: minimumEndDate, error: repeatEndError } = getRepeatEndState(repeatDraft);
  const canApply = localMode === "none" || (interval !== null && !repeatEndError);
  // Derive the cap from current dimensions, never from the keyboard-constrained
  // overlay. Flex shrink handles any smaller space supplied by the native Modal.
  const maxHeight = Math.max(0, (height - insets.top - insets.bottom) * 0.90);

  // Initialize once per opening; parent updates must not erase an active draft.
  useEffect(() => {
    if (visible && !wasVisible.current) {
      const nextMode = MODES.some((item) => item.key === repeatMode) ? repeatMode : "none";
      setLocalMode(nextMode);
      setLocalWeekDays(editorDays("weekly", nextMode === "weekly" ? repeatDays : [], selectedDate));
      setLocalMonthDays(editorDays("monthly", nextMode === "monthly" ? repeatDays : [], selectedDate));
      setIntervalDrafts({ daily: "1", weekly: "1", monthly: "1",
        ...(nextMode !== "none" ? { [nextMode]: String(parseInterval(repeatInterval) || 1) } : {}) });
      setLocalEndDate(endDate ? new Date(endDate) : null);
      setEndDatePickerOpen(false);
    }
    wasVisible.current = visible;
  }, [visible, repeatMode, repeatDays, selectedDate, repeatInterval, endDate]);

  const selectMode = (nextMode) => {
    if (nextMode === localMode) return;
    setLocalMode(nextMode);
    if (nextMode === "none") setLocalEndDate(null);
  };

  const handleApply = () => {
    if (!canApply || closing.current) return;
    setRepeatMode(localMode);
    setRepeatDays(localMode === "weekly" || localMode === "monthly" ? [...selectedDays] : []);
    setRepeatInterval(localMode === "none" ? 1 : interval);
    setEndDate(localMode === "none" ? null : localEndDate);
    animateClose();
  };

  const changeInterval = (amount) => {
    const next = (interval || 1) + amount;
    if (Number.isSafeInteger(next) && next >= 1) setIntervalText(String(next));
  };

  const selectEndDate = (date) => {
    if (canSelectRepeatEndDate(date, repeatDraft)) setLocalEndDate(new Date(date));
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
        // Android's native Modal already resizes its window for the keyboard.
        enabled={Platform.OS === "ios"}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback onPress={animateClose} accessible={false}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>
          <Reanimated.View layout={modalLayoutTransition} style={[styles.repeatShell, { maxHeight }]}>
            <Animated.View style={[styles.repeatAnimatedContent, { transform: [{ translateY: slideAnim }] }]}>
            <Reanimated.View layout={modalLayoutTransition}
              style={[styles.modalBox, styles.repeatModalBox, { overflow: "hidden" }]}>
              <View style={styles.repeatFixedSection}>
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
              </View>
              <Reanimated.ScrollView layout={modalLayoutTransition}
                style={styles.repeatScroll} contentContainerStyle={styles.repeatScrollContent}
                keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {(localMode === "weekly" || localMode === "monthly") && (
                  <View style={styles.repeatSection}>
                    <Text style={styles.repeatSectionLabel}>{localMode === "weekly" ? "Días de la semana" : "Días del mes"}</Text>
                    <View style={styles.repeatDaysGrid}>
                      {(localMode === "weekly" ? WEEK_DAYS : MONTH_DAYS).map(renderDay)}
                    </View>
                    {localMode === "monthly" && localMonthDays.some((day) => Number(day) >= 29) && (
                      <Text style={styles.repeatHint}>Los días que no existan en un mes se omitirán.</Text>
                    )}
                  </View>
                )}
                {localMode !== "none" && (
                  <>
                    <View style={styles.repeatSection}>
                      <Text style={styles.repeatSectionLabel}>Intervalo</Text>
                      <View style={styles.repeatIntervalRow}>
                        <Text style={[styles.repeatBodyText, {marginRight: 16}]}>Cada</Text>
                        <View style={styles.repeatIntervalControls}>
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
                        <Text style={[styles.repeatBodyText, styles.repeatUnitText]}>
                          {localMode === "daily" ? (interval === 1 ? "día" : "días") : localMode === "weekly" ? (interval === 1 ? "semana" : "semanas") : (interval === 1 ? "mes" : "meses")}
                        </Text>
                      </View>
                      {!interval && <Text accessibilityLiveRegion="polite" style={styles.repeatError}>Introduce un número entero mayor o igual a 1.</Text>}
                    </View>
                    <View style={styles.repeatSection}>
                      <Text style={styles.repeatSectionLabel}>Fecha de término</Text>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Elegir fecha de término"
                        disabled={!minimumEndDate} accessibilityState={{ disabled: !minimumEndDate }}
                        onPress={() => { if (minimumEndDate) { Keyboard.dismiss(); setEndDatePickerOpen(true); } }}
                        activeOpacity={0.75} style={[styles.repeatEndDate, !minimumEndDate && styles.repeatDisabled]}>
                        <Text style={styles.repeatBodyText}>{localEndDate ? localEndDate.toLocaleDateString("es-CL") : "Nunca"}</Text>
                      </TouchableOpacity>
                      {localEndDate != null && <TouchableOpacity accessibilityRole="button"
                        onPress={() => setLocalEndDate(null)} style={styles.repeatClearEndDate}>
                        <Text style={styles.repeatClearEndDateText}>Sin fecha de término</Text>
                      </TouchableOpacity>}
                      {interval !== null && repeatEndError && <Text accessibilityLiveRegion="polite" style={styles.repeatError}>
                        {repeatEndError}
                      </Text>}
                    </View>
                  </>
                )}
                <Text accessibilityLiveRegion="polite" style={styles.repeatSummary}>
                  {localMode !== "none" && repeatEndError ? repeatEndError
                    : repeatSummary(localMode, interval, selectedDays, localEndDate)}
                </Text>
              </Reanimated.ScrollView>
              <Reanimated.View layout={modalLayoutTransition} style={styles.repeatFixedSection}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !canApply }} disabled={!canApply}
                  onPress={handleApply} style={[styles.saveButton, styles.repeatApplyButton, !canApply && styles.repeatDisabled]}>
                  <Text style={styles.saveButtonText}>Aplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={animateClose} style={styles.repeatCancelButton}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </Reanimated.View>
            </Reanimated.View>
            </Animated.View>
          </Reanimated.View>
        </Animated.View>
      </KeyboardAvoidingView>
      <DatePickerModal
        visible={visible && endDatePickerOpen && minimumEndDate != null}
        themeName={themeName}
        mode={mode}
        title="Fin de repetición"
        value={localEndDate}
        initialDate={minimumEndDate}
        minDate={minimumEndDate}
        onSelect={selectEndDate}
        onClose={() => setEndDatePickerOpen(false)}
      />
    </Modal>
  );
}
