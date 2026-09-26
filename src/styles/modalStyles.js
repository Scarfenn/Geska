import createThemedStyles from "@/styles/createThemedStyles";
import getCommonStyles from "@/styles/commonStyles";
import getButtonStyles from "@/styles/buttonStyles";
export default createThemedStyles((theme, mode, themeName) => ({
  ...getCommonStyles(themeName, mode),
  ...getButtonStyles(themeName, mode),
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderColor: theme.inactiveCategoryText,
    backgroundColor: theme.card,
    color: theme.text
  },
  placeholder: {
    color: theme.pendingText
  },
  categoryDeleteButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
    backgroundColor: theme.dangerBackground
  },
  categoryDeleteLabel: {
    color: theme.onDanger,
    textAlign: "center",
    fontWeight: "bold"
  },
  categoryCancelButton: {
    marginTop: 12
  },
  modalCancelText: {
    textAlign: "center",
    color: theme.inactiveCategoryText
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  modalBox: {
    width: "80%",
    padding: 20,
    borderRadius: 10,
    backgroundColor: theme.card
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: theme.text
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  optionLabel: {
    fontSize: 14,
    color: theme.text
  },
  optionValue: {
    fontSize: 14,
    color: theme.pendingText,
    marginRight: 6
  }
}));
