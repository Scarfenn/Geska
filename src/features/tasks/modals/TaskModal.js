import { useState, useEffect, useRef } from "react";
import {
  Alert,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from "react-native";
import TaskCategoryModal from "./SubModals/TaskCategoryModal";
import AddSubtaskModal from "./AddSubtaskModal";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import { Ionicons } from "@expo/vector-icons";

export default function TaskModal({
  visible,
  themeName,
  mode,

  taskToEdit = null,

  categories = [],
  selectedCategoryForTask,
  clearSelectedCategoryForTask,

  selectedDate,
  selectedTime,
  repeatMode,
  reminder,
  endDate,

  saveTask,
  closeModal,

  openTimeModal,
  openAddCategoryModal,
}) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const opacityAnim =
    useRef(new Animated.Value(0)).current;

  const slideAnim =
    useRef(new Animated.Value(30)).current;

  const [taskText, setTaskText] =
    useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subtaskModalVisible, setSubtaskModalVisible] = useState(false);
  const [draftSubtasks, setDraftSubtasks] = useState([]);


  // ======================================================
  // FUNCIONES AUXILIARES
  // ======================================================
  function isToday(date) {
    if (!date) return true;

    const today = new Date();
    const target = new Date(date);

    return (
      today.getFullYear() === target.getFullYear() &&
      today.getMonth() === target.getMonth() &&
      today.getDate() === target.getDate()
    );
  }

  const hasCustomTimeConfig =
    !isToday(selectedDate) ||
    selectedTime !== null ||
    repeatMode !== "none" ||
    reminder !== null ||
    endDate !== null;

  // ======================================================
  // MODAL PRINCIPAL
  // ======================================================

  const animateOpen = () => {
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

  // ======================================================
  // CATEGORÍAS
  // ======================================================

  const openCategorySelector = () => {
    setCategoryModalVisible(true);
  };

  const selectedCategoryObject =
    categories.find(
      (category) =>
        category.id === selectedCategory
    );

  const handleCategorySelected = (
    categoryId
  ) => {
    setSelectedCategory(categoryId);

    if (categoryId === null) {
      clearSelectedCategoryForTask?.();
    }
  };

  // ======================================================
  // CARGAR DATOS
  // ======================================================

  useEffect(() => {
    if (!visible) return;

    if (taskToEdit) {
      setTaskText(
        taskToEdit.title || ""
      );

      setSelectedCategory(
        taskToEdit.categoryId || null
      );

      setDraftSubtasks(
        (taskToEdit.subtasks || []).map(
          (subtask) => ({
            ...subtask,
            id: String(subtask.id),
            isNew: false,
          })
        )
      );

      return;
    }

    setTaskText("");

    setSelectedCategory(
      selectedCategoryForTask || null
    );

    setDraftSubtasks([]);
  }, [
    visible,
    taskToEdit,
    selectedCategoryForTask,
  ]);

  // ======================================================
  // GUARDAR
  // ======================================================

  const handleSave = async () => {
    const finalText =
      taskText.trim() === ""
        ? "Nueva tarea"
        : taskText.trim();

    try {
      await saveTask({ text: finalText, categoryId: selectedCategory, subtasks: draftSubtasks });
      animateClose();
    } catch (error) {
      console.error("No se pudo guardar la tarea", error);
      Alert.alert("No se pudo guardar", "Revisa los datos e inténtalo de nuevo.");
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <>
      {/* ============================================= */}
      {/* MODAL CATEGORÍAS                             */}
      {/* ============================================= */}

      <TaskCategoryModal
        visible={categoryModalVisible}
        themeName={themeName}
        mode={mode}

        categories={categories}
        selectedCategory={selectedCategory}

        onSelectCategory={
          handleCategorySelected
        }

        openAddCategoryModal={
          openAddCategoryModal
        }

        closeModal={() =>
          setCategoryModalVisible(false)
        }
      />
      {/* ============================================= */}
      {/* MODAL SUBTAREAS                              */}
      {/* ============================================= */}
      <AddSubtaskModal
        visible={subtaskModalVisible}
        themeName={themeName}
        mode={mode}

        subtasks={draftSubtasks}

        onSave={(subtasks) => {
          setDraftSubtasks(subtasks);
        }}

        closeModal={() =>
          setSubtaskModalVisible(false)
        }
      />
      {/* ============================================= */}
      {/* TASK MODAL                                   */}
      {/* ============================================= */}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onShow={animateOpen}
      >
        <TouchableWithoutFeedback
          onPress={animateClose}
        >
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                opacity:
                  opacityAnim,
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalBox,
                  {
                    transform: [
                      {
                        translateY:
                          slideAnim,
                      },
                    ],

                    width: "88%",
                    borderRadius: 14,
                    paddingVertical: 20,
                    paddingHorizontal: 20,
                  },
                ]}
              >
                {/* Título */}
                <Text
                  style={styles.modalTitle}
                >
                  {taskToEdit
                    ? "Editar tarea"
                    : "Nueva tarea"}
                </Text>

                {/* Input */}
                <TextInput
                  style={styles.input}
                  placeholder="Escribe una tarea..."
                  placeholderTextColor={
                    styles.placeholder.color
                  }
                  value={taskText}
                  onChangeText={setTaskText}
                />

                {/* Categoría elegida */}
                {selectedCategoryObject && (
                  <View
                    style={{
                      alignSelf:
                        "flex-start",

                      flexDirection: "row",
                      alignItems: "center",

                      marginTop: 2,

                      paddingHorizontal: 10,
                      paddingVertical: 5,

                      borderRadius: 999,

                      backgroundColor:
                        theme.card,

                      borderWidth: 1,
                      borderColor:
                        theme.primary,
                    }}
                  >
                    <Ionicons
                      name="pricetag"
                      size={14}
                      color={
                        theme.primaryText
                      }
                    />

                    <Text
                      style={{
                        color:
                          theme.primaryText,

                        marginLeft: 5,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {
                        selectedCategoryObject.name
                      }
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        setSelectedCategory(
                          null
                        )
                      }
                      hitSlop={8}
                    >
                      <Ionicons
                        name="close"
                        size={16}
                        color={
                          theme.primaryText
                        }
                        style={{
                          marginLeft: 7,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Icon Row */}
                <View
                  style={[
                    styles.iconRow,
                    {
                      marginTop: 10,
                    },
                  ]}
                >
                  {/* Tiempo */}
                  <TouchableOpacity
                    onPress={openTimeModal}
                    style={styles.iconButton}
                  >
                    <Ionicons
                      name={
                        hasCustomTimeConfig
                          ? "calendar"
                          : "calendar-outline"
                      }
                      size={24}
                      color={
                        hasCustomTimeConfig
                          ? theme.primaryText
                          : styles.iconColor.color
                      }
                    />
                  </TouchableOpacity>

                  {/* Categoría */}
                  <TouchableOpacity
                    onPress={
                      openCategorySelector
                    }
                    style={
                      styles.iconButton
                    }
                  >
                    <Ionicons
                      name={
                        selectedCategory
                          ? "pricetag"
                          : "pricetag-outline"
                      }
                      size={24}
                      color={
                        selectedCategory
                          ? theme.primary
                          : styles
                              .iconColor
                              .color
                      }
                    />
                  </TouchableOpacity>

                  {/* Subtareas */}
                  <TouchableOpacity
                    onPress={() =>
                      setSubtaskModalVisible(true)
                    }
                    style={styles.iconButton}
                  >
                    <Ionicons
                      name={
                        draftSubtasks.length > 0
                          ? "list"
                          : "list-outline"
                      }
                      size={24}
                      color={
                        draftSubtasks.length > 0
                          ? theme.primary
                          : styles.iconColor.color
                      }
                    />
                  </TouchableOpacity>

                  {/* Más - futuro */}
                  {/*<TouchableOpacity
                    disabled
                    style={
                      styles.iconButton
                    }
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={26}
                      color={
                        styles.iconColor
                          .color
                      }
                      opacity={0.4}
                    />
                  </TouchableOpacity>*/}
                </View>

                {/* Guardar */}
                <TouchableOpacity
                  style={
                    styles.saveButton
                  }
                  onPress={handleSave}
                >
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {taskToEdit
                      ? "Guardar cambios"
                      : "Guardar"}
                  </Text>
                </TouchableOpacity>

                {/* Cancelar */}
                <TouchableOpacity
                  onPress={animateClose}
                  style={{
                    marginTop: 10,
                  }}
                >
                  <Text
                    style={{
                      color: theme.inactiveCategoryText,
                      textAlign:
                        "center",
                    }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}