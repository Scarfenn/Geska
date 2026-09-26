import createThemedStyles from "@/styles/createThemedStyles";
import getSettingsStyles from "@/features/settings/styles/settingsStyles";

export default createThemedStyles((theme, mode, themeName) => ({
  ...getSettingsStyles(themeName, mode),
  modeControl: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 6, borderRadius: 16, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  modeOption: { flex: 1, minWidth: 100, minHeight: 48, padding: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  selectedOption: { backgroundColor: theme.primary },
  optionText: { color: theme.text, fontSize: 16, fontWeight: "600", flexShrink: 1 },
  selectedText: { color: theme.onPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  familyCard: { width: "48%", padding: 10, borderRadius: 16, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.card, minHeight: 120 },
  selectedCard: { borderColor: theme.primaryText },
  preview: { flexDirection: "row", gap: 4, padding: 8, height: 58, borderWidth: 1, borderRadius: 10, alignItems: "center" },
  swatch: { flex: 1, height: 28, borderRadius: 14 },
  familyLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  familyName: { flex: 1, color: theme.text, fontSize: 15, fontWeight: "600" },
}));
