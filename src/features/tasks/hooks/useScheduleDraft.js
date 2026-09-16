import { useReducer, useState } from "react";
import { createScheduleDraft, scheduleDraftReducer } from "@/features/tasks/domain/scheduleDraft";
import { canSelectTaskDate, getEarliestSelectableTaskDate, isHistoricalTaskDate } from "@/features/tasks/domain/taskDates";
import { getRepeatEndState } from "@/features/tasks/domain/repeatEnd";

export default function useScheduleDraft(props) {
  // TimeModal mounts one session per opening. Parent renders must not erase edits.
  const [draft, dispatch] = useReducer(scheduleDraftReducer, props, createScheduleDraft);
  const [activeModal, setActiveModal] = useState(null);
  const setField = (field) => (value) => dispatch({ field, value });
  return {
    draft, activeModal, setActiveModal,
    repeatEndError: getRepeatEndState(draft).error,
    draftDate: draft.date, minTaskDate: getEarliestSelectableTaskDate(),
    isHistoricalDate: isHistoricalTaskDate(draft.date),
    handleDateSelected: (date) => {
      if (canSelectTaskDate(date)) dispatch({ field: "date", value: date });
    },
    draftTime: draft.time, handleSelectedTimeChange: setField("time"),
    draftRepeatMode: draft.repeatMode, setDraftRepeatMode: setField("repeatMode"),
    draftRepeatDays: draft.repeatDays, setDraftRepeatDays: setField("repeatDays"),
    draftRepeatInterval: draft.repeatInterval, setDraftRepeatInterval: setField("repeatInterval"),
    draftReminder: draft.reminder, setDraftReminder: setField("reminder"),
    draftEndDate: draft.endDate, setDraftEndDate: setField("endDate"),
  };
}
