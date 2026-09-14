import createThemedStyles from "@/styles/createThemedStyles";
import getModalStyles from "@/styles/modalStyles";

export default createThemedStyles((theme, mode, themeName) => ({
  ...getModalStyles(themeName, mode),
  pickerBox: {
    width: "94%", maxWidth: 420, flexShrink: 1, minHeight: 0,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 18,
  },
  pickerTitle: { marginBottom: 14, flexShrink: 0 },
  pickerNavigation: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8, flexShrink: 0,
  },
  pickerArrow: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  pickerHeadingButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  pickerHeading: { color: theme.text, fontSize: 17, fontWeight: "700", textAlign: "center" },
  pickerHeadingHint: { color: theme.inactiveCategoryText, fontSize: 11, marginTop: 3 },
  pickerScroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  pickerWeekdays: { flexDirection: "row", marginBottom: 4 },
  pickerWeekday: { width: "14.285714%", textAlign: "center", color: theme.inactiveCategoryText, fontSize: 12, paddingVertical: 6, fontWeight: "600" },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap" },
  pickerDayCell: { width: "14.285714%", minHeight: 44, padding: 2 },
  pickerDay: {
    flex: 1, minHeight: 40, borderRadius: 12, borderWidth: 1,
    borderColor: 'transparent', justifyContent: "center", alignItems: "center", paddingVertical: 5,
  },
  pickerDayText: { color: theme.text, fontSize: 15, fontWeight: "500" },
  pickerToday: { borderColor: theme.primary },
  pickerSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  pickerSelectedText: { color: theme.onPrimary, fontWeight: "700" },
  pickerDisabled: { opacity: 0.3 },
  pickerPeriodCell: { width: "33.333333%", minHeight: 66, padding: 4 },
  pickerPeriod: {
    flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center",
    paddingVertical: 10, paddingHorizontal: 3, borderWidth: 1, borderColor: theme.border,
  },
  pickerPeriodText: { color: theme.text, fontSize: 14, textAlign: "center" },
  pickerFooter: { flexShrink: 0, marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6 },
  pickerTodayButton: { minHeight: 40, alignItems: "center", justifyContent: "center" },
  pickerActionText: { color: theme.primaryText, fontSize: 14, fontWeight: "600" },
  pickerCancelButton: { minHeight: 40, alignItems: "center", justifyContent: "center" },
}));
