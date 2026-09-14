import { occursOnDate } from "@/features/tasks/domain/recurrence";
import { formatDateLocal } from "@/features/tasks/domain/taskDates";
function getTaskDoneForDate(task, selectedDay) {
  if (task.repeat_mode === "none") {
    return task.done;
  }
  const dateStr = formatDateLocal(selectedDay);
  const occ = task.occurrences?.find(o => o.date === dateStr);
  return occ ? occ.done : false;
}
function getSubtaskDoneForDate(subtask, selectedDay) {
  const dateStr = formatDateLocal(selectedDay);
  const occurrence = subtask.occurrences?.find(occurrence => occurrence.date === dateStr);
  return occurrence ? occurrence.done : false;
}
export function selectTasksForDay(tasks, selectedDay, selectedCategory) {
  const tasksForSelectedDay = tasks.filter(t => occursOnDate(t, selectedDay));
  const filteredTasks = selectedCategory === "all" ? tasksForSelectedDay : tasksForSelectedDay.filter(t => t.categoryId === selectedCategory);
  const tasksForRender = filteredTasks.map(task => ({
    ...task,
    done: getTaskDoneForDate(task, selectedDay),
    subtasks: (task.subtasks || []).map(subtask => ({
      ...subtask,
      done: task.repeat_mode === "none" ? subtask.done : getSubtaskDoneForDate(subtask, selectedDay)
    }))
  }));
  return tasksForRender;
}
