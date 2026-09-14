import createThemedStyles from "@/styles/createThemedStyles";
export default createThemedStyles((theme, mode, themeName) => ({
  text: {
    color: theme.text
  },
  textSecondary: {
    color: theme.inactiveCategoryText
  },
  dangerText: {
    color: theme.danger
  },
  dangerButton: {
    backgroundColor: theme.dangerBackground
  },
  dangerButtonText: {
    color: theme.onDanger
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center"
  },
  fill: {
    flex: 1
  },
  doneText: {
    color: theme.doneText
  },
  pendingText: {
    color: theme.pendingText
  },
  doneCheck: {
    color: theme.doneCheck
  },
  pendingCheck: {
    color: theme.pendingCheck
  }
}));
