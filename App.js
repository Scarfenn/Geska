import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";

import TasksScreen from "./src/shared/screens/TasksScreen";
import CookScreen from "./src/shared/screens/CookScreen";
import CalendarScreen from "./src/shared/screens/CalendarScreen";
import CustomDrawer from "./src/shared/components/CustomDrawer";
import { initNotifications } from "./src/shared/components/notifications";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes } from "./src/tasks/styles/themes";
import { Ionicons } from "@expo/vector-icons";

const Drawer = createDrawerNavigator();

export default function App() {
  const [themeName, setThemeName] = useState("basic");
  const [mode, setMode] = useState("light");
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [tasksVersion, setTasksVersion] = useState(0);

  const handleExternalTaskCreated = () => {
    setTasksVersion(v => v + 1);
  };

    useEffect(() => {
    initNotifications();
  }, []);

  // ============================
  // Cargar tema desde AsyncStorage
  // ============================
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("themeName");
        const savedMode = await AsyncStorage.getItem("mode");

        if (savedTheme) setThemeName(savedTheme);
        if (savedMode) setMode(savedMode);

        setIsThemeLoaded(true);
      } catch (e) {
        console.log(e);
      }
    };
    loadTheme();
  }, []);

  // Guardar tema
  useEffect(() => {
    if (isThemeLoaded) {
      AsyncStorage.setItem("themeName", themeName);
      AsyncStorage.setItem("mode", mode);
    }
  }, [themeName, mode, isThemeLoaded]);

  const currentTheme = themes[themeName][mode];

  if (!isThemeLoaded) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Drawer.Navigator
            drawerContent={(props) => (
            <CustomDrawer
              {...props}
              themeName={themeName}
              mode={mode}
              setThemeName={setThemeName}
              setMode={setMode}
            />
          )}
          screenOptions={{
            headerShown: false,
            drawerStyle: {
              backgroundColor: currentTheme.card,
              width: 250,
            },
            drawerActiveTintColor: currentTheme.primary,
            drawerInactiveTintColor: currentTheme.text,
            drawerLabelStyle: {
              fontSize: 16,
              marginLeft: -10,
            },
          }}
        >
          {/* ============================
              PANTALLA PRINCIPAL: TAREAS
          ============================= */}
          <Drawer.Screen
            name="Tareas"
            options={{
              drawerIcon: ({ color, size }) => (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={size}
                  color={color}
                />
              ),
            }}
          >
            {(props) => (
              <TasksScreen
                {...props}
                themeName={themeName}
                mode={mode}
                setThemeName={setThemeName}
                setMode={setMode}
                tasksVersion={tasksVersion} 
              />
            )}
          </Drawer.Screen>

          {/* =============================
              PANTALLA COCINA
          ============================== */}
            <Drawer.Screen
              name="Cocina"
              options={{
                drawerIcon: ({ color, size }) => (
                  <Ionicons name="restaurant-outline" size={size} color={color} />
                ),
              }}
            >
              {(props) => (
                <CookScreen
                  {...props}
                  onTaskCreated={handleExternalTaskCreated}
                  themeName={themeName}
                  mode={mode}
                  setThemeName={setThemeName}
                  setMode={setMode}
                />
              )}
            </Drawer.Screen>

          {/* ============================
              PANTALLA CALENDARIO
          ============================= */}
          {/*<Drawer.Screen
            name="Calendario"
            options={{
              drawerIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              ),
            }}
          >
            {(props) => (
              <CalendarScreen
                {...props}
                themeName={themeName}
                mode={mode}
              />
            )}
          </Drawer.Screen>*/}
        </Drawer.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
