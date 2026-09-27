import createThemedStyles from "@/styles/createThemedStyles";
import getModalStyles from "@/styles/modalStyles";
export default createThemedStyles((theme, mode, themeName) => ({
  ...getModalStyles(themeName, mode),
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 15
  },
  iconButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 4,
    elevation: 2
  },
  iconColor: {
    color: theme.text
  }
}));
