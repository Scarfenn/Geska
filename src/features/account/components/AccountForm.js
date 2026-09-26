import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from "react-native-reanimated";

const formTransition = LinearTransition.duration(220).reduceMotion(ReduceMotion.System);
const fieldEnter = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const fieldExit = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

export default function AccountForm({ mode, email, password, confirmation, setEmail, setPassword, setConfirmation, onSubmit, onToggle, busy, theme, styles }) {
  const signup = mode === "signup";
  return (
    <Animated.View style={styles.form} layout={formTransition} collapsable={false}>
      <Animated.Text key={mode} entering={fieldEnter} accessibilityRole="header" style={styles.rowTitle}>{signup ? "Crear cuenta" : "Iniciar sesión"}</Animated.Text>
      <View>
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput accessibilityLabel="Correo electrónico" style={styles.input} value={email} onChangeText={setEmail} editable={!busy}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
      </View>
      <View>
        <Text style={styles.label}>Contraseña</Text>
        <TextInput accessibilityLabel="Contraseña" style={styles.input} value={password} onChangeText={setPassword} editable={!busy}
          secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={signup ? "new-password" : "current-password"}
          textContentType={signup ? "newPassword" : "password"} />
      </View>
      {signup && <Animated.View entering={fieldEnter} exiting={fieldExit} layout={formTransition}>
        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput accessibilityLabel="Confirmar contraseña" style={styles.input} value={confirmation} onChangeText={setConfirmation} editable={!busy}
          secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" />
      </Animated.View>}
      <Animated.View layout={formTransition}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onSubmit} style={[styles.saveButton, busy && styles.disabled]}>
        <Text style={styles.saveButtonText}>{busy ? "Procesando…" : signup ? "Crear cuenta" : "Iniciar sesión"}</Text>
        {busy && <ActivityIndicator color={theme.onPrimary} />}
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onToggle} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>{signup ? "Ya tengo cuenta" : "Crear una cuenta"}</Text>
      </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}
