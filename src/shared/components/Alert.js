import { Modal, View, Text, TouchableWithoutFeedback, Animated, Easing } from "react-native";
import { useRef, useEffect } from "react";
import createStyles from "@/tasks/styles/styles";

export default function ConfirmDialog({
  visible,
  themeName,
  mode,
  title,
  message,
  onCancel,
  onConfirm
}) {

  const styles = createStyles(themeName, mode);

  // Animaciones
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.8);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible]);


  return (
  <Modal transparent visible={visible} animationType="none">
    <TouchableWithoutFeedback onPress={onCancel}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          opacity: opacity,
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <TouchableWithoutFeedback>
          <Animated.View
            style={{
              width: "75%",
              padding: 20,
              backgroundColor: styles.modalBox.backgroundColor,
              borderRadius: 14,
              transform: [{ scale }]
            }}
          >
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={[styles.text, { marginBottom: 10 }]}>{message}</Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text onPress={onCancel} style={{ color: "red", fontSize: 16, marginTop: 6 }}>
                  Cancelar
                </Text>

                <Text
                  onPress={onConfirm}
                  style={{
                    color: styles.saveButtonText.color,
                    backgroundColor: styles.saveButton.backgroundColor,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6
                  }}
                >
                  Confirmar
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
