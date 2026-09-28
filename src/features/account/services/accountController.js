export function authErrorMessage(error) {
  if (error?.code === "SUPABASE_NOT_CONFIGURED") return "La cuenta no está disponible en esta instalación. Puedes seguir usando Geska sin cuenta.";
  const messages = {
    ACCOUNT_FUNCTION_NOT_DEPLOYED: "El servicio de eliminación de cuentas no está desplegado en este proyecto. No se inició la eliminación.",
    ACCOUNT_FUNCTION_AUTH_FAILED: "El servidor rechazó la autorización para eliminar la cuenta. Revisa la sesión y la configuración del servicio.",
    ACCOUNT_AUTH_CHECK_FAILED: "No se pudo comprobar la cuenta con el servicio de autenticación. No se inició la eliminación. Inténtalo de nuevo.",
    ACCOUNT_AUTH_REQUIRED: "La sesión ya no es válida. Vuelve a iniciar sesión antes de eliminar la cuenta.",
    ACCOUNT_AUTH_CHANGED: "La cuenta cambió. Vuelve a revisar la cuenta antes de confirmar.",
    ACCOUNT_STORAGE_FAILED: "No se pudo eliminar la copia en la nube. No se intentó eliminar la cuenta. Puedes reintentar.",
    ACCOUNT_AUTH_DELETE_FAILED: "La copia ya no está en la nube, pero no se pudo completar la eliminación de la cuenta. Puedes reintentar.",
    ACCOUNT_DELETE_UNCONFIRMED: "No se pudo confirmar si la cuenta fue eliminada. Comprueba tu conexión antes de reintentar. Tus datos locales siguen intactos.",
    ACCOUNT_LOCAL_CLEANUP_FAILED: "La cuenta fue eliminada. Falta limpiar la sesión de este dispositivo; reintenta la limpieza. Tus datos locales siguen intactos.",
    invalid_credentials: "El correo o la contraseña no son correctos.",
    email_not_confirmed: "Confirma tu correo antes de iniciar sesión.",
    user_already_exists: "Ya existe una cuenta con ese correo. Intenta iniciar sesión.",
    weak_password: "La contraseña no cumple los requisitos de seguridad. Prueba con una más larga.",
    over_email_send_rate_limit: "Se han enviado demasiados correos. Espera unos minutos antes de reintentar.",
    over_request_rate_limit: "Demasiados intentos. Espera unos minutos antes de reintentar.",
    signup_disabled: "El registro no está disponible en este momento.",
  };
  return messages[error?.code] || "No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.";
}

export function validateCredentials({ email, password, confirmation, mode }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Introduce un correo válido.";
  if (!password) return "Introduce tu contraseña.";
  if (mode === "signup" && password.length < 6) return "Usa una contraseña de al menos 6 caracteres.";
  if (mode === "signup" && password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}

// Screen-local state machine. Dependencies are only the public Auth facade.
// Credentials are never retained in state or diagnostics.
export function createAccountController(auth, onChange) {
  let state = { status: "loading", session: null, busy: false, message: null, error: null };
  const update = patch => { state = { ...state, ...patch }; onChange(state); };
  async function run(operation) {
    if (state.busy) return false;
    update({ busy: true, message: null, error: null });
    try { await operation(); return true; }
    catch (error) {
      update({ error, message: authErrorMessage(error),
        ...(error.code === "ACCOUNT_LOCAL_CLEANUP_FAILED" ? { status: "cleanup-pending", session: null } : {}) });
      return false;
    }
    finally { update({ busy: false }); }
  }
  return {
    getState: () => state,
    load() {
      if (state.status === "cleanup-pending") return Promise.resolve(false);
      return run(async () => {
        update({ status: "loading", confirmDelete: false });
        try {
          const session = await auth.getSession();
          update({ session, status: session ? "signed-in" : "signed-out" });
        } catch (error) { update({ status: "unavailable" }); throw error; }
      });
    },
    submit(fields) {
      if (state.busy || state.status !== "signed-out") return Promise.resolve(false);
      const validation = validateCredentials(fields);
      if (validation) { update({ message: validation, error: null }); return Promise.resolve(false); }
      return run(async () => {
        const data = await (fields.mode === "signup" ? auth.signUpWithEmail : auth.signInWithEmail)(fields.email.trim(), fields.password);
        if (data.session) update({ session: data.session, status: "signed-in" });
        else if (fields.mode === "signup") update({ message: "Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión.", session: null, status: "signed-out" });
        else throw new Error("Auth returned no session after login");
      });
    },
    logout() {
      if (state.confirmDelete) return Promise.resolve(false);
      return run(async () => {
        await auth.signOut();
        update({ session: null, status: "signed-out" });
      });
    },
    requestDeletion() {
      if (state.busy || state.status !== "signed-in") return;
      update({ confirmDelete: true, message: null, error: null });
    },
    cancelDeletion() { if (!state.busy) update({ confirmDelete: false }); },
    deleteAccount() {
      if (state.busy || state.status !== "signed-in" || !state.confirmDelete) return Promise.resolve(false);
      const userId = state.session.user.id;
      return run(async () => {
        update({ deleting: true });
        try {
          await auth.deleteAccount(userId);
          update({ session: null, status: "signed-out", message: "Cuenta eliminada. Tus datos locales siguen en este dispositivo." });
        } finally { update({ deleting: false, confirmDelete: false }); }
      });
    },
    retryCleanup() {
      if (state.status !== "cleanup-pending") return Promise.resolve(false);
      return run(async () => {
        await auth.finishAccountDeletion();
        update({ status: "signed-out", session: null, message: "Cuenta eliminada. Tus datos locales siguen en este dispositivo." });
      });
    },
    clearMessage() { if (!state.busy) update({ message: null, error: null }); },
  };
}
