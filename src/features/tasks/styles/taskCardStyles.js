import createThemedStyles from "@/styles/createThemedStyles";
import getCommonStyles from "@/styles/commonStyles";
export default createThemedStyles((theme, mode, themeName) => ({
  ...getCommonStyles(themeName, mode),
  taskCardContainer: {
    marginBottom: 3
  },
  taskCardHeader: {
    marginBottom: 6
  },
  taskCardContent: {
    flex: 1,
    marginLeft: 8
  },
  taskTitle: {
    fontSize: 18
  },
  taskTime: {
    marginTop: 2,
    fontSize: 13,
    color: theme.pendingText + "AA"
  },
  subtaskProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8
  },
  subtaskProgressBadge: {
    backgroundColor: theme.subtaskCounterBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  subtaskProgressBadgeComplete: {
    backgroundColor: theme.subtaskCounterCompleteBackground
  },
  subtaskProgressTextComplete: {
    color: theme.subtaskCounterCompleteText
  },
  subtaskProgressText: {
    color: theme.subtaskCounterText,
    fontSize: 12,
    fontWeight: "600"
  },
  subtaskCollapseButton: {
    marginLeft: 6
  },
  subtaskList: {
    marginLeft: 32,
    marginTop: 7,
    marginRight: 3
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  subtaskLabel: {
    marginLeft: 6
  },
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
  task: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    marginTop: 2,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderRadius: 5,
    backgroundColor: theme.card,
    borderColor: theme.border,
    alignItems: "center",
    paddingRight: 10
  },
  optionMenu: {
    borderWidth: 1,
    borderColor: theme.border + "40",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 5,
    top: 40,
    marginLeft: 32,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
    backgroundColor: theme.card
  }
}));
