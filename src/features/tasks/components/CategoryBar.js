import { ScrollView, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
export default function CategoryBar({
  categories,
  selectedCategory,
  setSelectedCategory,
  openEditCategoryModal,
  openAddCategoryModal,
  styles
}) {
  return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 10,
            alignItems: "center",
          }}
          style={{ maxHeight: 50 }}
        >
          {categories.map((cat) => {
            const activeCategory = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                onLongPress={() =>
                  cat.id !== "all" && openEditCategoryModal(cat)
                }
                style={{
                  ...styles.categoryContainer,
                  backgroundColor: activeCategory
                    ? styles.categoryContainer.activeColor
                    : styles.categoryContainer.inactiveColor,
                }}
              >
                <Text
                  style={
                    activeCategory
                      ? styles.categoryTextActive
                      : styles.categoryTextInactive
                  }
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={openAddCategoryModal}>
            <Ionicons name="add" size={20} color={styles.text.color} />
          </TouchableOpacity>
        </ScrollView>

  );
}
