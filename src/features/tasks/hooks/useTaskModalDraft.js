import { useEffect, useRef, useState } from "react";

export default function useTaskModalDraft(taskToEdit, selectedCategoryForTask) {
  // A TaskModal session is mounted once per opening/task identity.
  const [taskText, setTaskText] = useState(() => taskToEdit?.title || "");
  const [selectedCategory, setSelectedCategory] = useState(() => taskToEdit
    ? taskToEdit.categoryId ?? null : selectedCategoryForTask ?? null);
  const [draftSubtasks, setDraftSubtasks] = useState(() => (taskToEdit?.subtasks || []).map(row => ({
    ...row, id: String(row.id), isNew: false,
  })));
  const previousCategory = useRef(selectedCategoryForTask);
  useEffect(() => {
    if (previousCategory.current === selectedCategoryForTask) return;
    previousCategory.current = selectedCategoryForTask;
    // null clears the external handoff, not a category chosen inside the form.
    if (selectedCategoryForTask != null) setSelectedCategory(selectedCategoryForTask);
  }, [selectedCategoryForTask]);
  return { taskText, setTaskText, selectedCategory, setSelectedCategory, draftSubtasks, setDraftSubtasks };
}
