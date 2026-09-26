import { themes } from "@/styles/themes";
import { useRef, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import getTaskCardStyles from "@/features/tasks/styles/taskCardStyles";

export default function TaskCard({
  task,
  toggleTaskDone,
  toggleSubtaskDone,
  themeName,
  mode,
  openOptions,
}) {
  const theme = themes[themeName][mode];
  const styles = getTaskCardStyles(themeName, mode);

  const [collapsed, setCollapsed] = useState(false);
  const headerRef = useRef(null);

  const subtasks = task.subtasks || [];
  const totalSubtasks = subtasks.length;
  const doneSubtasks = subtasks.filter(
    (subtask) => subtask.done
  ).length;

  const showOptions = () => {
    headerRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) openOptions(task.id, { x, y, width, height });
    });
  };

  return (
    <View style={styles.taskCardContainer}>
      <View ref={headerRef} collapsable={false} style={styles.taskCardHeader}>
        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.task}
          onPress={() => toggleTaskDone(task.id)}
          onLongPress={showOptions}
        >
          <Ionicons
            name={
              task.done
                ? "checkmark-circle"
                : "ellipse-outline"
            }
            size={24}
            color={
              task.done
                ? theme.doneCheck
                : theme.pendingCheck
            }
          />

          <View style={styles.taskCardContent}>
            <View
              style={styles.rowCenter}
            >
              <View style={styles.fill}>
                <Text
                  style={[styles.taskTitle, { color: task.done
                      ? theme.doneText
                      : theme.pendingText }]}
                >
                  {task.title}
                </Text>

                {task.time && (
                  <Text
                    style={[styles.taskTime, task.done && styles.doneText]}
                  >
                    {task.time}
                  </Text>
                )}
              </View>

              {totalSubtasks > 0 && (
                <View
                  style={styles.subtaskProgress}
                >
                  <View
                    style={[
                      styles.subtaskProgressBadge,
                      doneSubtasks === totalSubtasks && styles.subtaskProgressBadgeComplete,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subtaskProgressText,
                        doneSubtasks === totalSubtasks && styles.subtaskProgressTextComplete,
                      ]}
                    >
                      {doneSubtasks}/{totalSubtasks}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setCollapsed((current) => !current)
                    }
                    style={styles.subtaskCollapseButton}
                    hitSlop={{
                      top: 6,
                      bottom: 6,
                      left: 6,
                      right: 6,
                    }}
                  >
                    <Ionicons
                      name={
                        collapsed
                          ? "chevron-down"
                          : "chevron-up"
                      }
                      size={18}
                      color={theme.pendingText}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {totalSubtasks > 0 && !collapsed && (
        <View
          style={styles.subtaskList}
        >
          {subtasks.map((subtask) => (
            <TouchableOpacity
              key={subtask.id}
              style={styles.subtaskRow}
              onPress={() =>
                toggleSubtaskDone(
                  task.id,
                  subtask.id
                )
              }
            >
              <Ionicons
                name={
                  subtask.done
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={20}
                color={
                  subtask.done
                    ? theme.doneCheck
                    : theme.pendingCheck
                }
              />

              <Text
                style={[styles.subtaskLabel, { color: subtask.done
                    ? theme.doneText
                    : theme.pendingText }]}
              >
                {subtask.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

    </View>
  );
}
