import { getLocalRevision, assertLocalAccess } from "@/storage/sqlite/restoreMaintenance";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { createTaskActions } from "@/features/tasks/services/taskMutations";

const commands = createTaskActions();

export default function useTaskActions(loadTasks) {
  const revision = useRef(getLocalRevision());
  const inFlight = useRef(new Map());
  const mounted = useRef(true);
  const [pending, setPending] = useState({});
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Register the promise synchronously, before calling the command. A second
  // press shares it even before React has rendered the disabled save button.
  function run(key, action) {
    if (inFlight.current.has(key)) return inFlight.current.get(key);
    if (mounted.current) setPending(current => ({ ...current, [key]: true }));
    const result = Promise.resolve().then(() => { assertLocalAccess(revision.current); return action(); }).then(async result => {
      // A refresh failure must never turn an already committed save into a
      // failed submission. useTasksData normally exposes its own load error.
      try { await loadTasks(); }
      catch (error) { console.error("No se pudo actualizar la lista", error); }
      if (mounted.current && ["failed", "permission-denied"].includes(result?.reminders?.status)) {
        Alert.alert(result.status === "deleted" ? "Tarea eliminada" : "Tarea guardada",
          result.reminders.status === "permission-denied"
            ? "Activa el permiso de notificaciones en la configuración del sistema para recibir recordatorios."
            : "No se pudieron actualizar sus recordatorios. Se reintentará al reiniciar la aplicación.");
      }
      return result;
    }).finally(() => {
      inFlight.current.delete(key);
      if (mounted.current) setPending(current => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    });
    inFlight.current.set(key, result);
    return result;
  }

  async function interact(key, action) {
    try { return await run(key, action); }
    catch (error) {
      console.error("No se pudo actualizar la tarea", error);
      if (mounted.current) Alert.alert("No se pudo actualizar", "Inténtalo de nuevo.");
    }
  }

  return {
    isTaskSaving: !!pending["task-editor"],
    isSubtaskSaving: !!pending["subtask-editor"],
    isCategorySaving: !!pending["category-editor"],
    addTaskHandler: (data, schedule) => run("task-editor", () => commands.addTaskHandler(data, schedule)),
    saveEditTaskHandler: (data, task, schedule) => run("task-editor", () => commands.saveEditTaskHandler(data, task, schedule)),
    saveSubtasksHandler: (id, drafts) => run("subtask-editor", () => commands.saveSubtasksHandler(id, drafts)),
    saveCategoryHandler: category => run("category-editor", () => commands.saveCategoryHandler(category)),
    deleteCategoryHandler: id => run("category-editor", () => commands.deleteCategoryHandler(id)),
    toggleTaskDone: (id, date) => interact(`task:${id}`, () => commands.toggleTaskDone(id, date)),
    toggleSubtaskDone: (id, subtaskId, date) => interact(`subtask:${subtaskId}`, () => commands.toggleSubtaskDone(id, subtaskId, date)),
    removeTask: id => interact(`delete:${id}`, () => commands.removeTask(id)),
  };
}
