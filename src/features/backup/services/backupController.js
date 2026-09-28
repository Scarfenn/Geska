export function backupErrorMessage(error) {
  const messages = {
    BACKUP_UPLOAD_BUSY: "Ya hay una copia en curso. Espera a que termine y actualiza la información.",
    BACKUP_TOO_LARGE: "La copia supera el límite de restauración (20 MiB o 100.000 registros). No se reemplazó la copia remota.",
    BACKUP_INVALID: "Los datos no cumplen el formato de restauración. No se reemplazó la copia remota.",
    RESTORE_INVALID_JSON: "El archivo de respaldo está dañado y no se puede leer. No se cambiaron los datos locales.",
    RESTORE_INVALID_BACKUP: "La copia contiene datos o relaciones inválidos. No se cambiaron los datos locales.",
    RESTORE_INCOMPATIBLE_VERSION: "Esta versión de la copia no es compatible con Geska. No se cambiaron los datos locales.",
    RESTORE_TOO_LARGE: "La copia supera el límite de restauración (20 MB o 100.000 registros).",
    RESTORE_DOWNLOAD_FAILED: "No se pudo descargar la copia. Revisa tu conexión.",
    RESTORE_WRITE_FAILED: "No se pudo restaurar. Se conservaron los datos locales.",
    RESTORE_NOT_PREPARED: "Descarga y revisa nuevamente la copia antes de restaurar.",
    LOCAL_DATA_REPLACED: "Se están restaurando los datos. Espera y vuelve a abrir la acción.",
    SUPABASE_NOT_CONFIGURED: "Las copias en la nube no están disponibles en esta instalación. Tus datos locales siguen disponibles.",
    BACKUP_AUTH_REQUIRED: "Inicia sesión para crear respaldos en la nube.",
    BACKUP_AUTH_CHANGED: "La cuenta cambió. Actualiza la información antes de continuar.",
    BACKUP_AUTH_FAILED: "No se pudo comprobar la sesión. Revisa tu conexión e inténtalo de nuevo.",
    BACKUP_METADATA_FAILED: "No se pudo consultar la última copia. Revisa tu conexión e inténtalo de nuevo.",
    BACKUP_SNAPSHOT_FAILED: "No se pudo preparar la copia local. Inténtalo de nuevo.",
    BACKUP_SERIALIZATION_FAILED: "No se pudo preparar el archivo de respaldo.",
    BACKUP_UPLOAD_FAILED: "No se pudo confirmar la subida. Revisa tu conexión y actualiza la información antes de reintentar.",
  };
  return messages[error?.code] || "No se pudo completar la operación. Inténtalo de nuevo.";
}

export function createBackupController(service, onChange) {
  let state = { status: "loading", busy: false, remote: null, userId: null, error: null, message: null };
  let pending = null;
  let uploadReturnStatus = null;
  let preview = null;
  let preparation = 0;
  const discard = () => { preparation++; service.discardRestore?.(preview); preview = null; };
  const update = patch => { state = { ...state, ...patch }; onChange(state); };
  const fail = error => update({
    status: error?.code === "SUPABASE_NOT_CONFIGURED" ? "unconfigured" : error?.code === "BACKUP_AUTH_REQUIRED" ? "signed-out" : "error",
    error, message: backupErrorMessage(error), remote: null, userId: null, preview: null,
  });
  const run = (operation, { preserveWarning = false } = {}) => {
    if (state.busy) return pending;
    update({ busy: true, error: null, message: null, ...(preserveWarning ? {} : { warning: null }) });
    pending = Promise.resolve().then(operation).catch(fail).finally(() => { update({ busy: false }); pending = null; });
    return pending;
  };
  const performUpload = () => {
    return run(async () => {
      update({ status: "uploading" });
      const result = await service.uploadBackup();
      update({ status: "success", remote: result.remote, userId: result.userId,
        error: result.metadataError, message: result.metadataError
          ? "Copia creada; no se pudo actualizar la información de la última copia."
          : "Copia creada correctamente." });
    });
  };
  return {
    getState: () => state,
    // A focus refresh waits for an in-flight upload instead of overlapping it.
    async refresh(isActive = () => true) {
      if (pending) await pending;
      if (!isActive()) return;
      discard();
      return run(async () => {
        update({ preview: null, status: "loading", remote: null, userId: null });
        const result = await service.getCurrentBackup();
        update({ status: result.remote ? "ready" : "empty", ...result });
      }, { preserveWarning: true });
    },
    cancelPreparation() {
      if (state.status === "restoring") return;
      discard();
      if (!state.busy && state.status === "confirm-restore") update({ preview: null, status: state.remote ? "ready" : "empty" });
    },
    prepare() {
      if (state.busy || !state.remote) return pending;
      discard();
      const request = preparation;
      return run(async () => {
        update({ status: "preparing", preview: null });
        const downloaded = await service.prepareRestore();
        if (request !== preparation) { service.discardRestore(downloaded); return; }
        preview = downloaded;
        update({ status: "confirm-restore", preview });
      });
    },
    apply() {
      if (state.busy || state.status !== "confirm-restore" || !preview) return pending;
      return run(async () => {
        update({ status: "restoring" });
        const result = await service.applyRestore(preview);
        discard();
        update({ status: "restored", preview: null, message: "Los datos locales se restauraron correctamente.", warning: result.reminderWarning, error: result.reminderError || null });
      });
    },
    cancelUpload() {
      if (state.busy || state.status !== "confirm-upload") return;
      update({ status: uploadReturnStatus });
      uploadReturnStatus = null;
    },
    confirmUpload() {
      if (state.busy || state.status !== "confirm-upload") return pending;
      uploadReturnStatus = null;
      return performUpload();
    },
    upload() {
      if (state.busy || !["ready", "empty", "success", "restored"].includes(state.status)) return pending;
      if (state.remote || state.status === "success") {
        uploadReturnStatus = state.status;
        update({ status: "confirm-upload" });
        return;
      }
      return performUpload();
    },
  };
}
