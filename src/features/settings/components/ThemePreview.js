import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Demonstration only: palette and description come from the owning screen.
export default function ThemePreview({ palette, accessibilityLabel }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}
      style={[styles.frame, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
        <Text style={[styles.caption, { color: palette.inactiveCategoryText }]}>VISTA PREVIA</Text>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Hoy</Text>
          <View style={[styles.add, { backgroundColor: palette.primary }]}>
            <Ionicons name="add" size={22} color={palette.onPrimary} />
          </View>
        </View>
        <View style={styles.categories}>
          <View style={[styles.category, { backgroundColor: palette.primary }]}>
            <Text style={[styles.categoryText, { color: palette.onPrimary }]}>Todas</Text>
          </View>
          <View style={[styles.category, { backgroundColor: palette.inactiveCategory }]}>
            <Text style={[styles.categoryText, { color: palette.inactiveCategoryText }]}>Personal</Text>
          </View>
        </View>
        <View style={[styles.task, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="ellipse-outline" size={22} color={palette.pendingCheck} />
          <View style={styles.taskContent}>
            <Text style={[styles.taskTitle, { color: palette.pendingText }]}>Leer un capítulo</Text>
            <Text style={[styles.time, { color: palette.inactiveCategoryText }]}>18:00</Text>
          </View>
        </View>
        <View style={[styles.task, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="checkmark-circle" size={22} color={palette.doneCheck} />
          <Text style={[styles.taskTitle, styles.taskContent, { color: palette.doneText }]}>Dar un paseo</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  caption: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: "bold", flexShrink: 1 },
  add: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  category: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, maxWidth: "100%" },
  categoryText: { fontSize: 13, fontWeight: "600" },
  task: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8, borderRadius: 8, borderBottomWidth: 1, borderRightWidth: 1, marginBottom: 6 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15 },
  time: { marginTop: 3, fontSize: 12 },
});
