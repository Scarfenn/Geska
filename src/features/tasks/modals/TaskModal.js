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
  StyleSheet,
} from "react-native";
import TaskCategoryModal from "./SubModals/TaskCategoryModal";

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

  const categoryOpacity =
    useRef(new Animated.Value(0)).current;

  const categorySlide =
    useRef(new Animated.Value(15)).current;

  const [taskText, setTaskText] =
    useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

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

  const animateCategoryOpen = () => {
    categoryOpacity.setValue(0);
    categorySlide.setValue(15);

    Animated.parallel([
      Animated.timing(categoryOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(categorySlide, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeCategorySelector = () => {
    Animated.parallel([
      Animated.timing(categoryOpacity, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }),

      Animated.timing(categorySlide, {
        toValue: 15,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCategoryModalVisible(false);
    });
  };

  const selectCategory = (categoryId) => {
    setSelectedCategory(categoryId);

    if (categoryId === null) {
      clearSelectedCategoryForTask?.();
    }

    closeCategorySelector();
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

      return;
    }

    setTaskText("");

    setSelectedCategory(
      selectedCategoryForTask || null
    );
  }, [
    visible,
    taskToEdit,
    selectedCategoryForTask,
  ]);

  // ======================================================
  // GUARDAR
  // ======================================================

  const handleSave = () => {
    const finalText =
      taskText.trim() === ""
        ? "Nueva tarea"
        : taskText.trim();

    saveTask({
      text: finalText,
      categoryId:
        selectedCategory,
    });

    animateClose();
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
                        theme.primary
                      }
                    />

                    <Text
                      style={{
                        color:
                          theme.primary,

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
                          theme.primary
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
                    onPress={
                      openTimeModal
                    }
                    style={
                      styles.iconButton
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={24}
                      color={
                        styles.iconColor
                          .color
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

                  {/* Subtareas - futuro */}
                  <TouchableOpacity
                    disabled
                    style={
                      styles.iconButton
                    }
                  >
                    <Ionicons
                      name="list-outline"
                      size={24}
                      color={
                        styles.iconColor
                          .color
                      }
                      opacity={0.4}
                    />
                  </TouchableOpacity>

                  {/* Más - futuro */}
                  <TouchableOpacity
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
                  </TouchableOpacity>
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
                      color: "red",
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