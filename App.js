import useThemePreferences from "@/hooks/useThemePreferences";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import TasksScreen from "@/features/tasks/TasksScreen";
import CalendarScreen from "@/features/calendar/CalendarScreen";
import CustomDrawer from "@/components/CustomDrawer";

import { Ionicons } from "@expo/vector-icons";

const Drawer = createDrawerNavigator();

export default function App() {
  const { themeName, mode, setThemeName, setMode, isThemeLoaded, currentTheme } = useThemePreferences();

  if (!isThemeLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          {/* PANTALLA TAREAS */}
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
              />
            )}
          </Drawer.Screen>

          {/* PANTALLA CALENDARIO */}
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
    </GestureHandlerRootView>
  );
}
