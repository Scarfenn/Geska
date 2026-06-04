import { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from "react-native";
import createStyles from "../styles/styles";
import { Ionicons } from "@expo/vector-icons";

export default function TaskModal({
  visible,
  themeName,
  mode,
  taskToEdit = null,
  selectedCategoryForTask,
  saveTask,
  closeModal,
  openTimeModal,
  openCategoryModal,
}) {
  const styles = createStyles(themeName, mode);

  /* Animación */
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [taskText, setTaskText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
  if (visible) {
    // Animación de entrada
    opacityAnim.setValue(0);
    slideAnim.setValue(30);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }
}, [visible]);


  // Cargar datos previos
  useEffect(() => {
    if (!visible) return;

    if (taskToEdit) {
      setTaskText(taskToEdit.title || "");
    } else {
      setTaskText("");
    }
  }, [visible, taskToEdit]);

  // Categoría FAB
  useEffect(() => {
    if (!visible) return;

    if (taskToEdit) {
      setSelectedCategory(taskToEdit.categoryId || null);
    } else {
      setSelectedCategory(selectedCategoryForTask || null);
    }
  }, [visible, taskToEdit, selectedCategoryForTask]);


  const handleSave = () => {
    const finalText = taskText.trim() === "" ? "Nueva tarea" : taskText;

    saveTask({
      text: finalText,
      categoryId: selectedCategory
    });

    animateClose();
  };

  const animateClose = () => {
  Animated.parallel([
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 30,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start(() => {
    closeModal();
  });
};


  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={animateClose}>
        <Animated.View
          style={[
            styles.modalOverlay,
            { opacity: opacityAnim },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalBox,
                {
                  transform: [{ translateY: slideAnim }],
                  width: "88%",
                  borderRadius: 14,
                  paddingVertical: 20,
                  paddingHorizontal: 20,
                },
              ]}
            >

              {/* Título */}
              <Text style={styles.modalTitle}>
                {taskToEdit ? "Editar tarea" : "Nueva tarea"}
              </Text>

              {/* Input */}
              <TextInput
                style={styles.input}
                placeholder="Escribe una tarea..."
                placeholderTextColor={styles.placeholder.color}
                value={taskText}
                onChangeText={setTaskText}
              />

              {/* Icon Row */}
              <View style={[styles.iconRow, { marginTop: 18 }]}>
                
                {/* TIEMPO */}
                <TouchableOpacity
                  onPress={openTimeModal}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={styles.iconColor.color}
                  />
                </TouchableOpacity>

                {/* CATEGORÍA */}
                <TouchableOpacity
                  onPress={openCategoryModal}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={24}
                    color={styles.iconColor.color}
                    opacity={0.4}
                  />
                </TouchableOpacity>

                {/* SUBTAREAS */}
                <TouchableOpacity style={styles.iconButton}>
                  <Ionicons
                    name="list-outline"
                    size={24}
                    color={styles.iconColor.color}
                    opacity={0.4}
                  />
                </TouchableOpacity>

                {/* MÁS */}
                <TouchableOpacity style={styles.iconButton}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={26}
                    color={styles.iconColor.color}
                    opacity={0.4}
                  />
                </TouchableOpacity>
              </View>

              {/* Botón Guardar */}
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {taskToEdit ? "Guardar cambios" : "Guardar"}
                </Text>
              </TouchableOpacity>

              {/* Cancelar */}
              <TouchableOpacity onPress={animateClose} style={{ marginTop: 10 }}>
                <Text style={{ color: "red", textAlign: "center" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
