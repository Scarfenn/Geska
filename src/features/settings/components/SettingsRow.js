import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// No callback means informational content, never a button that does nothing.
export default function SettingsRow({ title, subtitle, icon, theme, styles, onPress, expanded }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.row} onPress={onPress} accessible
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={onPress && expanded !== undefined ? { expanded } : undefined}>
      <Ionicons name={icon} size={24} color={theme.primaryText} accessible={false} />
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={20} color={theme.inactiveCategoryText} accessible={false} />}
    </Container>
  );
}
