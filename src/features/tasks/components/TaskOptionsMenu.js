import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { themes } from "@/styles/themes";
import getTaskOptionsMenuStyles from "@/features/tasks/styles/taskOptionsMenuStyles";
import { taskMenuPosition } from "@/features/tasks/domain/taskMenuPosition";
import useModalAnimation from "@/hooks/useModalAnimation";

export default function TaskOptionsMenu(props) {
  return props.task && props.anchor ? <MenuSession key={props.task.id} {...props} /> : null;
}

function MenuSession({ task, anchor, themeName, mode, closeOptions, startEditTask, removeTask, manageSubtasks }) {
  const theme = themes[themeName][mode];
  const styles = getTaskOptionsMenuStyles(themeName, mode);
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const [viewport, setViewport] = useState(null);
  const [size, setSize] = useState(null);
  const pendingAction = useRef(null);
  const completed = useRef(false);
  const root = useRef(null);
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    closeOptions();
    pendingAction.current?.();
  };
  const { opacityAnim, slideAnim, animateOpen, animateClose } = useModalAnimation(
    () => setVisible(false), { distance: -10, scale: null, openDuration: 200, closeDuration: 150 }
  );
  // iOS must finish native dismissal before presenting another modal.
  useEffect(() => {
    if (!visible && Platform.OS !== "ios") {
      const frame = requestAnimationFrame(finish);
      return () => cancelAnimationFrame(frame);
    }
  }, [visible]);
  const close = action => animateClose(() => { pendingAction.current = action; });
  const measureViewport = () => root.current?.measureInWindow((x, y, width, height) => {
    setViewport({ x, y, width, height });
  });
  const position = viewport ? taskMenuPosition(anchor, viewport, size, insets) : {};
  const items = [
    ["list-outline", "Administrar subtareas", () => manageSubtasks(task.id)],
    ["create-outline", "Editar", () => startEditTask(task)],
    ["trash-outline", "Eliminar", () => removeTask(task.id)],
  ];
  return (
    <Modal transparent visible={visible} animationType="none" onShow={animateOpen} onRequestClose={() => close()} onDismiss={finish}>
      <View ref={root} collapsable={false} style={{ flex: 1 }} onLayout={measureViewport}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Cerrar menú de tarea" onPress={() => close()} />
        {viewport && <Animated.View
          accessibilityViewIsModal
          onLayout={event => setSize(event.nativeEvent.layout)}
          style={[styles.optionMenu, {
            position: "absolute", ...position,
            opacity: size ? opacityAnim : 0,
            transform: [{ translateY: slideAnim }],
          }]}
        >
          <ScrollView bounces={false}>
            {items.map(([icon, label, action], index) => <TouchableOpacity key={label} accessibilityRole="button" onPress={() => close(action)} style={styles.taskMenuItem}>
              <Ionicons name={icon} size={18} color={index === 2 ? theme.danger : theme.text} style={styles.taskMenuIcon} />
              <Text style={index === 2 ? styles.taskMenuDangerLabel : styles.taskMenuLabel}>{label}</Text>
            </TouchableOpacity>)}
          </ScrollView>
        </Animated.View>}
      </View>
    </Modal>
  );
}
