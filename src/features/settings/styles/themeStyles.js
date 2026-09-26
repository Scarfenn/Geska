import createThemedStyles from "@/styles/createThemedStyles";
import getSettingsStyles from "@/features/settings/styles/settingsStyles";

export default createThemedStyles((theme, mode, themeName) => ({
  ...getSettingsStyles(themeName, mode),
  layout: { flex: 1, paddingHorizontal: 20, paddingTop: 20, width: "100%", maxWidth: 640, alignSelf: "center" },
  familySection: { flex: 1, minHeight: 0 },
  familyScroll: { flex: 1 },
  familyScrollContent: { paddingBottom: 24 },
  modeControl: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 6, borderRadius: 16, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  modeOption: { flex: 1, minWidth: 100, minHeight: 24, padding: 8, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  selectedOption: { backgroundColor: theme.primary },
  optionText: { color: theme.text, fontSize: 16, fontWeight: "600", flexShrink: 1 },
  selectedText: { color: theme.onPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  familyCard: { width: "48%", padding: 10, borderRadius: 16, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.card, minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8 },
  selectedCard: { borderColor: theme.primaryText },
  familyAccent: { width: 4, height: 24, borderRadius: 2 },
  familyName: { flex: 1, color: theme.text, fontSize: 15, fontWeight: "600" },
}));
