import { useState } from "react";
import { parseLocalDate } from "@/features/tasks/domain/recurrence";
import { parseTimeString } from "@/features/tasks/domain/taskDates";
import { reminderFromTask } from "@/features/tasks/services/reminderModel";
export default function useTaskEditor(selectedCategory) {
  const [selectedCategoryForTask, setSelectedCategoryForTask] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [modalTaskId, setModalTaskId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [categoryModalState, setCategoryModalState] = useState({
    visible: false,
    category: null,
    fromTask: false
  });
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [schedule, setSchedule] = useState({
    selectedDate: new Date(),
    selectedTime: null,
    repeatMode: "none",
    repeatDays: [],
    repeatInterval: 1,
    reminder: null,
    endDate: null
  });
  const handleTimeSelected = data => setSchedule({
    selectedDate: data.date,
    selectedTime: data.time,
    repeatMode: data.repeatMode,
    repeatDays: data.repeatDays,
    repeatInterval: data.repeatInterval || 1,
    reminder: data.reminder,
    endDate: data.endDate
  });
  const openModalAdd = () => {
    const now = new Date();
    setSchedule({
      selectedDate: now,
      selectedTime: null,
      repeatMode: "none",
      repeatDays: [],
      repeatInterval: 1,
      reminder: null,
      endDate: null
    });
    if (selectedCategory && selectedCategory !== "all") {
      setSelectedCategoryForTask(selectedCategory);
    } else {
      setSelectedCategoryForTask(null);
    }
    setTaskToEdit(null);
    setTaskModalMode("add");
    setTaskModalVisible(true);
  };
  const openModalEdit = task => {
    setTaskToEdit(task);
    setModalTaskId(task.id);
    setTaskModalMode("edit");
    setSchedule({
      selectedDate: task.date ? parseLocalDate(task.date) : new Date(),
      selectedTime: parseTimeString(task.time),
      repeatMode: task.repeat_mode || "none",
      repeatDays: task.repeat_days ? task.repeat_days.split(",") : [],
      repeatInterval: task.repeat_interval || 1,
      reminder: reminderFromTask(task),
      endDate: task.repeat_end ? parseLocalDate(task.repeat_end) : null
    });
    setTaskModalVisible(true);
  };
  const openAddCategoryModal = () => {
    setCategoryModalState({
      visible: true,
      category: null,
      fromTask: false
    });
  };
  const openEditCategoryModal = cat => {
    setCategoryModalState({
      visible: true,
      category: cat,
      fromTask: false
    });
  };
  const openAddCategoryFromTask = () => {
    setCategoryModalState({
      visible: true,
      category: null,
      fromTask: true
    });
  };
  const closeTaskModal = () => {
    setTaskModalVisible(false);
    setTaskToEdit(null);
    setSelectedCategoryForTask(null);
  };
  const closeModal = () => {
    setActiveModal(null);
    setTaskToEdit(null);
    setModalTaskId(null);
  };
  return {
    selectedCategoryForTask,
    setSelectedCategoryForTask,
    activeModal,
    setActiveModal,
    taskModalVisible,
    taskModalMode,
    taskToEdit,
    modalTaskId,
    setModalTaskId,
    activeTaskId,
    setActiveTaskId,
    categoryModalState,
    setCategoryModalState,
    timeModalVisible,
    setTimeModalVisible,
    schedule,
    handleTimeSelected,
    openModalAdd,
    openModalEdit,
    openAddCategoryModal,
    openEditCategoryModal,
    openAddCategoryFromTask,
    closeTaskModal,
    closeModal
  };
}
