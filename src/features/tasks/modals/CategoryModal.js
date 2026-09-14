import { useState, useEffect } from "react";
import {
  Alert,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  LayoutAnimation,
} from "react-native";
import getModalStyles from "@/styles/modalStyles";

export default function CategoryModal({
  visible,
  isSaving = false,
  themeName,
  mode,
  categoryToEdit = null,
  saveCategory,
  closeModal,
  deleteCategory, 
  selectedCategory,
  setSelectedCategory
}) {
  const styles = getModalStyles(themeName, mode);
  const [categoryName, setCategoryName] = useState("");


  useEffect(() => {
    if (visible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCategoryName(categoryToEdit ? categoryToEdit.name : "");
    }
  }, [visible]);

  const handleSave = async () => {
    const name = categoryName.trim() || "Nueva categoría";
    try {
      await saveCategory({ id: categoryToEdit?.id || null, name });
      setCategoryName("");
    } catch (error) {
      console.error("No se pudo guardar la categoría", error);
      Alert.alert("No se pudo guardar", "Revisa el nombre e inténtalo de nuevo.");
    }
  };

  const handleDelete = async () => {
    if (!categoryToEdit) return;
    try {
      await deleteCategory(categoryToEdit.id);
      if (selectedCategory === categoryToEdit.id) setSelectedCategory("all");
      closeModal();
    } catch (error) {
      console.error("No se pudo eliminar la categoría", error);
      Alert.alert("No se pudo eliminar", "Inténtalo de nuevo.");
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <TouchableWithoutFeedback onPress={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {categoryToEdit ? "Editar categoría" : "Nueva categoría"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre de la categoría..."
                placeholderTextColor={mode === "light" ? "#888" : "#ccc"}
                value={categoryName}
                onChangeText={setCategoryName}
              />

              {/* Botón guardar */}
              <TouchableOpacity style={styles.saveButton} disabled={isSaving} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {categoryToEdit ? "Guardar cambios" : "Crear categoría"}
                </Text>
              </TouchableOpacity>

              {/* Botón eliminar (solo si se está editando) */}
              {categoryToEdit && (
                <TouchableOpacity
                  style={styles.categoryDeleteButton}
                  disabled={isSaving}
                  onPress={handleDelete}
                >
                  <Text
                    style={styles.categoryDeleteLabel}
                  >
                    Eliminar categoría
                  </Text>
                </TouchableOpacity>
              )}

              {/* Cancelar */}
              <TouchableOpacity
                style={styles.categoryCancelButton}
                onPress={() => {
                  setCategoryName("");
                  closeModal();
                }}
              >
                <Text style={styles.modalCancelText}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
