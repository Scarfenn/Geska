import { useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  initDB,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllTasks,
  saveTask,
  updateTask,
  setOccurrenceDone,
  getOccurrence,
  deleteTask,
  addSubtask,
  deleteSubtask,
  updateSubtaskDone
} from "@/storage/database";

import { scheduleTaskReminder, cancelTaskReminder } from "@/components/notifications";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import AllTasks from "@/features/tasks/components/AllTasks";
import DaySelector from "@/features/tasks/components/DaySelector";
import ThemeSelector from "@/components/ThemeSelector";
import CategoryModal from "@/features/tasks/modals/CategoryModal"
import TaskModal from "@/features/tasks/modals/TaskModal"
import TimeModal from "@/features/tasks/modals/TimeModal"
import AddSubtaskModal from "@/features/tasks/modals/AddSubtaskModal";

export default function TasksScreen({ themeName, mode, setThemeName, setMode, tasksVersion }) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryForTask, setSelectedCategoryForTask] = useState(null);

  const [activeModal, setActiveModal] = useState(null);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  const [taskModalMode, setTaskModalMode] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [modalTaskId, setModalTaskId] = useState(null);
  const [subtaskText, setSubtaskText] = useState("");
  const [activeTaskId, setActiveTaskId] = useState(null);

  const [categoryModalState, setCategoryModalState] = useState({
    visible: false,
    category: null,
    fromTask: false,
  });

  const [timeModalVisible, setTimeModalVisible] = useState(false);

  const [selectedDay, setSelectedDay] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [repeatMode, setRepeatMode] = useState("none");
  const [repeatDays, setRepeatDays] = useState([]);
  const [reminder, setReminder] = useState(0);
  const [endDate, setEndDate] = useState(null);

  const styles = createStyles(themeName, mode);

  function formatDateLocal(date) {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth()+1)
      .toString()
      .padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
  }


  const formatTime = (timeObj) => {
    if (!timeObj) return null;

    const h = timeObj.getHours().toString().padStart(2, "0");
    const m = timeObj.getMinutes().toString().padStart(2, "0");

    return `${h}:${m}`;
  };

  // ======================================================
  // DB SETUP
  // ======================================================

  useEffect(() => {
    const setup = async () => {
      await initDB();
      await loadTasks();
      await loadCategories();
    };
    setup();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [tasksVersion]);

  const loadTasks = async () => {
    const loadedTasks = await getAllTasks();
    setTasks(loadedTasks);
  };

  const loadCategories = async () => {
    const cats = await getAllCategories();
    setCategories([{ id: "all", name: "Todas" }, ...cats]);
    setSelectedCategory((prev) => prev || "all");
  };

  // ======================================================
  // SELECCIÓN TEMPORAL
  // ======================================================

  const handleTimeSelected = (data) => {
    setSelectedDate(data.date);
    setSelectedTime(data.time);
    setRepeatMode(data.repeatMode);
    setRepeatDays(data.repeatDays);
    setReminder(data.reminder);
    setEndDate(data.endDate);
  };

  // ======================================================
  // TAREAS
  // ======================================================

  const addTaskHandler = async (taskData) => {
    const { text, categoryId } = taskData;
    if (!text?.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      title: text.trim(),
      description: null,
      done: false,
      categoryId: categoryId || "all",

      // --- TIEMPO ---
      date: formatDateLocal(selectedDate),
      time: formatTime(selectedTime),
      repeat_mode: repeatMode,
      repeat_days: Array.isArray(repeatDays) ? repeatDays.join(",") : null,
      reminder_minutes: reminder ?? null,
      repeat_end: formatDateLocal(endDate),

      subtasks: [],
    };

    await saveTask(newTask);

    if (newTask.time && newTask.reminder_minutes !== null) {
      const notificationId = await scheduleTaskReminder(newTask);

      if (notificationId) {
        await updateTask({
          ...newTask,
          notification_id: notificationId,
        });
      }
    }

    await loadTasks();
  };

  const handleExternalTaskCreated = async () => {
  await loadTasks();
};

  const saveEditTaskHandler = async (taskData) => {
    if (!taskToEdit) return;

    const { text, categoryId } = taskData;
    if (!text?.trim()) return;

    const updatedTask = {
      id: taskToEdit.id,
      title: text.trim(),
      description: taskToEdit.description || null,
      done: taskToEdit.done ? 1 : 0,
      categoryId: categoryId || taskToEdit.categoryId,

      // --- TIEMPO ---
      date: formatDateLocal(selectedDate),
      time: formatTime(selectedTime),
      repeat_mode: repeatMode,
      repeat_days: Array.isArray(repeatDays) ? repeatDays.join(",") : null,
      reminder_minutes: reminder ?? null,
      repeat_end: formatDateLocal(endDate),
    };

    if (taskToEdit.notification_id) {
      await cancelTaskReminder(taskToEdit.notification_id);
    }

    await updateTask(updatedTask);

    if (updatedTask.time && updatedTask.reminder_minutes !== null) {
      const notificationId = await scheduleTaskReminder(updatedTask);

      if (notificationId) {
        await updateTask({
          ...updatedTask,
          notification_id: notificationId,
        });
      }
    }
    
    await loadTasks();
  };

const removeTask = async (id) => {
  const taskToRemove = tasks.find(t => t.id === id);

  if (taskToRemove?.notification_id) {
    await cancelTaskReminder(taskToRemove.notification_id);
  }

  await deleteTask(id);
  await loadTasks();
};

const toggleTaskDone = async (task, selectedDay) => {
  const dateStr = formatDateLocal(selectedDay);

  if (task.repeat_mode !== "none") {
    const occ = await getOccurrence(task.id, dateStr);

    const newDone = occ ? !occ.done : true;

    await setOccurrenceDone(task.id, dateStr, newDone);
    await loadTasks();
    return;
  }

  await updateTask({
    ...task,
    done: !task.done,
  });

  await loadTasks();
};

function getTaskDoneForDate(task, selectedDay) {
  if (task.repeat_mode === "none") {
    return task.done;
  }

  const dateStr = formatDateLocal(selectedDay);

  const occ = task.occurrences?.find(
    (o) => o.date === dateStr
  );

  return occ ? occ.done : false;
}

  function parseTimeString(timeStr) {
    if (!timeStr) return null;

    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  function timeToMinutes(time) {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }



  // ======================================================
  // FILTRO POR DÍA + CATEGORÍA
  // ======================================================

  const tasksForSelectedDay = tasks.filter((t) =>
    doesTaskOccurOnDate(t, selectedDay)
  );


  const filteredTasks =
    selectedCategory === "all"
      ? tasksForSelectedDay
      : tasksForSelectedDay.filter((t) => t.categoryId === selectedCategory);

const tasksForRender = filteredTasks
  .map((task) => ({
    ...task,
    done: getTaskDoneForDate(task, selectedDay),
  }))
  .sort((a, b) => {
    const aTime = timeToMinutes(a.time);
    const bTime = timeToMinutes(b.time);

    if (aTime === null && bTime === null) return 0;

    if (aTime === null) return 1;

    if (bTime === null) return -1;

    return aTime - bTime;
  });


  // ======================================================
  // SUBTAREAS
  // ======================================================

  const addSubtaskToDB = async (taskId, text) => {
    if (!text?.trim()) return;
    await addSubtask(taskId, text);
    await loadTasks();
  };

  const removeSubtaskHandler = async (taskId, subtaskId) => {
    await deleteSubtask(subtaskId);
    await loadTasks();
  };

const toggleSubtaskDone = async (taskId, subtaskId) => {
  const task = tasks.find(t => t.id === taskId);
  const sub = task.subtasks.find(s => s.id === subtaskId);

  await updateSubtaskDone(subtaskId, !sub.done);
  await loadTasks();
};


  // ======================================================
  // CATEGORÍAS
  // ======================================================

  const saveCategoryHandler = async (cat) => {
    const name = cat.name?.trim();
    if (!name) return null;

    let saved;

    if (cat.id) {
      await updateCategory(cat);
      saved = { id: cat.id, name };
    } else {
      saved = await addCategory(name);
    }

    await loadCategories();
    return saved;
  };

  // ======================================================
  // MODALES
  // ======================================================

  const openModalAdd = () => {
  const now = new Date();

  setSelectedDate(now);
  setSelectedTime(null);
  setRepeatMode("none");
  setRepeatDays([]);
  setReminder(null);
  setEndDate(null);

  if (selectedCategory && selectedCategory !== "all") {
    setSelectedCategoryForTask(selectedCategory);
  } else {
    setSelectedCategoryForTask(null);
  }

  setTaskToEdit(null);
  setTaskModalMode("add");
  setTaskModalVisible(true);
};


  const openModalEdit = (task) => {
    setTaskToEdit(task);
    setModalTaskId(task.id);
    setTaskModalMode("edit");

    // Pre-cargar valores de tiempo de la tarea
    setSelectedDate(task.date ? parseLocalDateString(task.date) : new Date());
    setSelectedTime(parseTimeString(task.time));
    setRepeatMode(task.repeat_mode || "none");
    setRepeatDays(
      task.repeat_days ? task.repeat_days.split(",") : []
    );
    setReminder(task.reminder_minutes ?? null);
    setEndDate(task.repeat_end ? new Date(task.repeat_end) : null);

    setTaskModalVisible(true);
  };

  const openAddCategoryModal = () => {
    setCategoryModalState({
      visible: true,
      category: null,
      fromTask: false,
    });
  };

  const openEditCategoryModal = (cat) => {
    setCategoryModalState({
      visible: true,
      category: cat,
      fromTask: false,
    });
  };

  const openAddCategoryFromTask = () => {
    setCategoryModalState({
      visible: true,
      category: null,
      fromTask: true,
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

  // ======================================================
  // SELECTOR DE DÍA GLOBAL
  // ======================================================

  const daysShort = ["L", "M", "X", "J", "V", "S", "D"];

  const getWeekDays = (date) => {
    const result = [];
    const base = new Date(date);
    base.setHours(0, 0, 0, 0);
    const day = base.getDay(); // 0=Dom, 1=Lun...

    const mondayOffset = day === 0 ? -6 : 1 - day; // Lunes como inicio

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + mondayOffset + i);
      result.push(d);
    }
    return result;
  };
  
  // ==========================================
  // FILTRO DE REPETICIÓN
  // ==========================================

  function parseLocalDateString(str) {
    if (!str) return null;
    const [year, month, day] = str.split("-").map(Number);
    // Año, mes (0-based), día → fecha local sin UTC raro
    return new Date(year, month - 1, day);
  }

  function doesTaskOccurOnDate(task, selectedDay) {
    const taskDate = parseLocalDateString(task.date);
    const viewDate = new Date(selectedDay);

    if (!taskDate) return false;

    taskDate.setHours(0,0,0,0);
    viewDate.setHours(0,0,0,0);

    const diffDays = Math.floor((viewDate - taskDate) / 86400000);

    const repeatMode = task.repeat_mode || "none";
    const repeatDays = task.repeat_days
      ? task.repeat_days.split(",")
      : [];

    // SIN REPETICIÓN
    if (repeatMode === "none") {
      return diffDays === 0;
    }

    // DIARIO
    if (repeatMode === "daily") {
      return diffDays >= 0;
    }

    // SEMANAL
    if (repeatMode === "weekly") {
      const days = ["L", "M", "X", "J", "V", "S", "D"];
      const weekdayLetter = days[(viewDate.getDay() + 6) % 7];

      if (!repeatDays.length) {
      const baseLetter = days[(taskDate.getDay() + 6) % 7];
      return weekdayLetter === baseLetter && diffDays >= 0;
    }
      if (!repeatDays.includes(weekdayLetter)) return false;
    }

    return false;
  }


  // ======================================================
  // RENDER
  // ======================================================

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}
    >
      <View style={styles.container}>
        <StatusBar
          barStyle={mode === "light" ? "dark-content" : "light-content"}
          backgroundColor={mode === "light" ? "#fff" : "#111"}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            <Ionicons name="time-outline" size={22} color={styles.title.color} />{" "}
            Tu día
          </Text>
          
          {/* Selector de Tema */}
          <ThemeSelector
            themeName={themeName}
            mode={mode}
            setThemeName={setThemeName}
            setMode={setMode}
          />
        </View>

        {/* Selector de Día */}
        <DaySelector 
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          theme={themes[themeName][mode]}
          mode={mode}
        />

        {/* Barra de categorías */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 10,
            alignItems: "center",
          }}
          style={{ maxHeight: 50 }}
        >
          {categories.map((cat) => {
            const activeCategory = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                onLongPress={() =>
                  cat.id !== "all" && openEditCategoryModal(cat)
                }
                style={{
                  ...styles.categoryContainer,
                  backgroundColor: activeCategory
                    ? styles.categoryContainer.activeColor
                    : styles.categoryContainer.inactiveColor,
                }}
              >
                <Text
                  style={
                    activeCategory
                      ? styles.categoryTextActive
                      : styles.categoryTextInactive
                  }
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={openAddCategoryModal}>
            <Ionicons name="add" size={20} color={styles.text.color} />
          </TouchableOpacity>
        </ScrollView>

        {/* Lista de tareas */}
        <AllTasks
          tasks={tasksForRender}
          toggleTaskDone={(taskId) => {
            const taskObj = tasks.find((t) => t.id === taskId);
            if (!taskObj) return;
            toggleTaskDone(taskObj, selectedDay);
          }}
          toggleSubtaskDone={toggleSubtaskDone}
          removeTask={removeTask}
          removeSubtask={removeSubtaskHandler}
          themeName={themeName}
          mode={mode}
          openOptions={(id) => setActiveTaskId(id)}
          activeTaskId={activeTaskId}
          closeOptions={() => setActiveTaskId(null)}
          startEditTask={openModalEdit}
          setActiveModal={setActiveModal}
          setModalTaskId={setModalTaskId}
        />

        {/* Botón agregar tarea */}
        <TouchableOpacity style={styles.mainButton} onPress={openModalAdd}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Modales */}
        <TaskModal
          visible={taskModalVisible}
          themeName={themeName}
          mode={mode}
          taskToEdit={taskModalMode === "edit" ? taskToEdit : null}
          categories={categories.filter((c) => c.id !== "all")}
          selectedCategoryForTask={selectedCategoryForTask}
          clearSelectedCategoryForTask={() => setSelectedCategoryForTask(null)}
          openTimeModal={() => setTimeModalVisible(true)}
          openAddCategoryModal={openAddCategoryFromTask}
          saveTask={(taskData) => {
            if (taskModalMode === "add") addTaskHandler(taskData);
            else if (taskModalMode === "edit") saveEditTaskHandler(taskData);
            setSelectedCategoryForTask(null);
            closeTaskModal();
          }}
          closeModal={() => {
            setSelectedCategoryForTask(null);
            closeTaskModal();
          }}
        />

        <TimeModal
          visible={timeModalVisible}
          themeName={themeName}
          mode={mode}
          onTimeSelected={handleTimeSelected}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          repeatMode={repeatMode}
          setRepeatMode={setRepeatMode}
          repeatDays={repeatDays}
          setRepeatDays={setRepeatDays}
          reminder={reminder}
          setReminder={setReminder}
          endDate={endDate}
          setEndDate={setEndDate}
          closeModal={() => setTimeModalVisible(false)}
        />

        <AddSubtaskModal
          visible={activeModal === "subtask"}
          themeName={themeName}
          mode={mode}
          modalTaskId={modalTaskId}
          subtaskText={subtaskText}
          setSubtaskText={setSubtaskText}
          addSubtask={addSubtaskToDB}
          closeModal={closeModal}
        />

        <CategoryModal
          visible={categoryModalState.visible}
          themeName={themeName}
          mode={mode}
          categoryToEdit={categoryModalState.category}
          saveCategory={async (cat) => {
            const saved = await saveCategoryHandler(cat);
            if (!saved) {
              setCategoryModalState({
                visible: false,
                category: null,
                fromTask: false,
              });
              return;
            }

            if (categoryModalState.fromTask) {
              setSelectedCategoryForTask(saved.id);
            }

            setCategoryModalState({
              visible: false,
              category: null,
              fromTask: false,
            });
          }}
          deleteCategory={async (id) => {
            await deleteCategory(id);
            await loadCategories();
            if (selectedCategory === id) {
              setSelectedCategory("all");
            }
            setCategoryModalState({
              visible: false,
              category: null,
              fromTask: false,
            });
          }}
          closeModal={() => {
            setCategoryModalState({
              visible: false,
              category: null,
              fromTask: false,
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}
