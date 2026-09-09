import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import createStyles from "@/styles/styles";

export default function TaskCard({
  task,
  toggleTaskDone,
  toggleSubtaskDone,
  removeTask,
  themeName,
  mode,
  isMenuOpen,
  openOptions,
  closeOptions,
  setModalTaskId,
  startEditTask,
  setActiveModal,
}) {
  const styles = createStyles(themeName, mode);

  const [collapsed, setCollapsed] = useState(false);
  const [menuMounted, setMenuMounted] = useState(isMenuOpen);
  const menuAnimation = useRef(
    new Animated.Value(isMenuOpen ? 1 : 0)
  ).current;

  const subtasks = task.subtasks || [];
  const totalSubtasks = subtasks.length;
  const doneSubtasks = subtasks.filter(
    (subtask) => subtask.done
  ).length;

  useEffect(() => {
    menuAnimation.stopAnimation();

    if (isMenuOpen) {
      setMenuMounted(true);

      Animated.timing(menuAnimation, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      return;
    }

    Animated.timing(menuAnimation, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuMounted(false);
      }
    });
  }, [isMenuOpen, menuAnimation]);

  const handleManageSubtasks = () => {
    setModalTaskId(task.id);
    setActiveModal("subtask");
    closeOptions();
  };

  const handleEdit = () => {
    startEditTask(task);
    closeOptions();
  };

  const handleDelete = () => {
    removeTask(task.id);
    closeOptions();
  };

  return (
    <View style={styles.taskCardContainer}>
      <View style={styles.taskCardHeader}>
        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.task}
          onPress={() => toggleTaskDone(task.id)}
          onLongPress={() => openOptions(task.id)}
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
                ? styles.doneCheck.color
                : styles.pendingCheck.color
            }
          />

          <View style={styles.taskCardContent}>
            <View
              style={styles.rowCenter}
            >
              <View style={styles.fill}>
                <Text
                  style={[styles.taskTitle, { color: task.done
                      ? styles.doneText.color
                      : styles.pendingText.color }]}
                >
                  {task.title}
                </Text>

                {task.time && (
                  <Text
                    style={[styles.taskTime, { opacity: task.done ? 0.45 : 0.85 }]}
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
                      color={styles.pendingText.color}
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
                    ? styles.doneCheck.color
                    : styles.pendingCheck.color
                }
              />

              <Text
                style={[styles.subtaskLabel, { color: subtask.done
                    ? styles.doneText.color
                    : styles.pendingText.color }]}
              >
                {subtask.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {menuMounted && (
        <Animated.View
          pointerEvents={isMenuOpen ? "auto" : "none"}
          style={[
            styles.optionMenu,
            {
              position: "absolute",
              opacity: menuAnimation,
              transform: [
                {
                  translateY: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleManageSubtasks}
            style={styles.taskMenuItem}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={styles.text.color}
              style={styles.taskMenuIcon}
            />
            <Text
              style={styles.taskMenuLabel}
            >
              Administrar subtareas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEdit}
            style={styles.taskMenuItem}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={styles.text.color}
              style={styles.taskMenuIcon}
            />
            <Text
              style={styles.taskMenuLabel}
            >
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={styles.taskMenuItem}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={styles.dangerText.color}
              style={styles.taskMenuIcon}
            />
            <Text
              style={styles.taskMenuDangerLabel}
            >
              Eliminar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}
