import useAndroidAppTheme from "@/hooks/useAndroidAppTheme";
import * as SplashScreen from "expo-splash-screen";
import useAndroidNavigationBar from "@/hooks/useAndroidNavigationBar";
import useThemePreferences from "@/hooks/useThemePreferences";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import TasksScreen from "@/features/tasks/TasksScreen";
import CalendarScreen from "@/features/calendar/CalendarScreen";
import AccountScreen from "@/features/account/AccountScreen";
import ThemeScreen from "@/features/settings/ThemeScreen";
import SettingsScreen from "@/features/settings/SettingsScreen";
import CustomDrawer from "@/components/CustomDrawer";

import { Ionicons } from "@expo/vector-icons";

// Keep the native splash visible until the saved theme has loaded.
SplashScreen.preventAutoHideAsync().catch(console.warn);

const Drawer = createDrawerNavigator();

export default function App() {
  const { themeName, mode, setThemeName, setMode, isThemeLoaded, currentTheme } = useThemePreferences();

  useAndroidAppTheme(mode, isThemeLoaded);
  useAndroidNavigationBar(mode, isThemeLoaded);

  const baseTheme = mode === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: currentTheme.background,
      card: currentTheme.card,
      text: currentTheme.text,
      border: currentTheme.border,
      primary: currentTheme.primary,
    },
  };

  if (!isThemeLoaded) return null;

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: currentTheme.background }}
      onLayout={() => SplashScreen.hideAsync().catch(console.warn)}
    >
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
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
              drawerIcon: ({ color, size }) => 
                <Ionicons
                  name="checkmark-circle-outline"
                  size={size}
                  color={color}
                />
            }}
          >
            {(props) => 
              <TasksScreen
                {...props}
                themeName={themeName}
                mode={mode}
                setThemeName={setThemeName}
                setMode={setMode}
              />
            }
          </Drawer.Screen>

          <Drawer.Screen
            name="Ajustes"
            options={{ 
              drawerIcon: ({ color, size }) => 
              <Ionicons 
                name="settings-outline" 
                size={size} 
                color={color} 
              /> 
            }}
          >
            {props => 
              <SettingsScreen 
                {...props} 
                themeName={themeName} 
                mode={mode} 
                />
              }
          </Drawer.Screen>

          <Drawer.Screen name="ThemeScreen" options={{ drawerItemStyle: { display: "none" }, swipeEnabled: false }}>
            {props => <ThemeScreen {...props} themeName={themeName} mode={mode} setThemeName={setThemeName} setMode={setMode} />}
          </Drawer.Screen>

          <Drawer.Screen name="Cuenta" options={{ drawerItemStyle: { display: "none" }, swipeEnabled: false }}>
            {props => <AccountScreen {...props} themeName={themeName} mode={mode} />}
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
