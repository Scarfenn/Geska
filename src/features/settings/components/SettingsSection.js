import { View, Text } from "react-native";

export default function SettingsSection({ title, children, styles, style, note }) {
  return (
    <View style={[styles.section, style]}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
      {note && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}
