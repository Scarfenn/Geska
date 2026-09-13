import { useCallback, useRef, useState } from "react";

export default function useSubtaskDraft(subtasks) {
  const nextId = useRef(0);
  const inputs = useRef(new Map());
  const pendingFocus = useRef(null);
  const createRow = () => ({
    id: `new-${Date.now()}-${nextId.current++}`,
    text: "", done: false, isNew: true, sort_order: null,
  });
  const [draftSubtasks, setDraftSubtasks] = useState(() => subtasks.length
    ? subtasks.map((row, index) => ({
      ...row, id: String(row.id), text: row.text || "", done: !!row.done,
      isNew: !!row.isNew, sort_order: row.sort_order ?? index,
    }))
    : [createRow()]);

  const registerInput = useCallback((id, input) => {
    if (!input) { inputs.current.delete(id); return; }
    inputs.current.set(id, input);
    if (pendingFocus.current === id) {
      pendingFocus.current = null;
      input.focus();
    }
  }, []);
  const insertAfter = (id = null) => {
    const row = createRow();
    pendingFocus.current = row.id;
    setDraftSubtasks(current => {
      const index = id === null ? current.length - 1 : current.findIndex(item => item.id === id);
      if (id !== null && index < 0) return current;
      const next = [...current];
      next.splice(index + 1, 0, row);
      return next;
    });
  };
  const updateText = (id, text) => setDraftSubtasks(current => current.map(row => row.id === id ? { ...row, text } : row));
  const removeDraft = (id) => {
    if (pendingFocus.current === id) pendingFocus.current = null;
    inputs.current.delete(id);
    setDraftSubtasks(current => current.filter(row => row.id !== id));
  };
  const handleSubmitEditing = (id) => {
    if (draftSubtasks.find(row => row.id === id)?.text.trim()) insertAfter(id);
  };
  return { draftSubtasks, setDraftSubtasks, registerInput, insertAfter, updateText, removeDraft, handleSubmitEditing };
}
