import { ScrollView, View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { themes } from "@/styles/themes";
import getThemeStyles from "@/features/settings/styles/themeStyles";
import ThemePreview from "@/features/settings/components/ThemePreview";

export default function ThemeScreen({ navigation, themeName, mode, setThemeName, setMode }) {
  const theme = themes[themeName][mode];
  const styles = getThemeStyles(themeName, mode);
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View style={styles.layout}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a Ajustes" style={styles.menuButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} accessible={false} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>Tema</Text>
        </View>
        <ThemePreview palette={theme}
          accessibilityLabel={`Vista previa del tema ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} en modo ${mode === "dark" ? "oscuro" : "claro"}. Ejemplo con tareas ficticias.`} />
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
        <View style={styles.familySection}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>FAMILIA DE TEMA</Text>
          <ScrollView style={styles.familyScroll} contentContainerStyle={styles.familyScrollContent} showsVerticalScrollIndicator={false} removeClippedSubviews={false}>
            <View style={styles.grid}>
              {Object.keys(themes).map(name => {
                const palette = themes[name][mode];
                const label = name.charAt(0).toUpperCase() + name.slice(1);
                const selected = themeName === name;
                return (
                  <TouchableOpacity key={name} accessible accessibilityRole="button" accessibilityLabel={`Tema ${label}`}
                    accessibilityState={{ selected }} onPress={() => setThemeName(name)}
                    style={[styles.familyCard, selected && styles.selectedCard]}>
                    <View accessible={false} style={[styles.familyAccent, { backgroundColor: palette.primary }]} />
                    <Text style={styles.familyName}>{label}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={theme.primaryText} accessible={false} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
