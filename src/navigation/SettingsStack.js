import { Easing, Platform } from "react-native";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { createStackNavigator, CardStyleInterpolators } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import SettingsScreen from "@/features/settings/SettingsScreen";
import ThemeScreen from "@/features/settings/ThemeScreen";
import AccountScreen from "@/features/account/AccountScreen";
import BackupConfirmationScreen from "@/features/backup/BackupConfirmationScreen";
import useBackup from "@/features/backup/hooks/useBackup";
import BackupScreen from "@/features/backup/BackupScreen";
import { themes } from "@/styles/themes";

// Keep navigator identity stable when theme preferences change.
const Stack = createStackNavigator();
const BackupStack = createStackNavigator();
const transitionSpec = {
  open: { animation: "timing", config: { duration: 220, easing: Easing.out(Easing.cubic) } },
  close: { animation: "timing", config: { duration: 180, easing: Easing.out(Easing.cubic) } },
};

export function settingsDrawerOptions({ route }) {
  const focusedScreen = getFocusedRouteNameFromRoute(route) ?? "SettingsHome";
  return {
    swipeEnabled: focusedScreen === "SettingsHome",
    drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
  };
}

function stackOptions(themeName, mode) {
  return {
    headerShown: false,
    gestureEnabled: Platform.OS === "ios",
    gestureDirection: "horizontal",
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    transitionSpec,
    cardStyle: { backgroundColor: themes[themeName][mode].background },
  };
}

export function BackupFlow({ themeName, mode }) {
  // Focus belongs to the whole flow: pushing a confirmation must not discard
  // the prepared restore or refresh the remote backup metadata.
  const backup = useBackup();
  return (
    <BackupStack.Navigator initialRouteName="BackupHome" screenOptions={stackOptions(themeName, mode)}>
      <BackupStack.Screen name="BackupHome">
        {props => <BackupScreen {...props} backup={backup} themeName={themeName} mode={mode} />}
      </BackupStack.Screen>
      <BackupStack.Screen name="UploadConfirmation">
        {props => <BackupConfirmationScreen {...props} backup={backup} themeName={themeName} mode={mode} />}
      </BackupStack.Screen>
      <BackupStack.Screen name="RestoreConfirmation">
        {props => <BackupConfirmationScreen {...props} backup={backup} themeName={themeName} mode={mode} />}
      </BackupStack.Screen>
    </BackupStack.Navigator>
  );
}

export default function SettingsStack({ themeName, mode, setThemeName, setMode }) {
  return (
    <Stack.Navigator
      initialRouteName="SettingsHome"
      screenOptions={stackOptions(themeName, mode)}
    >
      <Stack.Screen name="SettingsHome">
        {props => <SettingsScreen {...props} themeName={themeName} mode={mode} />}
      </Stack.Screen>
      <Stack.Screen name="ThemeScreen">
        {props => <ThemeScreen {...props} themeName={themeName} mode={mode} setThemeName={setThemeName} setMode={setMode} />}
      </Stack.Screen>
      <Stack.Screen name="Cuenta">
        {props => <AccountScreen {...props} themeName={themeName} mode={mode} />}
      </Stack.Screen>
      <Stack.Screen name="BackupScreen">
        {props => <BackupFlow {...props} themeName={themeName} mode={mode} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
