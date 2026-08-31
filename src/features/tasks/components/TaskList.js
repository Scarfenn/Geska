import {
  FlatList,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import createStyles from "@/styles/styles";
import TaskCard from "./TaskCard";

function timeToMinutes(time) {
  if (!time) return null;

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function sortTasksChronologically(tasks) {
  return [...tasks].sort((a, b) => {
    const aMinutes = timeToMinutes(a.time);
    const bMinutes = timeToMinutes(b.time);

    if (aMinutes === null && bMinutes === null) {
      return 0;
    }

    if (aMinutes === null) return 1;
    if (bMinutes === null) return -1;

    return aMinutes - bMinutes;
  });
}

export default function TaskList({
  tasks,
  toggleTaskDone,
  toggleSubtaskDone,
  removeTask,
  themeName,
  mode,
  activeTaskId,
  setModalTaskId,
  openOptions,
  closeOptions,
  startEditTask,
  setActiveModal,
}) {
  const styles = createStyles(
    themeName,
    mode
  );

  const sortedTasks =
    sortTasksChronologically(tasks);

  const emptyState = (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
      }}
    >
      <Ionicons
        name="document-text-outline"
        size={85}
        color={
          styles.categoryContainer
            .inactiveColor
        }
        style={{ marginBottom: 15 }}
      />

      <Text
        style={{
          textAlign: "center",
          fontSize: 18,
          color:
            mode === "light"
              ? "#444"
              : "#ccc",
          fontWeight: "600",
        }}
      >
        ¡No tienes ninguna tarea!
      </Text>

      <Text
        style={{
          textAlign: "center",
          fontSize: 14,
          color:
            mode === "light"
              ? "#666"
              : "#aaa",
          marginTop: 8,
        }}
      >
        Añade una con el botón{" "}
        <Ionicons
          name="add-circle-outline"
          size={17}
          color={
            mode === "light"
              ? "#666"
              : "#aaa"
          }
        />
      </Text>
    </View>
  );

  return (
    <TouchableWithoutFeedback
      onPress={closeOptions}
    >
      <View style={{ flex: 1 }}>
        {sortedTasks.length === 0 ? (
          emptyState
        ) : (
          <FlatList
            data={sortedTasks}
            keyExtractor={(item) =>
              String(item.id)
            }
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                toggleTaskDone={
                  toggleTaskDone
                }
                toggleSubtaskDone={
                  toggleSubtaskDone
                }
                removeTask={removeTask}
                themeName={themeName}
                mode={mode}
                isMenuOpen={
                  activeTaskId === item.id
                }
                openOptions={openOptions}
                closeOptions={closeOptions}
                setModalTaskId={
                  setModalTaskId
                }
                startEditTask={startEditTask}
                setActiveModal={
                  setActiveModal
                }
              />
            )}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
