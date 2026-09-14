import { useState } from "react";
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import useModalAnimation from "@/hooks/useModalAnimation";
import getDatePickerModalStyles from "@/features/tasks/styles/datePickerModalStyles";
import { themes } from "@/styles/themes";
import { isSameDay } from "@/features/tasks/domain/calendarDates";
import { formatDateLocal } from "@/features/tasks/domain/taskDates";
import {
  MONTH_NAMES, WEEKDAY_LABELS, WEEKDAY_NAMES, calendarDate, initialCalendarMonth,
  isDateSelectable, monthHasSelectableDate, yearHasSelectableDate, monthCells,
} from "@/features/tasks/domain/datePicker";

// A fresh browsing session per opening; selecting a field is the caller's job.
export default function DatePickerModal(props) {
  return props.visible ? <DatePickerSession {...props} /> : null;
}

function DatePickerSession({ visible, themeName, mode, value, initialDate, minDate, maxDate, title = "Seleccionar fecha", onSelect, onClose }) {
  const styles = getDatePickerModalStyles(themeName, mode);
  const theme = themes[themeName][mode];
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => initialCalendarMonth(value, initialDate, minDate, maxDate));
  const [view, setView] = useState("days");
  const { opacityAnim, slideAnim, scaleAnim, animateOpen, animateClose, closing } = useModalAnimation(onClose, { visible });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const today = new Date();
  const maxHeight = Math.max(0, (height - insets.top - insets.bottom) * 0.90);
  const monthAllowed = (y, m) => monthHasSelectableDate(y, m, minDate, maxDate);
  const yearAllowed = y => yearHasSelectableDate(y, minDate, maxDate);
  const feedback = () => { Haptics.selectionAsync().catch(() => {}); };
  const select = date => {
    if (closing.current || !isDateSelectable(date, minDate, maxDate)) return;
    feedback();
    animateClose(() => onSelect(new Date(date)));
  };
  const canNavigate = direction => {
    if (view === "months") return yearAllowed(year + direction);
    const next = calendarDate(year, monthIndex + direction);
    return monthAllowed(next.getFullYear(), next.getMonth());
  };
  const navigate = direction => {
    if (closing.current || !canNavigate(direction)) return;
    feedback();
    const nextYear = year + (view === "months" ? direction : 0);
    const nextMonth = view === "months" && !monthAllowed(nextYear, monthIndex)
      ? MONTH_NAMES.findIndex((_, index) => monthAllowed(nextYear, index))
      : monthIndex + (view === "days" ? direction : 0);
    setMonth(calendarDate(nextYear, nextMonth));
  };
  const heading = view === "days" ? `${MONTH_NAMES[monthIndex]} ${year}` : String(year);
  const todayAllowed = monthAllowed(today.getFullYear(), today.getMonth());

  return (
    <Modal visible={visible} transparent animationType="none" onShow={animateOpen} onRequestClose={() => animateClose()}>
      <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
        <TouchableWithoutFeedback onPress={() => animateClose()} accessible={false}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.modalBox, styles.pickerBox, { maxHeight, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          <Text accessibilityRole="header" style={[styles.modalTitle, styles.pickerTitle]}>{title}</Text>
          <View style={styles.pickerNavigation}>
            {[-1, 0, 1].map(direction => direction === 0 ? (
              view === "days" ? <TouchableOpacity key="heading" accessibilityRole="button"
                accessibilityLabel="Elegir mes y año" onPress={() => setView("months")} style={styles.pickerHeadingButton}>
                <Text accessibilityLiveRegion="polite" style={styles.pickerHeading}>{heading}</Text>
                <Text style={styles.pickerHeadingHint}>Cambiar mes y año</Text>
              </TouchableOpacity> : <View key="heading" style={styles.pickerHeadingButton}>
                <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.pickerHeading}>{heading}</Text>
              </View>
            ) : (
              <TouchableOpacity key={direction} accessibilityRole="button"
                accessibilityLabel={`${view === "days" ? "Mes" : "Año"} ${direction < 0 ? "anterior" : "siguiente"}`}
                accessibilityState={{ disabled: !canNavigate(direction) }} disabled={!canNavigate(direction)}
                onPress={() => navigate(direction)} style={[styles.pickerArrow, !canNavigate(direction) && styles.pickerDisabled]}>
                <Ionicons name={direction < 0 ? "chevron-back" : "chevron-forward"} size={22} color={theme.text} />
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {view === "days" ? (
              <>
                <View style={styles.pickerWeekdays}>
                  {WEEKDAY_LABELS.map((label, index) => <Text key={label} accessibilityLabel={WEEKDAY_NAMES[index]} style={styles.pickerWeekday}>{label}</Text>)}
                </View>
                <View style={styles.pickerGrid}>
                  {monthCells(year, monthIndex).map((date, index) => {
                    if (!date) return <View key={`empty-${index}`} style={styles.pickerDayCell} accessible={false} />;
                    const selected = isSameDay(date, value);
                    const isToday = isSameDay(date, today);
                    const disabled = !isDateSelectable(date, minDate, maxDate);
                    return (
                      <View key={formatDateLocal(date)} style={styles.pickerDayCell}>
                        <TouchableOpacity accessibilityRole="button"
                          accessibilityLabel={date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          accessibilityHint={isToday ? "Hoy" : undefined}
                          accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => select(date)}
                          style={[styles.pickerDay, isToday && styles.pickerToday, selected && styles.pickerSelected, disabled && styles.pickerDisabled]}>
                          <Text style={[styles.pickerDayText, selected && styles.pickerSelectedText]}>{date.getDate()}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.pickerGrid}>
                {Array.from({ length: 12 }, (_, index) => {
                  const option = index;
                  const disabled = !monthAllowed(year, option);
                  const selected = option === monthIndex;
                  const label = MONTH_NAMES[option];
                  return (
                    <View key={option} style={styles.pickerPeriodCell}>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label} ${year}`}
                        accessibilityState={{ selected, disabled }} disabled={disabled}
                        onPress={() => {
                          feedback();
                          setMonth(calendarDate(year, option)); setView("days");
                        }} style={[styles.pickerPeriod, selected && styles.pickerSelected, disabled && styles.pickerDisabled]}>
                        <Text style={[styles.pickerPeriodText, selected && styles.pickerSelectedText]}>{label}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
          <View style={styles.pickerFooter}>
            {view !== "days" && <TouchableOpacity accessibilityRole="button" onPress={() => setView("days")} style={styles.pickerTodayButton}>
              <Text style={styles.pickerActionText}>Volver al calendario</Text>
            </TouchableOpacity>}
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !todayAllowed }} disabled={!todayAllowed}
              onPress={() => { setMonth(calendarDate(today.getFullYear(), today.getMonth())); setView("days"); }}
              style={[styles.pickerTodayButton, !todayAllowed && styles.pickerDisabled]}>
              <Text style={styles.pickerActionText}>Ir a hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => animateClose()} style={styles.pickerCancelButton}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
