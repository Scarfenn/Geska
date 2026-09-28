import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

export default function DeleteAccountConfirmation({ busy, styles, onConfirm, onCancel }) {
  return <View style={styles.deleteSection}>
    <Text accessibilityRole="header" style={styles.rowTitle}>¿Eliminar tu cuenta?</Text>
    <Text style={styles.message}>Se eliminarán tu cuenta y la copia de seguridad guardada en la nube.</Text>
    <Text style={styles.localDataNotice}>Tus tareas y demás datos guardados en este dispositivo no se eliminarán.</Text>
    <Text accessibilityRole="alert" style={styles.error}>Esta acción no se puede deshacer.</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onCancel} style={styles.secondaryButton}>
      <Text style={styles.secondaryText}>Cancelar</Text>
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onConfirm} style={[styles.deleteButton, busy && styles.disabled]}>
      <Text style={styles.deleteButtonText}>{busy ? "Eliminando cuenta…" : "Eliminar cuenta"}</Text>
      {busy && <ActivityIndicator color={styles.deleteButtonText.color} />}
    </TouchableOpacity>
  </View>;
}
