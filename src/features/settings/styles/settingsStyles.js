import createThemedStyles from "@/styles/createThemedStyles";

export default createThemedStyles(theme => ({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, paddingBottom: 40, width: "100%", maxWidth: 640, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 },
  menuButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.card, alignItems: "center", justifyContent: "center" },
  title: { color: theme.text, fontSize: 24, fontWeight: "bold", flexShrink: 1 },
  section: { marginBottom: 24 },
  appearance: { zIndex: 10 },
  sectionTitle: { color: theme.inactiveCategoryText, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, minHeight: 76 },
  rowContent: { flex: 1 },
  rowTitle: { color: theme.text, fontSize: 16, fontWeight: "600" },
  rowSubtitle: { color: theme.inactiveCategoryText, fontSize: 14, marginTop: 5, lineHeight: 20 },
  divider: { height: 1, backgroundColor: theme.border, marginHorizontal: 16 },
  note: { color: theme.inactiveCategoryText, fontSize: 13, lineHeight: 20, marginTop: 10, marginHorizontal: 4 },
}));
