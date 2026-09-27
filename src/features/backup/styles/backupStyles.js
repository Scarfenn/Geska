import createThemedStyles from "@/styles/createThemedStyles";
import getSettingsStyles from "@/features/settings/styles/settingsStyles";
import getButtonStyles from "@/styles/buttonStyles";

export default createThemedStyles((theme, mode, themeName) => ({
  ...getSettingsStyles(themeName, mode),
  ...getButtonStyles(themeName, mode),
  panel: { padding: 18, gap: 16, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginTop: 20 },
  text: { color: theme.text, fontSize: 15, lineHeight: 22 },
  error: { color: theme.danger, fontSize: 15, lineHeight: 22 },
  secondaryButton: { minHeight: 48, justifyContent: "center", alignItems: "center", padding: 12 },
  secondaryText: { color: theme.primaryText, fontSize: 16, fontWeight: "600" },
  restoreButton: { minHeight: 48, padding: 15, borderRadius: 8, alignItems: "center", backgroundColor: theme.dangerBackground },
  restoreButtonText: { color: theme.onDanger, fontSize: 16, fontWeight: "bold" },
  disabled: { opacity: 0.5 },
}));
