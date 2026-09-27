import { useCallback, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { themes } from "@/styles/themes";
import getBackupStyles from "@/features/backup/styles/backupStyles";
import UploadConfirmation from "@/features/backup/components/UploadConfirmation";
import RestoreConfirmation from "@/features/backup/components/RestoreConfirmation";

export default function BackupConfirmationScreen({ navigation, route, themeName, mode, backup }) {
  const theme = themes[themeName][mode], styles = getBackupStyles(themeName, mode);
  const restoring = route.name === "RestoreConfirmation";
  const pending = useRef(false);
  const { controller } = backup;
  const cancel = useCallback(() => {
    if (restoring) controller.cancelPreparation();
    else controller.cancelUpload();
  }, [controller, restoring]);

  // Includes header Back, Android Back and the iOS stack gesture. The controller
  // discards unconfirmed work but never pretends to cancel an operation in flight.
  useFocusEffect(useCallback(() => () => cancel(), [cancel]));

  function goBack() {
    cancel();
    navigation.goBack();
  }
  async function confirm() {
    if (pending.current || controller.getState().busy) return;
    pending.current = true;
    try {
      await (restoring ? controller.apply() : controller.confirmUpload());
      // Results and errors are displayed on Copias. Do not pop another screen
      // if the user already went back while the operation was running.
      if (navigation.isFocused()) navigation.goBack();
    } finally {
      pending.current = false;
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a Copias de seguridad" style={styles.menuButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>{restoring ? "Restaurar copia" : "Subir copia"}</Text>
        </View>
        <View style={styles.panel}>
          {restoring ? backup.preview && (
            <RestoreConfirmation preview={backup.preview} busy={backup.busy} styles={styles} onApply={confirm} onCancel={goBack} />
          ) : (
            <UploadConfirmation remote={backup.remote} busy={backup.busy} styles={styles} onConfirm={confirm} onCancel={goBack} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
