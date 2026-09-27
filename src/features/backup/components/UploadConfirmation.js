import { View, Text, TouchableOpacity } from "react-native";

export default function UploadConfirmation({ remote, busy, onConfirm, onCancel, styles }) {
  const date = remote?.lastModified && Number.isFinite(Date.parse(remote.lastModified))
    ? new Date(remote.lastModified).toLocaleString() : null;
  return (
    <View style={styles.confirmationContent}>
      <Text accessibilityRole="header" style={styles.rowTitle}>¿Reemplazar copia de seguridad?</Text>
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {`Ya existe una copia guardada${date ? ` (${date})` : ""}. Al crear una nueva, esa copia será reemplazada.`}
      </Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onConfirm} style={[styles.dangerButton, busy && styles.disabled]}>
        <Text style={styles.dangerButtonText}>Reemplazar copia</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
