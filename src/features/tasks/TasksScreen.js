import { occursOnDate, parseLocalDate } from "@/features/tasks/domain/recurrence";
import { useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  DeviceEventEmitter,
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
  updateSubtaskText,
  updateSubtaskOrder,
  deleteSubtask,
  updateSubtaskDone,
  setSubtaskOccurrenceDone,
} from "@/storage/database";

import {
  scheduleTaskReminders,
  cancelTaskReminders,
  syncTaskReminders,
  rescheduleTaskReminders,
} from "@/features/tasks/services/notifications";

import {
  applyReminderToTask,
  reminderFromTask,
} from "@/features/tasks/services/reminderModel";

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
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [reminder, setReminder] = useState(null);
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

      const loadedTasks =
        await getAllTasks();

      await syncTaskReminders(
        loadedTasks,
        updateTask
      );

      await loadTasks();
      await loadCategories();
    };

    setup();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [tasksVersion]);

  const loadTasks = async () => {
    try {
      const loadedTasks =
        await getAllTasks();

      setTasks(loadedTasks);
    } catch (error) {
      console.error(
        "No se pudieron cargar las tareas",
        error
      );
    }
  };

  const loadCategories = async () => {
    const cats = await getAllCategories();
    setCategories([{ id: "all", name: "Todas" }, ...cats]);
    setSelectedCategory((prev) => prev || "all");
  };

  useEffect(() => {
    const subscription =
      DeviceEventEmitter.addListener(
        "tasks-updated",
        () => {
          loadTasks();
        }
      );

    return () => subscription.remove();
  }, []);

  // ======================================================
  // SELECCIÓN TEMPORAL
  // ======================================================

  const handleTimeSelected = (data) => {
    setSelectedDate(data.date);
    setSelectedTime(data.time);
    setRepeatMode(data.repeatMode);
    setRepeatDays(data.repeatDays);
    setRepeatInterval(data.repeatInterval || 1);
    setReminder(data.reminder);
    setEndDate(data.endDate);
  };

  // ======================================================
  // TAREAS
  // ======================================================

  const addTaskHandler = async (taskData) => {
    const { text, categoryId, subtasks = [] } = taskData;
    if (!text?.trim()) return;

    const newTask =
      applyReminderToTask(
        {
          id: Date.now().toString(),
          title: text.trim(),
          description: null,
          done: false,
          categoryId:
            categoryId ?? null,

          // --- TIEMPO ---
          date:
            formatDateLocal(
              selectedDate
            ),

          time:
            formatTime(
              selectedTime
            ),

          repeat_mode:
            repeatMode,

          repeat_days:
            Array.isArray(repeatDays)
              ? repeatDays.join(",")
              : null,

          repeat_interval:
            repeatInterval || 1,

          repeat_end:
            formatDateLocal(
              endDate
            ),

          notification_ids: [],
          notification_id: null,

          subtasks: [],
        },
        reminder
      );

    await saveTask(newTask);
    
    for (const subtask of subtasks) {
      if (!subtask.text?.trim()) {
        continue;
      }

      await addSubtask(
        newTask.id,
        subtask.text.trim()
      );
    };

    const notificationIds =
      await scheduleTaskReminders(
        newTask
      );

    if (notificationIds.length) {
      await updateTask({
        ...newTask,

        notification_ids:
          notificationIds,

        notification_id:
          notificationIds[0],
      });
    }

    await loadTasks();
  };
  
  /* Creación de tareas mediante otro módulo - Sin utilizar - Uso futuro */
  const handleExternalTaskCreated = async () => {
    await loadTasks();
  };

  const saveEditTaskHandler = async (taskData) => {
    if (!taskToEdit) return;

    const { text, categoryId, subtasks = [] } = taskData;
    if (!text?.trim()) return;

    const updatedTask =
      applyReminderToTask(
        {
          ...taskToEdit,

          id: taskToEdit.id,
          title: text.trim(),

          description:
            taskToEdit.description ||
            null,

          done:
            taskToEdit.done
              ? 1
              : 0,

          categoryId: categoryId ?? null,

          // --- TIEMPO ---
          date:
            formatDateLocal(
              selectedDate
            ),

          time:
            formatTime(
              selectedTime
            ),

          repeat_mode:
            repeatMode,

          repeat_days:
            Array.isArray(repeatDays)
              ? repeatDays.join(",")
              : null,

          repeat_end:
            formatDateLocal(
              endDate
            ),

          repeat_interval:
            repeatInterval || 1,

          notification_ids: [],
          notification_id: null,
        },
        reminder
      );

    await cancelTaskReminders(
      taskToEdit.notification_ids ||
        taskToEdit.notification_id
    );

    await updateTask(updatedTask);
    await saveSubtasksHandler(
      updatedTask.id,
      subtasks,
      false
    );

    const notificationIds =
      await scheduleTaskReminders(
        updatedTask
      );

    await updateTask({
      ...updatedTask,

      notification_ids:
        notificationIds,

      notification_id:
        notificationIds[0] ??
        null,
    });

    await loadTasks();
  };

