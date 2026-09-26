import createThemedStyles from "@/styles/createThemedStyles";
import getModalStyles from "@/styles/modalStyles";
export default createThemedStyles((theme, mode, themeName) => ({
  ...getModalStyles(themeName, mode),
  repeatKeyboardContainer: {
    flex: 1
  },
  repeatShell: {
    width: "94%",
    maxWidth: 480,
    flexShrink: 1,
    minHeight: 0,
    paddingVertical: 16
  },
  repeatAnimatedContent: {
    flexShrink: 1,
    minHeight: 0
  },
  repeatModalBox: {
    width: "100%",
    flexShrink: 1,
    minHeight: 0,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14
  },
  repeatTitle: {
    marginBottom: 12
  },
  repeatModes: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    overflow: "hidden",
    flexShrink: 0
  },
  repeatModeButton: {
    flex: 1,
    minHeight: 30,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  repeatModeText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: "500"
  },
  repeatSelection: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  repeatSelectedText: {
    color: theme.onPrimary,
    fontWeight: "700"
  },
  repeatScroll: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0
  },
  repeatFixedSection: {
    flexShrink: 0
  },
  repeatScrollContent: {
    paddingTop: 18,
    paddingBottom: 4
  },
  repeatSection: {
    marginBottom: 18
  },
  repeatSectionLabel: {
    color: theme.inactiveCategoryText,
    fontSize: 13,
    marginBottom: 10
  },
  repeatDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  repeatDayCell: {
    width: "14.285714%",
    paddingInline: 3,
    paddingBlock: 2,
    flexShrink: 0
  },
  repeatDayButton: {
    minHeight: 40,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border + "50",
    backgroundColor: theme.card
  },
  repeatDayText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "500"
  },
  repeatHint: {
    color: theme.inactiveCategoryText,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18
  },
  repeatIntervalRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    width: '100%',
    flexShrink: 0
  },
  repeatBodyText: {
    color: theme.text,
    fontSize: 15
  },
  repeatUnitText: {
    width: 60,
    flexShrink: 0,
    textAlign: "right"
  },
  repeatIntervalControls: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0
  },
  repeatStepButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center"
  },
  repeatStepText: {
    color: theme.text,
    fontSize: 20
  },
  repeatIntervalInput: {
    width: 48,
    minWidth: 28,
    flexShrink: 1,
    minHeight: 44,
    marginHorizontal: 3,
    paddingHorizontal: 2,
    paddingVertical: 4,
    textAlign: "center",
    color: theme.text,
    fontSize: 16,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: theme.inactiveCategoryText
  },
  repeatDisabled: {
    opacity: 0.4
  },
  repeatError: {
    color: theme.danger,
    fontSize: 12,
    marginTop: 8
  },
  repeatEndDate: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card
  },
  repeatClearEndDate: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start"
  },
  repeatClearEndDateText: {
    color: theme.primaryText,
    fontSize: 14
  },
  repeatSummary: {
    color: theme.pendingText,
    fontSize: 13,
    lineHeight: 20,
    padding: 10,
    backgroundColor: theme.background,
    borderRadius: 10
  },
  repeatApplyButton: {
    marginTop: 10,
    flexShrink: 0
  },
  repeatCancelButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  }
}));
