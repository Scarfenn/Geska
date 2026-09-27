import { View, Text, TouchableOpacity } from "react-native";

const names = { categories: "Categorías", tasks: "Tareas", subtasks: "Subtareas", task_occurrences: "Ocurrencias de tareas", subtask_occurrences: "Ocurrencias de subtareas" };
export default function RestoreConfirmation({ preview, busy, onApply, onCancel, styles }) {
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.rowTitle}>Revisar restauración</Text>
      <Text style={styles.text}>Copia del {new Date(preview.createdAt).toLocaleString()}</Text>
      <Text style={styles.text}>Formato {preview.formatVersion} · Esquema {preview.schemaVersion}</Text>
      {Object.entries(preview.counts).map(([table, count]) => <Text key={table} style={styles.text}>
        {names[table]}: {count.total} ({count.deleted} eliminadas)
      </Text>)}
      <Text accessibilityRole="alert" style={styles.error}>Esta acción reemplazará todas las tareas, categorías y su historial local por esta copia. Los cambios locales que no estén en ella se perderán. No hay opción de deshacer.</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onApply} style={[styles.restoreButton, busy && styles.disabled]}>
        <Text style={styles.restoreButtonText}>{busy ? "Restaurando…" : "Reemplazar datos locales"}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onCancel} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
