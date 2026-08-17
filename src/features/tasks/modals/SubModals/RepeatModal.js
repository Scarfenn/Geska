import { useRef, useEffect } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import createStyles from "@/styles/styles";

export default function RepeatModal({
  visible,
  themeName,
  mode,
  repeatMode,
  setRepeatMode,
  openCustomRepeat,
  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      opacityAnim.setValue(0);
      slideAnim.setValue(40);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const modes = [
    { key: "none", label: "Ninguno" },
    { key: "daily", label: "Diario" },
    { key: "weekly", label: "Semanal" },
    { key: "monthly", label: "Mensual" },
  ];

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={closeModal}>
        <Animated.View
          style={[
            styles.modalOverlay,
            { opacity: opacityAnim },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalBox,
                {
                  width: "90%",
                  borderRadius: 14,
                  padding: 20,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.modalTitle}>Repetición</Text>

              {modes.map((m) => {
                const active = repeatMode === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.optionRow,
                      { justifyContent: "space-between" },
                    ]}
                    onPress={() => {
                      setRepeatMode(m.key);
                      closeModal();
                    }}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        active && { color: styles.saveButton.backgroundColor },
                      ]}
                    >
                      {m.label}
                    </Text>

                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={styles.saveButton.backgroundColor}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* OPCIÓN PERSONALIZADO */}
              <TouchableOpacity
                style={[styles.optionRow, { justifyContent: "space-between", opacity:0.5
                 }]}
                onPress={() => {
                  {/*closeModal();
                  openCustomRepeat();*/}
                  
                }}
              >
                <Text style={styles.optionLabel}>Personalizado</Text>
                <Ionicons name="chevron-forward" size={20} color={styles.text.color} />
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
