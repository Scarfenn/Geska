import createThemedStyles from "@/styles/createThemedStyles";

// Shared by modal actions and the task screen's retry action.
export default createThemedStyles(theme => ({
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 3,
    backgroundColor: theme.primary
  },
  saveButtonText: {
    color: theme.onPrimary,
    fontWeight: "bold",
    fontSize: 16
  }
}));
