import * as commands from "@/features/tasks/services/taskCommands";

// Compatibility names for existing modal props. No React state or task snapshot
// is captured here; all commands read current state within their transaction.
export function createTaskActions() {
  return {
    addTaskHandler: (data, schedule) => commands.createTask({ ...data, schedule }),
    saveEditTaskHandler: (data, task, schedule) => commands.editTask(task.id, { ...data, schedule }),
    saveSubtasksHandler: commands.saveTaskSubtasks,
    toggleTaskDone: (taskOrId, date) => commands.toggleTaskDone(taskOrId?.id ?? taskOrId, date),
    toggleSubtaskDone: commands.toggleSubtaskDone,
    removeTask: commands.removeTask,
    saveCategoryHandler: commands.saveCategory,
    deleteCategoryHandler: commands.removeCategory,
  };
}
