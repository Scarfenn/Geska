import { useCallback } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SubtaskEditorRow({ subtask, drag, isActive, disabled, styles, theme,
  registerInput, updateText, removeDraft, insertAfter, handleSubmitEditing }) {
  const inputRef = useCallback(input => registerInput(subtask.id, input), [registerInput, subtask.id]);
  return (
    <View style={{ opacity: isActive ? 0.85 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onLongPress={drag} delayLongPress={100} disabled={disabled || isActive}
          hitSlop={12} accessibilityRole="button" accessibilityLabel="Reordenar subtarea">
          <Ionicons name="reorder-three-outline" size={26} color={theme.primaryText} />
        </TouchableOpacity>
        <Ionicons name={subtask.done ? "checkmark-circle" : "ellipse-outline"} size={20}
          color={subtask.done ? theme.doneCheck : theme.pendingCheck} style={{ marginRight: 8 }} />
        <TextInput ref={inputRef} style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Escribe una subtarea..." placeholderTextColor={theme.pendingText}
          accessibilityLabel="Texto de la subtarea" editable={!disabled} value={subtask.text}
          onChangeText={text => updateText(subtask.id, text)} returnKeyType="next" blurOnSubmit={false}
          onSubmitEditing={() => handleSubmitEditing(subtask.id)} />
        <TouchableOpacity onPress={() => removeDraft(subtask.id)} disabled={disabled}
          hitSlop={8} style={{ marginLeft: 8 }} accessibilityRole="button" accessibilityLabel="Eliminar subtarea">
          <Ionicons name="trash-outline" size={19} color={theme.danger} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity activeOpacity={0.65} onPress={() => insertAfter(subtask.id)} disabled={disabled}
        accessibilityRole="button" accessibilityLabel="Insertar subtarea debajo"
        style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        <Ionicons name="add-circle-outline" size={18} color={theme.primaryText} style={{ marginHorizontal: 8 }} />
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      </TouchableOpacity>
    </View>
  );
}
