import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { themes } from "@/styles/themes";
import UploadConfirmation from "@/features/backup/components/UploadConfirmation";
import RestoreConfirmation from "@/features/backup/components/RestoreConfirmation";
import useBackup from "@/features/backup/hooks/useBackup";
import getBackupStyles from "@/features/backup/styles/backupStyles";

export default function BackupScreen({ navigation, themeName, mode }) {
  const theme = themes[themeName][mode], styles = getBackupStyles(themeName, mode);
  const backup = useBackup();
  const canUpload = ["ready", "empty", "success", "uploading", "restored"].includes(backup.status);
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a Ajustes" style={styles.menuButton} onPress={() => navigation.navigate("Ajustes")}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>Copias de seguridad</Text>
        </View>
        <Text style={styles.note}>Geska sigue guardando tus datos en este dispositivo. Crear un respaldo en la nube no elimina ni reemplaza tus datos locales.</Text>
        <View style={styles.panel}>
          {backup.status === "loading" && <>
            <ActivityIndicator color={theme.primaryText} />
            <Text accessibilityLiveRegion="polite" style={styles.text}>Consultando cuenta y última copia…</Text>
          </>}
          {backup.status === "signed-out" && <>
            <Text style={styles.text}>Necesitas una cuenta para los respaldos en la nube. Puedes seguir usando todas las funciones locales sin iniciar sesión.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.saveButton} onPress={() => navigation.navigate("Cuenta")}>
              <Text style={styles.saveButtonText}>Ir a Cuenta</Text>
            </TouchableOpacity>
          </>}
          {backup.message && !["signed-out", "confirm-upload"].includes(backup.status) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={["success", "restored"].includes(backup.status) ? styles.text : styles.error}>{backup.message}</Text>}
          {backup.warning && <Text accessibilityRole="alert" style={styles.error}>{backup.warning}</Text>}
          {backup.status === "preparing" && <><ActivityIndicator color={theme.primaryText} /><Text style={styles.text}>Descargando y validando la copia…</Text></>}
          {backup.status === "confirm-upload" && <UploadConfirmation remote={backup.remote} busy={backup.busy} styles={styles}
            onConfirm={() => backup.controller.confirmUpload()} onCancel={() => backup.controller.cancelUpload()} />}
          {backup.preview && <RestoreConfirmation preview={backup.preview} busy={backup.busy} styles={styles}
            onApply={() => backup.controller.apply()} onCancel={() => backup.controller.cancelPreparation()} />}
          <View style={styles.backupInfoHeader}>
            {canUpload && <View style={styles.backupInfoDetails}>
              <Text style={styles.rowTitle}>Última copia</Text>
              <Text style={styles.text}>{backup.status === "empty" ? "Sin copia en la nube" : backup.remote?.lastModified
                ? new Date(backup.remote.lastModified).toLocaleString()
                : "Fecha remota no disponible"}</Text>
            </View>}
            {!["confirm-upload", "confirm-restore", "restoring", "preparing"].includes(backup.status) && backup.status !== "loading" && backup.status !== "signed-out" && <TouchableOpacity accessibilityRole="button"
              accessibilityState={{ disabled: backup.busy }} disabled={backup.busy} onPress={() => backup.controller.refresh()} style={[styles.refreshButton, backup.busy && styles.disabled]}>
              <Ionicons name="refresh-outline" size={16} color={theme.primaryText} />
              <Text style={styles.refreshText}>Actualizar</Text>
            </TouchableOpacity>}
          </View>
          {canUpload && <>
            <Text style={styles.note}>Se conserva una sola copia por cuenta. Una nueva copia reemplaza la anterior en la nube.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: backup.busy, busy: backup.busy }} disabled={backup.busy}
              onPress={() => backup.controller.upload()} style={[styles.saveButton, backup.busy && styles.disabled]}>
              <Text style={styles.saveButtonText}>{backup.busy ? "Creando copia…" : "Crear copia de seguridad"}</Text>
              {backup.busy && <ActivityIndicator color={theme.onPrimary} />}
            </TouchableOpacity>
          </>}
          {canUpload && backup.remote && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: backup.busy }} disabled={backup.busy}
            onPress={() => backup.controller.prepare()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Restaurar desde la nube</Text>
          </TouchableOpacity>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
