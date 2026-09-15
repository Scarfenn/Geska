import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import { initDB, getAllTasks, getAllCategories, updateTaskNotificationIds } from "@/storage/database";
import { syncTaskReminders } from "@/features/tasks/services/notifications";
export default function useTasksData(tasksVersion) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const loadRequest = useRef(0);
  const synchronization = useRef(null);
  const mounted = useRef(false);
  const hasLoadedTasks = useRef(false);
  const previousTasksVersion = useRef(tasksVersion);
  const loadTasks = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoadError(null);
    try {
      await initDB();
      const [loadedTasks, cats] = await Promise.all([getAllTasks(), getAllCategories()]);
      if (!mounted.current || request !== loadRequest.current) return null;
      hasLoadedTasks.current = true;
      setTasks(loadedTasks);
      setCategories([{
        id: "all",
        name: "Todas"
      }, ...cats]);
      setSelectedCategory(current => current === "all" || cats.some(cat => cat.id === current) ? current : "all");
      setIsLoading(false);
      return loadedTasks;
    } catch (error) {
      console.error("No se pudieron cargar las tareas", error);
      if (mounted.current && request === loadRequest.current) {
        setLoadError("No se pudieron cargar tus tareas. Inténtalo de nuevo.");
        setIsLoading(false);
      }
      return null;
    }
  }, []);
  const setup = useCallback(() => {
    if (synchronization.current) return synchronization.current;
    const operation = (async () => {
      if (!hasLoadedTasks.current) setIsLoading(true);
      // Publish the view before notifications: permissions or scheduling failures
      // must never hide tasks or prevent category initialization.
      const loadedTasks = await loadTasks();
      if (!loadedTasks || !mounted.current) return;
      try {
        await syncTaskReminders(getAllTasks, updateTaskNotificationIds);
        if (mounted.current) await loadTasks();
      } catch (error) {
        console.error("No se pudieron sincronizar los recordatorios", error);
      }
    })();
    synchronization.current = operation;
    operation.finally(() => { if (synchronization.current === operation) synchronization.current = null; });
    return operation;
  }, [loadTasks]);
  useEffect(() => {
    mounted.current = true;
    setup();
    const subscription = DeviceEventEmitter.addListener("tasks-updated", loadTasks);
    let previousState = AppState.currentState;
    const appStateSubscription = AppState.addEventListener("change", state => {
      const resumed = state === "active" && previousState !== "active";
      previousState = state;
      if (resumed && mounted.current) setup();
    });
    return () => {
      mounted.current = false;
      ++loadRequest.current;
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [loadTasks, setup]);
  useEffect(() => {
    if (previousTasksVersion.current === tasksVersion) return;
    previousTasksVersion.current = tasksVersion;
    loadTasks();
  }, [tasksVersion, loadTasks]);
  return {
    tasks,
    categories,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    loadError,
    hasLoadedTasks,
    loadTasks,
    setup
  };
}
