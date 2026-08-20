import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import DraggableFlatList from "react-native-draggable-flatlist";

import { Ionicons } from "@expo/vector-icons";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

export default function AddSubtaskModal({
  visible,
  themeName,
  mode,

  modalTaskId,
  subtasks = [],

  onSave,
  closeModal,
}) {
  const styles =
    createStyles(themeName, mode);

  const theme =
    themes[themeName][mode];

  const [
    draftSubtasks,
    setDraftSubtasks,
  ] = useState([]);

  const inputRefs =
    useRef({});

  const tempId =
    useRef(0);

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

  // ======================================================
  // DRAFT
  // ======================================================

  const createDraftSubtask = () => ({
    id: `new-${Date.now()}-${tempId.current++}`,
    text: "",
    done: false,
    sort_order: null,
    isNew: true,
  });

  useEffect(() => {
    if (!visible) return;

    tempId.current = 0;
    inputRefs.current = {};

    if (subtasks.length) {
      setDraftSubtasks(
        subtasks.map((subtask, index) => ({
          id: String(subtask.id),
          text: subtask.text || "",
          done: !!subtask.done,
          sort_order: subtask.sort_order ?? index,
          isNew: false,
        }))
      );

      return;
    }

    setDraftSubtasks([
      createDraftSubtask(),
    ]);
  }, [visible]);

  // ======================================================
  // ANIMACIONES
  // ======================================================

  const animateOpen = () => {
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.96);

    Animated.parallel([
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
    ]).start();
  };

  const animateClose = () => {
    Animated.parallel([
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
    ]).start(closeModal);
  };

  // ======================================================
  // EDICIÓN
  // ======================================================

  const updateText = (
    id,
    text
  ) => {
    setDraftSubtasks(
      (current) =>
        current.map(
          (subtask) =>
            subtask.id === id
              ? {
                  ...subtask,
                  text,
                }
              : subtask
        )
    );
  };

  const insertAfter = (
    index,
    focus = true
  ) => {
    const newSubtask =
      createDraftSubtask();

    setDraftSubtasks(
      (current) => {
        const next =
          [...current];

        next.splice(
          index + 1,
          0,
          newSubtask
        );

        return next;
      }
    );

    if (focus) {
      requestAnimationFrame(
        () => {
          inputRefs.current[
            newSubtask.id
          ]?.focus();
        }
      );
    }
  };

  const addFirstSubtask = () => {
    const newSubtask =
      createDraftSubtask();

    setDraftSubtasks([
      newSubtask,
    ]);

    requestAnimationFrame(
      () => {
        inputRefs.current[
          newSubtask.id
        ]?.focus();
      }
    );
  };

  const removeDraft = (id) => {
    setDraftSubtasks(
      (current) =>
        current.filter(
          (subtask) =>
            subtask.id !== id
        )
    );

    delete inputRefs.current[id];
  };

  const handleSubmitEditing = (
    index
  ) => {
    const current =
      draftSubtasks[index];

    if (
      !current?.text?.trim()
    ) {
      return;
    }

    insertAfter(index);
  };

  // ======================================================
  // GUARDAR
  // ======================================================

  const handleSave = async () => {
    const cleaned =
      draftSubtasks
        .map((subtask) => ({
          ...subtask,
          text: subtask.text.trim(),
        }))
        .filter(
          (subtask) =>
            subtask.text.length > 0
        )
        .map((subtask, index) => ({
          ...subtask,
          sort_order: index,
        }));

    await onSave(cleaned);

    animateClose();
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={animateOpen}
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
            onPress={animateClose}
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
                setDraftSubtasks(data)
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}

              ListEmptyComponent={
                <TouchableOpacity
                  onPress={addFirstSubtask}
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
                    color={theme.primary}
                  />

                  <Text
                    style={{
                      color: theme.primary,
                      marginLeft: 6,
                      fontWeight: "600",
                    }}
                  >
                    Agregar subtarea
                  </Text>
                </TouchableOpacity>
              }

              renderItem={({
                item: subtask,
                drag,
                isActive,
                getIndex,
              }) => {
                const index =
                  getIndex();

                return (
                  <View
                    style={{
                      opacity:
                        isActive ? 0.85 : 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* HANDLE DRAG */}
                      <TouchableOpacity
                        onLongPress={() => {
                          console.log("DRAG START");
                          drag();
                        }}
                        delayLongPress={100}
                        disabled={isActive}
                        hitSlop={12}
                      >
                        <Ionicons
                          name="reorder-three-outline"
                          size={26}
                          color={theme.primary}
                        />
                      </TouchableOpacity>

                      <Ionicons
                        name={
                          subtask.done
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={20}
                        color={
                          subtask.done
                            ? styles.doneCheck.color
                            : styles.pendingCheck.color
                        }
                        style={{
                          marginRight: 8,
                        }}
                      />

                      <TextInput
                        ref={(ref) => {
                          if (ref) {
                            inputRefs.current[
                              subtask.id
                            ] = ref;
                          }
                        }}
                        style={[
                          styles.input,
                          {
                            flex: 1,
                            marginBottom: 0,
                          },
                        ]}
                        placeholder="Escribe una subtarea..."
                        placeholderTextColor={
                          styles.placeholder.color
                        }
                        value={subtask.text}
                        onChangeText={(text) =>
                          updateText(
                            subtask.id,
                            text
                          )
                        }
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() =>
                          handleSubmitEditing(
                            index
                          )
                        }
                      />

                      <TouchableOpacity
                        onPress={() =>
                          removeDraft(
                            subtask.id
                          )
                        }
                        hitSlop={8}
                        style={{
                          marginLeft: 8,
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color="red"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* + ENTRE SUBTAREAS */}
                    <TouchableOpacity
                      activeOpacity={0.65}
                      onPress={() =>
                        insertAfter(index)
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginVertical: 5,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor:
                            theme.border,
                        }}
                      />

                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={theme.primary}
                        style={{
                          marginHorizontal: 8,
                        }}
                      />

                      <View
                        style={{
                          flex: 1,
                          height: 1,
                          backgroundColor:
                            theme.border,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />

            {/* GUARDAR */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  marginTop: 12,
                },
              ]}
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
              onPress={animateClose}
              style={{
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  textAlign:
                    "center",

                  color: "red",
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