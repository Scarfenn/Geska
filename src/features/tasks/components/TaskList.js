import { themes } from "@/styles/themes";
import {
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { LinearTransition } from "react-native-reanimated";

import getTaskListStyles from "@/features/tasks/styles/taskListStyles";
import TaskCard from "@/features/tasks/components/TaskCard";

const taskLayoutTransition = LinearTransition.duration(250);

function timeToMinutes(time) {
  if (!time) return null;

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function sortTasksChronologically(tasks) {
  return [...tasks].sort((a, b) => {
    const completionOrder = Number(Boolean(a.done)) - Number(Boolean(b.done));
    if (completionOrder !== 0) return completionOrder;

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
  const theme = themes[themeName][mode];
  const styles = getTaskListStyles(
    themeName,
    mode
  );

  const sortedTasks =
    sortTasksChronologically(tasks);

  const emptyState = (
    <View
      style={styles.taskEmptyState}
    >
      <Ionicons
        name="document-text-outline"
        size={85}
        color={
          theme.inactiveCategory
        }
        style={styles.taskEmptyIcon}
      />

      <Text
        style={styles.taskEmptyTitle}
      >
        ¡No tienes ninguna tarea!
      </Text>

      <Text
        style={styles.taskEmptyDescription}
      >
        Añade una con el botón{" "}
        <Ionicons
          name="add-circle-outline"
          size={17}
          color={styles.taskEmptyDescription.color}
        />
      </Text>
    </View>
  );

  return (
    <TouchableWithoutFeedback
      onPress={closeOptions}
    >
      <View style={styles.fill}>
        {sortedTasks.length === 0 ? (
          emptyState
        ) : (
          <Animated.FlatList
            data={sortedTasks}
            itemLayoutAnimation={taskLayoutTransition}
            keyExtractor={(item) =>
              String(item.id)
            }
            contentContainerStyle={styles.taskListContent}
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
