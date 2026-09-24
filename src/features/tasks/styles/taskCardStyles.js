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
}));
