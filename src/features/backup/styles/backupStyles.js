import createThemedStyles from "@/styles/createThemedStyles";
import getSettingsStyles from "@/features/settings/styles/settingsStyles";
import getButtonStyles from "@/styles/buttonStyles";

export default createThemedStyles((theme, mode, themeName) => ({
  ...getSettingsStyles(themeName, mode),
  ...getButtonStyles(themeName, mode),
  panel: { padding: 16, gap: 12, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginTop: 20 },
  text: { color: theme.text, fontSize: 15, lineHeight: 22 },
  error: { color: theme.danger, fontSize: 13, lineHeight: 22 },
  backupInfoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 12 },
  backupInfoDetails: { flexGrow: 1, flexShrink: 1, gap: 4 },
  refreshButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 44, paddingHorizontal: 8 },
  refreshText: { color: theme.primaryText, fontSize: 13, fontWeight: "500" },
  secondaryButton: { minHeight: 48, justifyContent: "center", alignItems: "center", padding: 15, borderRadius: 8, borderWidth: 1, borderColor: theme.primary },
  secondaryText: { color: theme.primaryText, fontSize: 16, fontWeight: "600" },
  dangerButton: { minHeight: 48, padding: 15, borderRadius: 8, alignItems: "center", backgroundColor: theme.dangerBackground },
  dangerButtonText: { color: theme.onDanger, fontSize: 16, fontWeight: "bold" },
  cancelButton: { minHeight: 24, justifyContent: "center", alignItems: "center", padding: 4, marginTop: 12 },
  cancelButtonText: { color: theme.primaryText, fontSize: 16, fontWeight: "600" },
  disabledSaveButtonText: { color: theme.onPrimary + "80", fontSize: 16, fontWeight: "bold" },
  disabled: { opacity: 0.5 },
}));
