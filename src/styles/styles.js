import createThemedStyles from "@/styles/createThemedStyles";
import getCommonStyles from "@/styles/commonStyles";
import getModalStyles from "@/styles/modalStyles";
import getScreenStyles from "@/features/tasks/styles/taskScreenStyles";
import getListStyles from "@/features/tasks/styles/taskListStyles";
import getCardStyles from "@/features/tasks/styles/taskCardStyles";
import getTaskModalStyles from "@/features/tasks/styles/taskModalStyles";
import getRepeatStyles from "@/features/tasks/styles/repeatModalStyles";

// Compatibility facade for consumers not migrated yet, including legacy modules.
export default createThemedStyles((theme, mode, themeName) => ({
  ...getCommonStyles(themeName, mode),
  ...getModalStyles(themeName, mode),
  ...getScreenStyles(themeName, mode),
  ...getListStyles(themeName, mode),
  ...getCardStyles(themeName, mode),
  ...getTaskModalStyles(themeName, mode),
  ...getRepeatStyles(themeName, mode),
  categoryContainer: {
    ...getScreenStyles(themeName, mode).categoryContainer,
    activeColor: theme.primary,
    inactiveColor: theme.inactiveCategory
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border + "66",
    shadowColor: "#000",
    shadowOpacity: mode === "light" ? 0.06 : 0.25,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 4,
    elevation: 3,
    marginTop: 2
  },
  daySelectorContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4
  },
  arrowButton: {
    padding: 4
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 4
  },
  dayItem: {
    width: 38,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  dayItemActive: {
    backgroundColor: theme.primary,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 4,
    elevation: 2
  },
  dayItemLabel: {
    color: theme.text,
    fontSize: 12,
    marginBottom: -2
  },
  dayItemLabelActive: {
    color: theme.onPrimary,
    fontWeight: "600"
  },
  dayItemNumber: {
    fontSize: 16,
    color: theme.text,
    fontWeight: "500"
  },
  dayItemNumberActive: {
    color: theme.onPrimary,
    fontWeight: "700"
  },
  calendarContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: theme.background
  },
  calendarBox: {
    width: "80%",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowRadius: 6,
    elevation: 5
  },
  calendarTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.primaryText,
    marginBottom: 6
  },
  calendarSubtitle: {
    fontSize: 16,
    color: theme.text,
    marginBottom: 4
  },
  calendarDescription: {
    fontSize: 14,
    color: theme.pendingText,
    textAlign: "center",
    marginTop: 4
  },
  drawerHeader: {
    padding: 20,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: theme.text + "33",
    borderRadius: 10,
    marginBottom: 10
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text
  },
  drawerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5
  },
  drawerSubtitle: {
    fontSize: 14,
    color: theme.pendingText,
    marginLeft: 3
  },
  drawerItems: {
    flex: 1,
    backgroundColor: theme.card,
    marginTop: 5
  },
  upcomingSection: {
    marginTop: 28,
    marginLeft: 10,
    gap: 14
  },
  upcomingTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    opacity: 0.65
  },
  upcomingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    opacity: 0.5
  },
  upcomingLabel: {
    fontSize: 14,
    fontWeight: "500"
  }
}));
