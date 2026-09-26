import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { themes } from "@/styles/themes"

export default function ThemeSelector({
  themeName,
  mode,
  setThemeName,
  setMode,
  renderTrigger,
}) {
  const theme = themes[themeName][mode];

  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const contentAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  const themeKeys = [
    "basic",
    "pastel",
    "ocean",
    "forest",
    "coffee",
    "sunrise",
    "sunset",
    "orchid",
    "amethyst",
  ];

  // Cuando isOpen cambia → animar
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);

      Animated.spring(contentAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 6,
      }).start();
    } else {
      Animated.timing(contentAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => setIsMounted(false)); // desmontar luego
    }
  }, [isOpen]);

  // Animación del botón
  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const scaleButton = pressAnim;
  const scaleMenu = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });
  const opacityMenu = contentAnim;

  return (
    <View style={{ position: "relative" }}>
      {/* BOTÓN */}
      {renderTrigger ? renderTrigger({ onPress: () => setIsOpen(!isOpen), expanded: isOpen }) : (
      <Animated.View style={{ transform: [{ scale: scaleButton }] }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Seleccionar tema"
          accessibilityState={{ expanded: isOpen }}
          hitSlop={4}
          activeOpacity={0.8}
          onPress={() => setIsOpen(!isOpen)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: theme.card,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name="color-palette" size={20} color={theme.text} />
        </TouchableOpacity>
      </Animated.View>
      )}

      {/* OVERLAY */}
      {isMounted && (
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View
            style={{
              position: "absolute",
              top: -50,
              bottom: -1000,
              left: -500,
              right: -20,
              backgroundColor: "transparent",
              zIndex: 98,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      {/* MENÚ ANIMADO */}
      {isMounted && (
        <Animated.View
          style={{
            position: "absolute",
            right: 0,
            top: renderTrigger ? "100%" : 50,
            padding: 14,
            borderRadius: 14,
            width: 270,
            backgroundColor: theme.card,

            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 8,

            opacity: opacityMenu,
            transform: [{ scale: scaleMenu }],
            zIndex: 99,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {themeKeys.map((t) => (
              <TouchableOpacity
                key={t}
                accessibilityRole="button"
                accessibilityLabel={`Tema ${t}`}
                accessibilityState={{ selected: themeName === t }}
                onPress={() => {
                  setThemeName(t);
                  setIsOpen(false);
                }}
                style={{
                  width: "30%",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderRadius: 10,

                  backgroundColor:
                    themeName === t
                      ? theme.inactiveCategory
                      : "transparent",
                }}
              >
                <LinearGradient
                  colors={[
                    themes[t][mode].primary,
                    themes[t][mode].inactiveCategory,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: themeName === t ? 1.5 : 0,
                    borderColor: theme.primary + "80",
                    marginBottom: 5,
                  }}
                />

                <Text
                  style={{
                    color: theme.text,
                    fontSize: 11,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: theme.border,
              marginVertical: 12,
            }}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Cambiar a modo ${mode === "light" ? "oscuro" : "claro"}`}
            onPress={() =>
              setMode(mode === "light" ? "dark" : "light")
            }
            style={{
              minHeight: 48,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
              }}
            >
              Modo
            </Text>

            {mode === "light" ? (
              <Ionicons
                name="sunny"
                size={22}
                color="#FDB813"
              />
            ) : (
              <Ionicons
                name="moon"
                size={22}
                color="#F5F5F5"
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}
