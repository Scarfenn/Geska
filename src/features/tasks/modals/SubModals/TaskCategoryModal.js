import { useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

export default function TaskCategoryModal({
  visible,
  themeName,
  mode,

  categories = [],
  selectedCategory,

  onSelectCategory,
  openAddCategoryModal,

  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const opacityAnim = useRef(
    new Animated.Value(0)
  ).current;

  const slideAnim = useRef(
    new Animated.Value(15)
  ).current;

  const scaleAnim = useRef(
    new Animated.Value(0.97)
  ).current;

  const animateOpen = () => {
    opacityAnim.setValue(0);
    slideAnim.setValue(15);
    scaleAnim.setValue(0.97);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = (callback) => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 15,
        duration: 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeModal();
      callback?.();
    });
  };

  const handleSelect = (categoryId) => {
    onSelectCategory(categoryId);
    animateClose();
  };

  const handleCreateCategory = () => {
    animateClose(() => {
      openAddCategoryModal?.();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={animateOpen}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback
          onPress={() => animateClose()}
        >
          <View
            style={StyleSheet.absoluteFillObject}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalBox,
            {
              width: "82%",
              borderRadius: 14,
              paddingVertical: 18,
              paddingHorizontal: 18,

              transform: [
                {
                  translateY: slideAnim,
                },
                {
                  scale: scaleAnim,
                },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                marginBottom: 12,
              },
            ]}
          >
            Categoría
          </Text>

          {/* Sin categoría */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.optionRow,
              {
                justifyContent: "space-between",
              },
            ]}
            onPress={() => handleSelect(null)}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="pricetag-outline"
                size={19}
                color={
                  selectedCategory === null
                    ? theme.primary
                    : theme.inactiveCategoryText
                }
              />

              <Text
                style={[
                  styles.optionLabel,
                  {
                    marginLeft: 8,
                  },

                  selectedCategory === null && {
                    color: theme.primaryText,
                    fontWeight: "600",
                  },
                ]}
              >
                Sin categoría
              </Text>
            </View>

            {selectedCategory === null && (
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.primaryText}
              />
            )}
          </TouchableOpacity>

          {/* Categorías disponibles */}
          {categories.map((category) => {
            const active =
              selectedCategory === category.id;

            return (
              <TouchableOpacity
                key={category.id}
                activeOpacity={0.7}
                style={[
                  styles.optionRow,
                  {
                    justifyContent:
                      "space-between",
                  },
                ]}
                onPress={() =>
                  handleSelect(category.id)
                }
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name={
                      active
                        ? "pricetag"
                        : "pricetag-outline"
                    }
                    size={19}
                    color={
                      active
                        ? theme.primaryText
                        : styles.iconColor.color
                    }
                  />

                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        marginLeft: 8,
                      },

                      active && {
                        color: theme.primaryText,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                </View>

                {active && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.primaryText}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Crear categoría */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.optionRow,
              {
                marginTop: 2,
                justifyContent: "flex-start",
              },
            ]}
            onPress={handleCreateCategory}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={theme.primaryText}
            />

            <Text
              style={[
                styles.optionLabel,
                {
                  marginLeft: 8,
                  color: theme.primaryText,
                  fontWeight: "600",
                },
              ]}
            >
              Nueva categoría
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}