import { ScrollView, View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ThemeSelector from "@/components/ThemeSelector";
import { themes } from "@/styles/themes";
import SettingsSection from "@/features/settings/components/SettingsSection";
import SettingsRow from "@/features/settings/components/SettingsRow";
import getSettingsStyles from "@/features/settings/styles/settingsStyles";
import { appVersion } from "@/features/settings/services/appInfo";

export default function SettingsScreen({ navigation, themeName, mode, setThemeName, setMode }) {
  const theme = themes[themeName][mode];
  const styles = getSettingsStyles(themeName, mode);
  const rowProps = { theme, styles };
  const themeLabel = `${themeName.charAt(0).toUpperCase()}${themeName.slice(1)} · ${mode === "dark" ? "Oscuro" : "Claro"}`;
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView contentContainerStyle={styles.content} removeClippedSubviews={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} accessibilityRole="button" accessibilityLabel="Abrir menú de navegación" onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>Ajustes</Text>
        </View>
        <SettingsSection title="APARIENCIA" styles={styles} style={styles.appearance}>
          <ThemeSelector themeName={themeName} mode={mode} setThemeName={setThemeName} setMode={setMode}
            renderTrigger={({ onPress, expanded }) => (
              <SettingsRow {...rowProps} title="Tema" subtitle={themeLabel} icon="color-palette-outline" onPress={onPress} expanded={expanded} />
            )} />
        </SettingsSection>
        <SettingsSection title="CUENTA Y NUBE" styles={styles} note="La cuenta es opcional. Puedes seguir usando Geska sin conexión.">
          <SettingsRow {...rowProps} title="Cuenta" subtitle="Gestionar cuenta" icon="person-circle-outline" onPress={() => navigation.navigate("Cuenta")} />
          <View style={styles.divider} />
          <SettingsRow {...rowProps} title="Copias de seguridad" subtitle="Próximamente" icon="cloud-upload-outline" />
        </SettingsSection>
        <SettingsSection title="GESKA" styles={styles}>
          <SettingsRow {...rowProps} title="Apoya el proyecto" subtitle="Próximamente" icon="heart-outline" />
          <View style={styles.divider} />
          <SettingsRow {...rowProps} title="Acerca de Geska" subtitle={`Versión ${appVersion}`} icon="information-circle-outline" />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}
