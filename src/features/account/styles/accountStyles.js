import createThemedStyles from "@/styles/createThemedStyles";
import getSettingsStyles from "@/features/settings/styles/settingsStyles";
import getButtonStyles from "@/styles/buttonStyles";

export default createThemedStyles((theme, mode, themeName) => ({
  ...getSettingsStyles(themeName, mode),
  ...getButtonStyles(themeName, mode),
  form: { padding: 18, gap: 16, backgroundColor: theme.card, borderRadius: 16, borderColor: theme.border, borderWidth: 1 },
  label: { color: theme.text, fontSize: 15, fontWeight: "600", marginBottom: 8 },
  input: { color: theme.text, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.inactiveCategoryText, borderRadius: 8, padding: 12, minHeight: 48, fontSize: 16 },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", padding: 12 },
  secondaryText: { color: theme.primaryText, fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  error: { color: theme.danger, fontSize: 15, lineHeight: 22, marginVertical: 12 },
  message: { color: theme.text, fontSize: 15, lineHeight: 22, marginVertical: 12 },
}));
