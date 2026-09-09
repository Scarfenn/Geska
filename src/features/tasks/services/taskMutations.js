import { deleteCategory, addCategory, updateCategory, getAllTasks, saveTask, updateTask, setOccurrenceDone, getOccurrence, deleteTask, addSubtask } from "@/storage/database";
import { scheduleTaskReminders, cancelTaskReminders, rescheduleTaskReminders } from "@/features/tasks/services/notifications";
import { applyReminderToTask } from "@/features/tasks/services/reminderModel";
import { formatDateLocal, formatTime } from "../domain/taskDates";
import { saveSubtasks, toggleSubtaskDone as toggleSubtask } from "./subtaskMutations";
// Actions receive the current task snapshot and refresh only after persistence.
export function createTaskActions({
  tasks,
  loadTasks
}) {
  const saveSubtasksHandler = async (taskId, draftSubtasks, reload = true) => {
    await saveSubtasks(tasks.find(task => task.id === taskId), draftSubtasks);
    if (reload) await loadTasks();
  };
  const toggleSubtaskDone = async (taskId, subtaskId, selectedDay) => {
    await toggleSubtask(tasks.find(task => task.id === taskId), subtaskId, selectedDay);
    await loadTasks();
  };
  const addTaskHandler = async (taskData, schedule) => {
    const {
      selectedDate,
      selectedTime,
      repeatMode,
      repeatDays,
      repeatInterval,
      reminder,
      endDate
    } = schedule;
    const {
      text,
      categoryId,
      subtasks = []
    } = taskData;
    if (!text?.trim()) return;
    const newTask = applyReminderToTask({
      id: Date.now().toString(),
      title: text.trim(),
      description: null,
      done: false,
      categoryId: categoryId ?? null,
      // --- TIEMPO ---
      date: formatDateLocal(selectedDate),
      time: formatTime(selectedTime),
      repeat_mode: repeatMode,
      repeat_days: Array.isArray(repeatDays) ? repeatDays.join(",") : null,
      repeat_interval: repeatInterval || 1,
      repeat_end: formatDateLocal(endDate),
      notification_ids: [],
      notification_id: null,
      subtasks: []
    }, reminder);
    await saveTask(newTask);
    for (const subtask of subtasks) {
      if (!subtask.text?.trim()) {
        continue;
      }
      await addSubtask(newTask.id, subtask.text.trim());
    }
    const notificationIds = await scheduleTaskReminders(newTask);
    if (notificationIds.length) {
      await updateTask({
        ...newTask,
        notification_ids: notificationIds,
        notification_id: notificationIds[0]
      });
    }
    await loadTasks();
  };
  const saveEditTaskHandler = async (taskData, taskToEdit, schedule) => {
    const {
      selectedDate,
      selectedTime,
      repeatMode,
      repeatDays,
      repeatInterval,
      reminder,
      endDate
    } = schedule;
    if (!taskToEdit) return;
    const {
      text,
      categoryId,
      subtasks = []
    } = taskData;
    if (!text?.trim()) return;
    const updatedTask = applyReminderToTask({
      ...taskToEdit,
      id: taskToEdit.id,
      title: text.trim(),
      description: taskToEdit.description || null,
      done: taskToEdit.done ? 1 : 0,
      categoryId: categoryId ?? null,
      // --- TIEMPO ---
      date: formatDateLocal(selectedDate),
      time: formatTime(selectedTime),
      repeat_mode: repeatMode,
      repeat_days: Array.isArray(repeatDays) ? repeatDays.join(",") : null,
      repeat_end: formatDateLocal(endDate),
      repeat_interval: repeatInterval || 1,
      notification_ids: [],
      notification_id: null
    }, reminder);
    await cancelTaskReminders(taskToEdit.notification_ids || taskToEdit.notification_id);
    await updateTask(updatedTask);
    await saveSubtasksHandler(updatedTask.id, subtasks, false);
    const notificationIds = await scheduleTaskReminders(updatedTask);
    await updateTask({
      ...updatedTask,
      notification_ids: notificationIds,
      notification_id: notificationIds[0] ?? null
    });
    await loadTasks();
  };
  const removeTask = async id => {
    const taskToRemove = tasks.find(task => task.id === id);
    await cancelTaskReminders(taskToRemove?.notification_ids || taskToRemove?.notification_id);
    await deleteTask(id);
    await loadTasks();
  };
  const toggleTaskDone = async (task, selectedDay) => {
    const dateStr = formatDateLocal(selectedDay);
    if (task.repeat_mode !== "none") {
      const occ = await getOccurrence(task.id, dateStr);
      const newDone = occ ? !occ.done : true;
      await setOccurrenceDone(task.id, dateStr, newDone);
      const freshTasks = await getAllTasks();
      const freshTask = freshTasks.find(currentTask => currentTask.id === task.id);
      if (freshTask) {
        const rescheduledTask = await rescheduleTaskReminders(freshTask);
        if (rescheduledTask) {
          await updateTask(rescheduledTask);
        }
      }
      await loadTasks();
      return;
    }
    const newDone = !task.done;
    if (newDone) {
      await cancelTaskReminders(task.notification_ids || task.notification_id);
      await updateTask({
        ...task,
        done: true,
        notification_ids: [],
        notification_id: null
      });
      await loadTasks();
      return;
    }
    const reopenedTask = {
      ...task,
      done: false,
      notification_ids: [],
      notification_id: null
    };
    await updateTask(reopenedTask);
    const notificationIds = await scheduleTaskReminders(reopenedTask);
    await updateTask({
      ...reopenedTask,
      notification_ids: notificationIds,
      notification_id: notificationIds[0] ?? null
    });
    await loadTasks();
  };
  const saveCategoryHandler = async cat => {
    const name = cat.name?.trim();
    if (!name) return null;
    let saved;
    if (cat.id) {
      await updateCategory(cat);
      saved = {
        id: cat.id,
        name
      };
    } else {
      saved = await addCategory(name);
    }
    await loadTasks();
    return saved;
  };
  const deleteCategoryHandler = async id => {
    await deleteCategory(id);
    await loadTasks();
  };
  return {
    deleteCategoryHandler,
    addTaskHandler,
    saveEditTaskHandler,
    removeTask,
    toggleTaskDone,
    saveSubtasksHandler,
    toggleSubtaskDone,
    saveCategoryHandler
  };
}
