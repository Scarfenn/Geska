import { useState } from "react";
import { Text, View, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import AllTasks from "./components/AllTasks";
import DaySelector from "./components/DaySelector";
import ThemeSelector from "@/components/ThemeSelector";
import CategoryBar from "./components/CategoryBar";
import TasksModals from "./components/TasksModals";
import useTasksData from "./hooks/useTasksData";
import useTaskEditor from "./hooks/useTaskEditor";
import { selectTasksForDay } from "./domain/taskSelectors";
import useTaskActions from "./hooks/useTaskActions";
export default function TasksScreen({
  themeName,
  mode,
  setThemeName,
  setMode,
  tasksVersion
}) {
  const {
    tasks,
    categories,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    loadError,
    hasLoadedTasks,
    loadTasks,
    setup
  } = useTasksData(tasksVersion);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const editor = useTaskEditor(selectedCategory);
  const {
    activeTaskId,
    setActiveTaskId,
    openModalAdd,
    openModalEdit,
    setActiveModal,
    setModalTaskId
  } = editor;
  const actions = useTaskActions(loadTasks);
  const styles = createStyles(themeName, mode);
  const tasksForRender = selectTasksForDay(tasks, selectedDay, selectedCategory);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}
    >
      <View style={styles.container}>
        <StatusBar
          barStyle={mode === "light" ? "dark-content" : "light-content"}
          backgroundColor={styles.container.backgroundColor}
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
        <CategoryBar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          openEditCategoryModal={editor.openEditCategoryModal}
          openAddCategoryModal={editor.openAddCategoryModal}
          styles={styles}
        />

        {loadError && hasLoadedTasks.current && (
          <View>
            <Text accessibilityRole="alert" style={styles.textSecondary}>{loadError}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={loadTasks} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading and failures are distinct from a genuinely empty day. */}
        {isLoading ? (
          <View style={styles.taskEmptyState}>
            <ActivityIndicator color={styles.text.color} />
            <Text style={styles.taskEmptyDescription}>Cargando tareas…</Text>
          </View>
        ) : loadError && !hasLoadedTasks.current ? (
          <View style={styles.taskEmptyState}>
            <Text accessibilityRole="alert" style={styles.taskEmptyDescription}>{loadError}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={setup} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : <AllTasks
          tasks={tasksForRender}
          toggleTaskDone={(id) => actions.toggleTaskDone(id, selectedDay)}
          toggleSubtaskDone={(id, subtaskId) => actions.toggleSubtaskDone(id, subtaskId, selectedDay)}
          removeTask={actions.removeTask}
          themeName={themeName}
          mode={mode}
          openOptions={(id) => setActiveTaskId(id)}
          activeTaskId={activeTaskId}
          closeOptions={() => setActiveTaskId(null)}
          startEditTask={openModalEdit}
          setActiveModal={setActiveModal}
          setModalTaskId={setModalTaskId}
        />}

        {/* Botón agregar tarea */}
        <TouchableOpacity style={styles.mainButton} onPress={openModalAdd}>
          <Ionicons name="add" size={32} color={styles.saveButtonText.color} />
        </TouchableOpacity>

        {/* Modales */}
        <TasksModals
          editor={editor}
          actions={actions}
          tasks={tasks}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          themeName={themeName}
          mode={mode}
        />
      </View>
    </SafeAreaView>
  );
}
