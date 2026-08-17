import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  LayoutAnimation,
} from "react-native";
import createStyles from "@/styles/styles";

export default function CategoryModal({
  visible,
  themeName,
  mode,
  categoryToEdit = null,
  saveCategory,
  closeModal,
  deleteCategory, 
  selectedCategory,
  setSelectedCategory
}) {
  const styles = createStyles(themeName, mode);
  const [categoryName, setCategoryName] = useState("");


  useEffect(() => {
    if (visible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCategoryName(categoryToEdit ? categoryToEdit.name : "");
    }
  }, [visible]);

  const handleSave = () => {
    const name = categoryName.trim() || "Nueva categoría";
    saveCategory({
      id: categoryToEdit?.id || null,
      name,
    });
    setCategoryName("");
  };

const handleDelete = () => {
  if (!categoryToEdit) return;

  deleteCategory(categoryToEdit.id);

  if (selectedCategory === categoryToEdit.id) {
    setSelectedCategory("all");
  }

  closeModal();
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
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {categoryToEdit ? "Guardar cambios" : "Crear categoría"}
                </Text>
              </TouchableOpacity>

              {/* Botón eliminar (solo si se está editando) */}
              {categoryToEdit && (
                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 6,
                    backgroundColor: "#ff4d4d",
                  }}
                  onPress={handleDelete}
                >
                  <Text
                    style={{
                      color: "#fff",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    Eliminar categoría
                  </Text>
                </TouchableOpacity>
              )}

              {/* Cancelar */}
              <TouchableOpacity
                style={{ marginTop: 12 }}
                onPress={() => {
                  setCategoryName("");
                  closeModal();
                }}
              >
                <Text style={{ textAlign: "center", color: "red" }}>
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
