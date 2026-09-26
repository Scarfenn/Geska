import createThemedStyles from "@/styles/createThemedStyles";
import getCommonStyles from "@/styles/commonStyles";
export default createThemedStyles((theme, mode, themeName) => ({
  ...getCommonStyles(themeName, mode),
  taskEmptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  taskEmptyIcon: {
    marginBottom: 15
  },
  taskEmptyTitle: {
    textAlign: "center",
    fontSize: 18,
    color: theme.text,
    fontWeight: "600"
  },
  taskEmptyDescription: {
    textAlign: "center",
    fontSize: 14,
    color: theme.inactiveCategoryText,
    marginTop: 8
  },
  taskListContent: {
    paddingBottom: 20
  }
}));
