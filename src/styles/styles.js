import { StyleSheet } from "react-native";
import { themes } from "./themes";

export default function createStyles(themeName = "basic", mode = "light") {
  const theme = themes[themeName][mode];

  return StyleSheet.create({

    /* ─────────────────────────
       ✦ TEXTO GLOBAL
    ───────────────────────── */
    text: { color: theme.text },
    textSecondary: { color: theme.pendingText },


    /* ─────────────────────────
       ✦ CONTENEDOR GLOBAL
    ───────────────────────── */
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
      color: "#fff",
      fontWeight: "600",
    },

    dayItemNumber: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "500",
    },

    dayItemNumberActive: {
      color: "#fff",
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
      color: "#fff",
      fontWeight: "600",
    },

    categoryTextInactive: {
      color: theme.inactiveCategoryText,
      fontWeight: "600",
    },


    /* ─────────────────────────
       ✦ TAREAS
    ───────────────────────── */
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
      color: "#fff",
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
      fontSize: 16,
      color: theme.text,
    },

    optionValue: {
      fontSize: 16,
      color: theme.pendingText,
      marginRight: 6,
    },

    optionMenu: {
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
      color: theme.primary,
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


  });
}
