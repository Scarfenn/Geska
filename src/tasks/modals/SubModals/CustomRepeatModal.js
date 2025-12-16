import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import createStyles from "../../styles/styles";

export default function CustomRepeatModal({
  visible,
  themeName,
  mode,
  repeatData,
  setRepeatData,
  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const closeWithAnim = () => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 220,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(closeModal);
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[
          styles.modalOverlay,
          { justifyContent: "flex-end" },
        ]}
      >
        <Animated.View
          style={{
            width: "100%",
            height: "90%",
            backgroundColor: styles.modalBox.backgroundColor,
            borderTopRightRadius: 18,
            borderTopLeftRadius: 18,
            transform: [{ translateY: slideAnim }],
            padding: 20,
          }}
        >

          {/* HEADER */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <TouchableOpacity onPress={closeWithAnim}>
              <Ionicons name="close" size={26} color={styles.text.color} />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { fontSize: 20 }]}>
              Repetición
            </Text>

            <TouchableOpacity onPress={closeWithAnim}>
              <Text style={{ color: styles.saveButton.backgroundColor }}>
                Listo
              </Text>
            </TouchableOpacity>
          </View>

          {/* AQUÍ VAN LOS BLOQUES DE OPCIONES */}
          <View style={{ flex: 1 }}>

            {/* INTERVALO */}
            <Text style={styles.optionLabel}>Intervalo</Text>

            {/* ... input numérico */}
            {/* ... selector de modo (día/semana/mes) */}

            {/* SEMANAL — días */}
            {/* Mostrar solo si repeatData.mode === 'weekly' */}

            {/* MENSUAL — día exacto / ordinal */}
            {/* Mostrar si repeatData.mode === 'monthly' */}

            {/* FIN DE REPETICIÓN */}
            <Text style={[styles.optionLabel, { marginTop: 25 }]}>
              Fin de repetición
            </Text>

            {/* Opciones */}
            {/* Sin fin */}
            {/* Hasta fecha */}
            {/* Después de X repeticiones */}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
