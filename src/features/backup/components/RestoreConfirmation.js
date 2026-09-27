import { View, Text, TouchableOpacity } from "react-native";

const names = { categories: "Categorías", tasks: "Tareas", subtasks: "Subtareas" };
export default function RestoreConfirmation({ preview, busy, onApply, onCancel, styles }) {
  return (
    <View style={{gap: 12}}>
      <Text accessibilityRole="header" style={styles.rowTitle}>Revisar restauración</Text>
      <Text style={styles.text}>Copia del {new Date(preview.createdAt).toLocaleString()}</Text>
      {Object.entries(names).map(([table, name]) => <Text key={table} style={styles.text}>
        {name}: {preview.counts[table].total - preview.counts[table].deleted}
      </Text>)}
      <Text style={styles.text}>La copia también incluye el historial de las tareas.</Text>
      <Text accessibilityRole="alert" style={styles.error}>Tus datos locales serán reemplazados por esta copia. {'\n'}Los cambios no incluidos en ella se perderán.</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onApply} style={[styles.dangerButton, busy && styles.disabled]}>
        <Text style={styles.dangerButtonText}>{busy ? "Restaurando…" : "Reemplazar datos locales"}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
