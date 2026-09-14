import useModalAnimation from "@/hooks/useModalAnimation";
import { useState, useRef } from "react";
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
import useTaskModalDraft from "@/features/tasks/hooks/useTaskModalDraft";
import TaskCategoryModal from "@/features/tasks/modals/SubModals/TaskCategoryModal";
import SubtaskModal from "@/features/tasks/modals/SubtaskModal";

import getTaskModalStyles from "@/features/tasks/styles/taskModalStyles";
import { themes } from "@/styles/themes";
import { Ionicons } from "@expo/vector-icons";

export default function TaskModal(props) {
  return props.visible ? <TaskModalSession key={props.taskToEdit?.id ?? "new"} {...props} /> : null;
}

function TaskModalSession({
  visible,
  isSaving = false,
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
  const styles = getTaskModalStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const { taskText, setTaskText, selectedCategory, setSelectedCategory, draftSubtasks, setDraftSubtasks } = useTaskModalDraft(taskToEdit, selectedCategoryForTask);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subtaskModalVisible, setSubtaskModalVisible] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const busy = isSaving || localSaving;
  const saving = useRef(false);
  const { opacityAnim, slideAnim, animateOpen, animateClose, mounted, closing } = useModalAnimation(closeModal, { visible, distance: 30, scale: null, openDuration: 250, closeDuration: 150, openEasing: Easing.out(Easing.ease), closeEasing: null });

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
  // GUARDAR
  // ======================================================

  const requestClose = () => {
    if (saving.current || isSaving) return;
    if (categoryModalVisible) setCategoryModalVisible(false);
    else if (subtaskModalVisible) setSubtaskModalVisible(false);
    else animateClose();
  };

  const handleSave = async () => {
    if (saving.current || isSaving || closing.current) return;
    saving.current = true;
    setLocalSaving(true);
    const finalText =
      taskText.trim() === ""
        ? "Nueva tarea"
        : taskText.trim();

    try {
      await saveTask({ text: finalText, categoryId: selectedCategory, subtasks: draftSubtasks });
      if (mounted.current) animateClose();
    } catch (error) {
      console.error("No se pudo guardar la tarea", error);
      if (mounted.current) Alert.alert("No se pudo guardar", "Revisa los datos e inténtalo de nuevo.");
    } finally {
      saving.current = false;
      if (mounted.current) setLocalSaving(false);
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
      <SubtaskModal
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
        onRequestClose={requestClose}
      >
        <TouchableWithoutFeedback
          onPress={requestClose}
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
                    theme.pendingText
                  }
                  editable={!busy}
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
                        handleCategorySelected(
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
                    disabled={busy}
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
                          : theme.text
                      }
                    />
                  </TouchableOpacity>

                  {/* Categoría */}
                  <TouchableOpacity
                    disabled={busy}
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
                          : theme.text
                      }
                    />
                  </TouchableOpacity>

                  {/* Subtareas */}
                  <TouchableOpacity
                    disabled={busy}
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
                          : theme.text
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
                  disabled={busy}
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
                  onPress={requestClose}
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