import { ScrollView, View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { themes } from "@/styles/themes";
import getThemeStyles from "@/features/settings/styles/themeStyles";

export default function ThemeScreen({ navigation, themeName, mode, setThemeName, setMode }) {
  const theme = themes[themeName][mode];
  const styles = getThemeStyles(themeName, mode);
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a Ajustes" style={styles.menuButton} onPress={() => navigation.navigate("Ajustes")}>
            <Ionicons name="arrow-back" size={24} color={theme.text} accessible={false} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>Tema</Text>
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>MODO</Text>
          <View style={styles.modeControl}>
            {[{ value: "light", label: "Claro", icon: "sunny-outline" }, { value: "dark", label: "Oscuro", icon: "moon-outline" }].map(({ value, label, icon }) => (
              <TouchableOpacity key={value} accessible accessibilityRole="button" accessibilityLabel={label}
                accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)}
                style={[styles.modeOption, mode === value && styles.selectedOption]}>
                <Ionicons name={icon} size={22} color={mode === value ? theme.onPrimary : theme.text} accessible={false} />
                <Text style={[styles.optionText, mode === value && styles.selectedText]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>FAMILIA DE TEMA</Text>
          <View style={styles.grid}>
            {Object.keys(themes).map(name => {
              const palette = themes[name][mode];
              const label = name.charAt(0).toUpperCase() + name.slice(1);
              const selected = themeName === name;
              return (
                <TouchableOpacity key={name} accessible accessibilityRole="button" accessibilityLabel={`Tema ${label}`}
                  accessibilityState={{ selected }} onPress={() => setThemeName(name)}
                  style={[styles.familyCard, selected && styles.selectedCard]}>
                  <View style={[styles.preview, { backgroundColor: palette.background, borderColor: palette.border }]}
                    accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    {[palette.primary, palette.inactiveCategory, palette.card, palette.doneCheck].map((color, index) => (
                      <View key={index} style={[styles.swatch, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <View style={styles.familyLabel}>
                    <Text style={styles.familyName}>{label}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={theme.primaryText} accessible={false} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.note}>Los cambios se aplican al instante.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
