import createThemedStyles from "@/styles/createThemedStyles";
import getCommonStyles from "@/styles/commonStyles";
import getListStyles from "@/features/tasks/styles/taskListStyles";
import getModalStyles from "@/styles/modalStyles";
export default createThemedStyles((theme, mode, themeName) => ({
  ...getCommonStyles(themeName, mode),
  ...getListStyles(themeName, mode),
  ...getModalStyles(themeName, mode),
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 25,
    backgroundColor: theme.background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 2,
    marginBottom: 8
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text
  },
  categoryContainer: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8
  },
  categoryTextActive: {
    color: theme.onPrimary,
    fontWeight: "600"
  },
  categoryTextInactive: {
    color: theme.inactiveCategoryText,
    fontWeight: "600"
  },
  mainButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    marginRight: 4,
    backgroundColor: theme.primary,
    borderRadius: 50,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    zIndex: 999,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowRadius: 4
  }
}));