const removeTask = async (id) => {
  const taskToRemove =
    tasks.find(
      (task) => task.id === id
    );

  await cancelTaskReminders(
    taskToRemove?.notification_ids ||
      taskToRemove?.notification_id
  );

  await deleteTask(id);
  await loadTasks();
};

const toggleTaskDone = async (
  task,
  selectedDay
) => {
  const dateStr =
    formatDateLocal(
      selectedDay
    );

  if (
    task.repeat_mode !== "none"
  ) {
    const occ =
      await getOccurrence(
        task.id,
        dateStr
      );

    const newDone =
      occ
        ? !occ.done
        : true;

    await setOccurrenceDone(
      task.id,
      dateStr,
      newDone
    );

    const freshTasks =
      await getAllTasks();

    const freshTask =
      freshTasks.find(
        (currentTask) =>
          currentTask.id ===
          task.id
      );

    if (freshTask) {
      const rescheduledTask =
        await rescheduleTaskReminders(
          freshTask
        );

      if (rescheduledTask) {
        await updateTask(
          rescheduledTask
        );
      }
    }

    await loadTasks();
    return;
  }

  const newDone =
    !task.done;

  if (newDone) {
    await cancelTaskReminders(
      task.notification_ids ||
        task.notification_id
    );

    await updateTask({
      ...task,
      done: true,
      notification_ids: [],
      notification_id: null,
    });

    await loadTasks();
    return;
  }

  const reopenedTask = {
    ...task,
    done: false,
    notification_ids: [],
    notification_id: null,
  };

  await updateTask(
    reopenedTask
  );

  const notificationIds =
    await scheduleTaskReminders(
      reopenedTask
    );

  await updateTask({
    ...reopenedTask,

    notification_ids:
      notificationIds,

    notification_id:
      notificationIds[0] ??
      null,
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

function getSubtaskDoneForDate(
  subtask,
  selectedDay
) {
  const dateStr =
    formatDateLocal(
      selectedDay
    );

  const occurrence =
    subtask.occurrences?.find(
      (occurrence) =>
        occurrence.date ===
        dateStr
    );

  return occurrence
    ? occurrence.done
    : false;
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
    occursOnDate(t, selectedDay)
  );


  const filteredTasks =
    selectedCategory === "all"
      ? tasksForSelectedDay
      : tasksForSelectedDay.filter((t) => t.categoryId === selectedCategory);

const tasksForRender =
  filteredTasks
    .map((task) => ({
      ...task,

      done:
        getTaskDoneForDate(
          task,
          selectedDay
        ),

      subtasks:
        (task.subtasks || []).map(
          (subtask) => ({
            ...subtask,

            done:
              task.repeat_mode ===
              "none"
                ? subtask.done
                : getSubtaskDoneForDate(
                    subtask,
                    selectedDay
                  ),
          })
        ),
    }))


  // ======================================================
  // SUBTAREAS
  // ======================================================

  const saveSubtasksHandler = async (
    taskId,
    draftSubtasks,
    reload = true
  ) => {
    const task =
      tasks.find(
        (task) =>
          task.id === taskId
      );

    if (!task) return;

    const originalSubtasks =
      task.subtasks || [];

    const originalMap =
      new Map(
        originalSubtasks.map(
          (subtask) => [
            String(subtask.id),
            subtask,
          ]
        )
      );

    const existingDraftIds =
      new Set(
        draftSubtasks
          .filter(
            (subtask) =>
              !subtask.isNew
          )
          .map(
            (subtask) =>
              String(subtask.id)
          )
      );

    // ELIMINADAS
    for (const original of originalSubtasks) {
      if (
        !existingDraftIds.has(
          String(original.id)
        )
      ) {
        await deleteSubtask(
          original.id
        );
      }
    }

    // NUEVAS / EDITADAS / REORDENADAS
    for (const subtask of draftSubtasks) {
      const text =
        subtask.text.trim();

      if (!text) continue;

      const original =
        originalMap.get(
          String(subtask.id)
        );

      if (
        subtask.isNew ||
        !original
      ) {
        await addSubtask(
          taskId,
          text,
          subtask.sort_order
        );

        continue;
      }

      if (
        original.text !== text
      ) {
        await updateSubtaskText(
          subtask.id,
          text
        );
      }

      if (
        original.sort_order !==
        subtask.sort_order
      ) {
        await updateSubtaskOrder(
          subtask.id,
          subtask.sort_order
        );
      }
    }

    if (reload) {
      await loadTasks();
    }
  };

const toggleSubtaskDone =
  async (
    taskId,
    subtaskId
  ) => {
    const task =
      tasks.find(
        (task) =>
          task.id === taskId
      );

    if (!task) return;

    const subtask =
      task.subtasks?.find(
        (subtask) =>
          subtask.id ===
          subtaskId
      );

    if (!subtask) return;

    // TAREA NORMAL
    if (
      task.repeat_mode ===
      "none"
    ) {
      await updateSubtaskDone(
        subtaskId,
        !subtask.done
      );

      await loadTasks();
      return;
    }

    // TAREA REPETITIVA
    const dateStr =
      formatDateLocal(
        selectedDay
      );

    const occurrence =
      subtask.occurrences?.find(
        (occurrence) =>
          occurrence.date ===
          dateStr
      );

    const newDone =
      occurrence
        ? !occurrence.done
        : true;

    await setSubtaskOccurrenceDone(
      subtaskId,
      dateStr,
      newDone
    );

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
  setRepeatInterval(1);
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
    setSelectedDate(task.date ? parseLocalDate(task.date) : new Date());
    setSelectedTime(parseTimeString(task.time));
    setRepeatMode(task.repeat_mode || "none");
    setRepeatDays(
      task.repeat_days ? task.repeat_days.split(",") : []
    );
    setRepeatInterval(task.repeat_interval || 1);
    setReminder(
      reminderFromTask(task)
    );
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
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          repeatMode={repeatMode}
          reminder={reminder}
          endDate={endDate}
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
          selectedTime={selectedTime}

          repeatMode={repeatMode}
          repeatDays={repeatDays}
          repeatInterval={repeatInterval}
          reminder={reminder}
          endDate={endDate}
          closeModal={() => setTimeModalVisible(false)}
        />

        <AddSubtaskModal
          visible={activeModal === "subtask"}
          themeName={themeName}
          mode={mode}
          modalTaskId={modalTaskId}
          subtasks={tasks.find(
              (task) =>
                task.id ===
                modalTaskId
            )?.subtasks || []
          }
          onSave={(draftSubtasks) =>
            saveSubtasksHandler(
              modalTaskId,
              draftSubtasks
            )
          }
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
