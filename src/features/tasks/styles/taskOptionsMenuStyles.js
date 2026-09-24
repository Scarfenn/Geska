import createThemedStyles from "@/styles/createThemedStyles";

export default createThemedStyles(theme => ({
  taskMenuItem: {
    paddingVertical: 5,
    flexDirection: "row"
  },
  taskMenuIcon: {
    marginRight: 5
  },
  taskMenuLabel: {
    color: theme.text,
    fontWeight: "bold"
  },
  taskMenuDangerLabel: {
    color: theme.danger,
    fontWeight: "bold"
  },
  optionMenu: {
    borderWidth: 1,
    borderColor: theme.border + "40",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: theme.card
  },
}));
