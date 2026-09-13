import { StyleSheet } from "react-native";
import { themes } from "./themes";

export default function createStyles(themeName = "basic", mode = "light") {
  const theme = themes[themeName][mode];

  return StyleSheet.create({

    /* ─────────────────────────
       ✦ TEXTO GLOBAL
    ───────────────────────── */
    text: { color: theme.text },
    textSecondary: { color: theme.inactiveCategoryText },
    dangerText: { color: theme.danger },
    dangerButton: { backgroundColor: theme.dangerBackground },
    dangerButtonText: { color: theme.onDanger },


    /* ─────────────────────────
       ✦ CONTENEDOR GLOBAL
    ───────────────────────── */
    rowCenter: {
      flexDirection: "row",
      alignItems: "center",
    },

    fill: {
      flex: 1,
    },

    container: {
      flex: 1,
      paddingHorizontal: 20,
      marginTop: 25,
      backgroundColor: theme.background,
    },


    /* ─────────────────────────
       ✦ HEADER
    ───────────────────────── */
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 2,
      paddingBottom: 2,
      marginBottom: 8,
    },

    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
    },

    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border + "66",
      shadowColor: "#000",
      shadowOpacity: mode === "light" ? 0.06 : 0.25,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
      marginTop: 2,
    },


    /* ─────────────────────────
       ✦ SELECTOR DE DÍAS
    ───────────────────────── */
    daySelectorContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      marginTop: 4,
    },

    arrowButton: {
      padding: 4,
    },

    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flex: 1,
      paddingHorizontal: 4,
    },

    dayItem: {
      width: 38,
      height: 48,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },

    dayItemActive: {
      backgroundColor: theme.primary,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },

    dayItemLabel: {
      color: theme.text,
      fontSize: 12,
      marginBottom: -2,
    },

    dayItemLabelActive: {
      color: theme.onPrimary,
      fontWeight: "600",
    },

    dayItemNumber: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "500",
    },

    dayItemNumberActive: {
      color: theme.onPrimary,
      fontWeight: "700",
    },


    /* ─────────────────────────
       ✦ CATEGORÍAS
    ───────────────────────── */
    categoryContainer: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 8,
      activeColor: theme.primary,
      inactiveColor: theme.inactiveCategory,
      marginRight: 8,
    },

    categoryTextActive: {
      color: theme.onPrimary,
      fontWeight: "600",
    },

    categoryTextInactive: {
      color: theme.inactiveCategoryText,
      fontWeight: "600",
    },


    /* ─────────────────────────
       ✦ TAREAS
    ───────────────────────── */
    taskCardContainer: {
      marginBottom: 3,
    },

    taskCardHeader: {
      marginBottom: 6,
    },

    taskCardContent: {
      flex: 1,
      marginLeft: 8,
    },

    taskTitle: {
      fontSize: 18,
    },

    taskTime: {
      marginTop: 2,
      fontSize: 13,
      color: theme.pendingText + "AA",
    },

    subtaskProgress: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },

    subtaskProgressBadge: {
      backgroundColor: theme.subtaskCounterBackground,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },

    subtaskProgressBadgeComplete: {
      backgroundColor: theme.subtaskCounterCompleteBackground,
    },

    subtaskProgressTextComplete: {
      color: theme.subtaskCounterCompleteText,
    },

    subtaskProgressText: {
      color: theme.subtaskCounterText,
      fontSize: 12,
      fontWeight: "600",
    },

    subtaskCollapseButton: {
      marginLeft: 6,
    },

    subtaskList: {
      marginLeft: 32,
      marginTop: 7,
      marginRight: 3,
    },

    subtaskRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },

    subtaskLabel: {
      marginLeft: 6,
    },

    taskMenuItem: {
      paddingVertical: 5,
      flexDirection: "row",
    },

    taskMenuIcon: {
      marginRight: 5,
    },

    taskMenuLabel: {
      color: theme.text,
      fontWeight: "bold",
    },

    taskMenuDangerLabel: {
      color: theme.danger,
      fontWeight: "bold",
    },

    taskEmptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },

    taskEmptyIcon: {
      marginBottom: 15,
    },

    taskEmptyTitle: {
      textAlign: "center",
      fontSize: 18,
      color: mode === "light" ? "#444" : "#ccc",
      fontWeight: "600",
    },

    taskEmptyDescription: {
      textAlign: "center",
      fontSize: 14,
      color: mode === "light" ? "#666" : "#aaa",
      marginTop: 8,
    },

    taskListContent: {
      paddingBottom: 20,
    },

    task: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 15,
      marginTop: 2,
      borderBottomWidth: 1,
      borderRightWidth: 1,
      borderRadius: 5,
      backgroundColor: theme.card,
      borderColor: theme.border,
      alignItems: "center",
      paddingRight: 10,
    },

    doneText: { color: theme.doneText },
    pendingText: { color: theme.pendingText },
    doneCheck: { color: theme.doneCheck },
    pendingCheck: { color: theme.pendingCheck },


    /* ─────────────────────────
       ✦ INPUTS
    ───────────────────────── */
    input: {
      borderWidth: 1,
      padding: 10,
      marginBottom: 10,
      borderRadius: 5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      color: theme.text,
    },

    placeholder: {
      color: theme.pendingText,
    },


    /* ─────────────────────────
       ✦ BOTÓN PRINCIPAL (+)
    ───────────────────────── */
    mainButton: {
      position: "absolute",
      bottom: 24,
      right: 24,
      marginRight: 4,
      backgroundColor: theme.primary,
      borderRadius: 50,
      width: 60,
      height: 60,
      alignItems: "center",
      justifyContent: "center",
      elevation: 5,
      zIndex: 999,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 4,
    },


    /* ─────────────────────────
       ✦ MODALES
    ───────────────────────── */
    categoryDeleteButton: {
      marginTop: 12,
      padding: 12,
      borderRadius: 6,
      backgroundColor: theme.dangerBackground,
    },

    categoryDeleteLabel: {
      color: theme.onDanger,
      textAlign: "center",
      fontWeight: "bold",
    },

    categoryCancelButton: {
      marginTop: 12,
    },

    modalCancelText: {
      textAlign: "center",
      color: theme.inactiveCategoryText,
    },

    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },

    modalBox: {
      width: "80%",
      padding: 20,
      borderRadius: 10,
      backgroundColor: theme.card,
    },

    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10,
      color: theme.text,
    },

    saveButton: {
      padding: 15,
      borderRadius: 5,
      alignItems: "center",
      marginBottom: 3,
      backgroundColor: theme.primary,
    },

    saveButtonText: {
      color: theme.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },

    optionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    optionLabel: {
      fontSize: 14,
      color: theme.text,
    },

    optionValue: {
      fontSize: 14,
      color: theme.pendingText,
      marginRight: 6,
    },

    optionMenu: {
      borderWidth: 1,
      borderColor: theme.border + "40",
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginTop: 5,
      top: 40,
      marginLeft: 32,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 5,
      zIndex: 999,
      backgroundColor: theme.card,
    },


    /* ─────────────────────────
       ✦ TASKMODAL ICON ROW
    ───────────────────────── */
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 15,
    },

    iconButton: {
      padding: 10,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },

    iconColor: {
      color: theme.text,
    },


    /* ─────────────────────────
       ✦ PANTALLA DEL CALENDARIO
    ───────────────────────── */
    calendarContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: theme.background,
    },

    calendarBox: {
      width: "80%",
      paddingVertical: 30,
      paddingHorizontal: 20,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 6,
      elevation: 5,
    },

    calendarTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.primaryText,
      marginBottom: 6,
    },

    calendarSubtitle: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 4,
    },

    calendarDescription: {
      fontSize: 14,
      color: theme.pendingText,
      textAlign: "center",
      marginTop: 4,
    },

    /* ─────────────────────────
       ✦ SECCIÓN DE PRÓXIMAS TAREAS
    ───────────────────────── */
    drawerHeader: {
      padding: 20,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderTopWidth: 1,
      borderColor: theme.text + "33",
      borderRadius: 10,
      marginBottom: 10,
    },

    drawerTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.text,
    },

    drawerSubtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
    },

    drawerSubtitle: {
      fontSize: 14,
      color: theme.pendingText,
      marginLeft: 3,
    },

    drawerItems: {
      flex: 1,
      backgroundColor: theme.card,
      marginTop: 5,
    },

    upcomingSection: {
      marginTop: 28,
      marginLeft: 10,
      gap: 14,
    },

    upcomingTitle: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 1,
      opacity: 0.65,
    },

    upcomingItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      opacity: 0.5,
    },

    upcomingLabel: {
      fontSize: 14,
      fontWeight: "500",
    },




    // Editor de repetición.
    repeatKeyboardContainer: { flex: 1 },
    repeatShell: { width: "94%", maxWidth: 480, flexShrink: 1, paddingVertical: 16 },
    repeatModalBox: { width: "100%", flexShrink: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14 },
    repeatTitle: { marginBottom: 12 },
    repeatModes: { flexDirection: "row", borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: "hidden", flexShrink: 0 },
    repeatModeButton: { flex: 1, minHeight: 30, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
    repeatModeText: { color: theme.text, fontSize: 12, fontWeight: "500" },
    repeatSelection: { backgroundColor: theme.primary, borderColor: theme.primary },
    repeatSelectedText: { color: theme.onPrimary, fontWeight: "700" },
    repeatScroll: { flex: 1, minHeight: 0 },
    repeatScrollContent: { paddingTop: 18, paddingBottom: 4 },
    repeatSection: { marginBottom: 18 },
    repeatSectionLabel: { color: theme.inactiveCategoryText, fontSize: 13, marginBottom: 10 },
    repeatDaysGrid: { flexDirection: "row", flexWrap: "wrap" },
    repeatDayCell: { width: "14.285714%", paddingInline: 3, paddingBlock: 2, flexShrink: 0 },
    repeatDayButton: { minHeight: 40, borderRadius: 100, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border + "50", backgroundColor: theme.card },
    repeatDayText: { color: theme.text, fontSize: 14, fontWeight: "500" },
    repeatHint: { color: theme.inactiveCategoryText, fontSize: 12, marginTop: 10, lineHeight: 18 },
    repeatIntervalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-around", paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, borderRadius: 12, width: '100%', flexShrink: 0 },
    repeatBodyText: { color: theme.text, fontSize: 15 },
    repeatUnitText: { minWidth: 55, textAlign: "right" },
    repeatStepButton: { width: 40, height: 40, borderRadius: 22, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
    repeatStepText: { color: theme.text, fontSize: 20 },
    repeatIntervalInput: { width: 62, minHeight: 44, marginHorizontal: 3, paddingHorizontal: 2, paddingVertical: 4, textAlign: "center", color: theme.text, fontSize: 16, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: theme.border },
    repeatDisabled: { opacity: 0.4 },
    repeatError: { color: theme.danger, fontSize: 12, marginTop: 8 },
    repeatEndDate: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
    repeatSummary: { color: theme.pendingText, fontSize: 13, lineHeight: 20, padding: 10, backgroundColor: theme.background, borderRadius: 10 },
    repeatApplyButton: { marginTop: 10, flexShrink: 0 },
    repeatCancelButton: { minHeight: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  });
}
