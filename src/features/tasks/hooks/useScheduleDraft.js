import { useReducer, useState } from "react";
import { createScheduleDraft, scheduleDraftReducer } from "../domain/scheduleDraft";

export default function useScheduleDraft(props) {
  // TimeModal mounts one session per opening. Parent renders must not erase edits.
  const [draft, dispatch] = useReducer(scheduleDraftReducer, props, createScheduleDraft);
  const [activeModal, setActiveModal] = useState(null);
  const setField = (field) => (value) => dispatch({ field, value });
  return {
    draft, activeModal, setActiveModal,
    draftDate: draft.date, handleDateSelected: setField("date"),
    draftTime: draft.time, handleSelectedTimeChange: setField("time"),
    draftRepeatMode: draft.repeatMode, setDraftRepeatMode: setField("repeatMode"),
    draftRepeatDays: draft.repeatDays, setDraftRepeatDays: setField("repeatDays"),
    draftRepeatInterval: draft.repeatInterval, setDraftRepeatInterval: setField("repeatInterval"),
    draftReminder: draft.reminder, setDraftReminder: setField("reminder"),
    draftEndDate: draft.endDate, setDraftEndDate: setField("endDate"),
  };
}
