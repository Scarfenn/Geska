import { useEffect, useRef, useState } from "react";
import { Alert, Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";
import useSubtaskDraft from "../hooks/useSubtaskDraft";
import SubtaskEditorRow from "../components/SubtaskEditorRow";
import { normalizeSubtaskDraft } from "../domain/taskDraft";

export default function SubtaskModal(props) {
  return props.visible ? <SubtaskModalSession key={props.modalTaskId ?? "draft"} {...props} /> : null;
}

function SubtaskModalSession({ visible, isSaving = false, themeName, mode, subtasks = [], onSave, closeModal }) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];
  const editor = useSubtaskDraft(subtasks);
  const { draftSubtasks, setDraftSubtasks, insertAfter } = editor;
  const saving = useRef(false);
  const [localSaving, setLocalSaving] = useState(false);
  const busy = isSaving || localSaving;
  const mounted = useRef(true);
  const closing = useRef(false);
  const animation = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; animation.current?.stop(); };
  }, []);
  const opacityAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  const slideAnim =
    useRef(
      new Animated.Value(20)
    ).current;

  const scaleAnim =
    useRef(
      new Animated.Value(0.96)
    ).current;

  const animateOpen = () => {
    if (closing.current) return;
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.96);

    animation.current?.stop();
    animation.current = Animated.parallel([
      Animated.timing(
        opacityAnim,
        {
          toValue: 1,
          duration: 220,
          easing:
            Easing.out(
              Easing.cubic
            ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        slideAnim,
        {
          toValue: 0,
          duration: 220,
          easing:
            Easing.out(
              Easing.cubic
            ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        scaleAnim,
        {
          toValue: 1,
          duration: 220,
          easing:
            Easing.out(
              Easing.ease
            ),
          useNativeDriver: true,
        }
      ),
    ]);
    animation.current.start();
  };

  const animateClose = () => {
    if (closing.current || !mounted.current) return;
    closing.current = true;
    animation.current?.stop();
    animation.current = Animated.parallel([
      Animated.timing(
        opacityAnim,
        {
          toValue: 0,
          duration: 160,
          easing:
            Easing.in(
              Easing.ease
            ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        slideAnim,
        {
          toValue: 20,
          duration: 160,
          easing:
            Easing.in(
              Easing.ease
            ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        scaleAnim,
        {
          toValue: 0.96,
          duration: 160,
          easing:
            Easing.in(
              Easing.ease
            ),
          useNativeDriver: true,
        }
      ),
    ]);
    animation.current.start(({ finished }) => { if (finished && mounted.current) closeModal(); });
  };

  const requestClose = () => {
    if (!saving.current && !isSaving) animateClose();
  };
  const handleSave = async () => {
    if (saving.current || isSaving || closing.current) return;
    saving.current = true;
    setLocalSaving(true);
    try {
      // Share canonical cleanup while retaining completion state for TaskModal's draft.
      const rowsById = new Map(draftSubtasks.map(row => [String(row.id), row]));
      const cleaned = normalizeSubtaskDraft(draftSubtasks).map(row => ({
        ...row, done: !!rowsById.get(row.id)?.done,
      }));
      await onSave(cleaned);
      if (mounted.current) animateClose();
    } catch (error) {
      console.error("No se pudieron guardar las subtareas", error);
      if (mounted.current) Alert.alert("No se pudo guardar", "Revisa los datos e inténtalo de nuevo.");
    } finally {
      saving.current = false;
      if (mounted.current) setLocalSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={animateOpen}
      onRequestClose={requestClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity:
                opacityAnim,
            },
          ]}
        >
          {/* BACKDROP */}
          <TouchableWithoutFeedback
            onPress={requestClose}
          >
            <View
              style={
                StyleSheet.absoluteFillObject
              }
            />
          </TouchableWithoutFeedback>

          {/* MODAL */}
          <Animated.View
            style={[
              styles.modalBox,
              {
                width: "88%",
                maxHeight: "80%",

                borderRadius: 14,

                paddingVertical: 20,
                paddingHorizontal: 20,

                transform: [
                  {
                    translateY:
                      slideAnim,
                  },
                  {
                    scale:
                      scaleAnim,
                  },
                ],
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  marginBottom: 4,
                },
              ]}
            >
              Administrar subtareas
            </Text>

            <Text
              style={{
                color:
                  theme.inactiveCategoryText,

                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Divide la tarea en pasos más pequeños
            </Text>

            <DraggableFlatList
              data={draftSubtasks}
              activationDistance={0}
              keyExtractor={(item) =>
                item.id
              }
              onDragEnd={({ data }) =>
                !busy && setDraftSubtasks(data)
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}

              ListEmptyComponent={
                <TouchableOpacity
                  onPress={() => insertAfter()}
                  disabled={busy}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 14,
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={theme.primaryText}
                  />

                  <Text
                    style={{
                      color: theme.primaryText,
                      marginLeft: 6,
                      fontWeight: "600",
                    }}
                  >
                    Agregar subtarea
                  </Text>
                </TouchableOpacity>
              }

              renderItem={({ item, drag, isActive }) => (
                <SubtaskEditorRow subtask={item} drag={drag} isActive={isActive}
                  disabled={busy} styles={styles} theme={theme} {...editor} />
              )}
            />

            {/* GUARDAR */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  marginTop: 12,
                },
              ]}
              disabled={busy}
              onPress={handleSave}
            >
              <Text
                style={
                  styles.saveButtonText
                }
              >
                Guardar
              </Text>
            </TouchableOpacity>

            {/* CANCELAR */}
            <TouchableOpacity
              onPress={requestClose}
              style={{
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  textAlign:
                    "center",

                  color: theme.inactiveCategoryText,
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}