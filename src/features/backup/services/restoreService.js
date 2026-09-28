import { getSession } from "@/storage/supabase/auth";
import { downloadBackupFile } from "@/storage/supabase/backupStorage";
import { parseBackupDocument, MAX_RESTORE_BYTES } from "@/features/backup/domain/backupValidation";
import { replaceDatabaseFromBackup, getAllTasks, updateTaskNotificationIds } from "@/storage/database";
import { syncTaskReminders } from "@/features/tasks/services/notifications";

const preparedDocuments = new WeakMap();
let applying = false;
function fail(code, message, cause) { const error = new Error(message); error.code = code; if (cause) error.cause = cause; throw error; }
async function userId() {
  let session;
  try { session = await getSession(); }
  catch (cause) {
    if (cause?.code === "SUPABASE_NOT_CONFIGURED") throw cause;
    fail("BACKUP_AUTH_FAILED", "No se pudo comprobar la sesión", cause);
  }
  if (!session?.user?.id || !session.access_token) fail("BACKUP_AUTH_REQUIRED", "Inicia sesión para restaurar");
  return session.user.id;
}
export async function prepareRestore() {
  const owner = await userId();
  let json;
  try { json = await downloadBackupFile(owner, MAX_RESTORE_BYTES); }
  catch (cause) {
    if (cause?.code === "SUPABASE_NOT_CONFIGURED" || cause?.code === "RESTORE_TOO_LARGE") throw cause;
    fail("RESTORE_DOWNLOAD_FAILED", "No se pudo descargar la copia", cause);
  }
  const document = parseBackupDocument(json);
  if (await userId() !== owner) fail("BACKUP_AUTH_CHANGED", "La cuenta cambió durante la descarga");
  const counts = Object.fromEntries(Object.entries(document.tables).map(([name, rows]) => [name, Object.freeze({ total: rows.length, deleted: rows.filter(row => row.deleted_at !== null).length })]));
  const preview = Object.freeze({ createdAt: document.createdAt, formatVersion: document.formatVersion, schemaVersion: document.schemaVersion, counts: Object.freeze(counts) });
  preparedDocuments.set(preview, { document, owner });
  return preview;
}
export function discardRestore(preview) { if (preview) preparedDocuments.delete(preview); }
export async function applyRestore(preview) {
  if (applying) fail("RESTORE_BUSY", "Ya hay una restauración en curso");
  const prepared = preparedDocuments.get(preview);
  if (!prepared) fail("RESTORE_NOT_PREPARED", "Vuelve a descargar y revisar la copia");
  applying = true;
  try {
    if (await userId() !== prepared.owner) fail("BACKUP_AUTH_CHANGED", "La cuenta cambió. Vuelve a preparar la copia.");
    let counts;
    try { counts = await replaceDatabaseFromBackup(prepared.document); }
    catch (cause) { fail("RESTORE_WRITE_FAILED", "No se pudo restaurar. Se conservaron los datos locales.", cause); }
    preparedDocuments.delete(preview);
    // COMMIT has completed. Native APIs cannot participate in the SQL rollback.
    let reminderWarning = null;
    try {
      // Reconciliation consumes the durable cleanup marker committed by SQLite.
      const results = await syncTaskReminders(getAllTasks, updateTaskNotificationIds);
      if (results?.some(result => result.status === "permission-denied")) reminderWarning = "Activa los permisos de notificaciones para recibir recordatorios.";
    } catch (cause) {
      reminderWarning = "Los datos se restauraron, pero no se pudieron actualizar todos los recordatorios. Se reintentará al abrir Geska.";
      return { status: "restored", counts, reminderWarning, reminderError: cause };
    }
    return { status: "restored", counts, reminderWarning };
  } finally { applying = false; }
}
