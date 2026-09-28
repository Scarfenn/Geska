import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { themes } from "@/styles/themes";
import useAccount from "@/features/account/hooks/useAccount";
import AccountForm from "@/features/account/components/AccountForm";
import DeleteAccountConfirmation from "@/features/account/components/DeleteAccountConfirmation";
import getAccountStyles from "@/features/account/styles/accountStyles";

export default function AccountScreen({ navigation, themeName, mode }) {
  const theme = themes[themeName][mode], styles = getAccountStyles(themeName, mode);
  const [formMode, setFormMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const clearPasswords = useCallback(() => { setPassword(""); setConfirmation(""); }, []);
  const account = useAccount(clearPasswords);
  async function submit() {
    const success = await account.controller.submit({ mode: formMode, email, password, confirmation });
    if (success) { clearPasswords(); setFormMode("login"); }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" style={styles.menuButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text accessibilityRole="header" style={styles.title}>Cuenta</Text>
          </View>
          <Text style={styles.note}>Tu cuenta es opcional. Puedes usar Geska y tus tareas sin iniciar sesión.</Text>
          {account.status === "loading" && <View style={styles.form}>
            <ActivityIndicator color={theme.primaryText} />
            <Text accessibilityLiveRegion="polite" style={styles.message}>Consultando sesión…</Text>
          </View>}
          {account.message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={account.error ? styles.error : styles.message}>{account.message}</Text>}
          {account.status === "cleanup-pending" && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: account.busy }} disabled={account.busy}
            onPress={() => account.controller.retryCleanup()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{account.busy ? "Limpiando sesión…" : "Reintentar limpieza local"}</Text>
          </TouchableOpacity>}
          {account.status === "unavailable" && <TouchableOpacity accessibilityRole="button" disabled={account.busy} onPress={() => account.controller.load()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Reintentar</Text>
          </TouchableOpacity>}
          {account.status === "signed-out" && <AccountForm mode={formMode} email={email} password={password} confirmation={confirmation}
            setEmail={setEmail} setPassword={setPassword} setConfirmation={setConfirmation} busy={account.busy} theme={theme} styles={styles}
            onSubmit={submit} onToggle={() => { clearPasswords(); account.controller.clearMessage(); setFormMode(formMode === "login" ? "signup" : "login"); }} />}
          {account.status === "signed-in" && <View style={styles.form}>
            <Text style={styles.rowTitle}>Sesión iniciada</Text>
            <Text selectable style={styles.message}>{account.session.user?.email || "Cuenta conectada"}</Text>
            {!account.confirmDelete && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: account.busy, busy: account.busy }} disabled={account.busy}
              onPress={() => account.controller.logout()} style={[styles.saveButton, account.busy && styles.disabled]}>
              <Text style={styles.saveButtonText}>{account.busy ? "Cerrando sesión…" : "Cerrar sesión"}</Text>
            </TouchableOpacity>}
            {account.confirmDelete ? <DeleteAccountConfirmation busy={account.busy} styles={styles}
              onConfirm={() => account.controller.deleteAccount()} onCancel={() => account.controller.cancelDeletion()} />
              : <View style={styles.deleteSection}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: account.busy }} disabled={account.busy}
                  onPress={() => account.controller.requestDeletion()} style={styles.secondaryButton}>
                  <Text style={styles.deleteActionText}>Eliminar cuenta</Text>
                </TouchableOpacity>
              </View>}
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
