import { getSession } from "@/storage/supabase/auth";
import { getBackupSnapshot } from "@/storage/database";
import { serializeBackup, BACKUP_FORMAT_VERSION } from "@/features/backup/domain/backupFormat";
import { encodeUtf8 } from "@/features/backup/domain/utf8";
import { uploadBackupFile } from "@/storage/supabase/backupStorage";

function failure(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause !== undefined) error.cause = cause;
  return error;
}

async function requireSession() {
  let session;
  try { session = await getSession(); }
  catch (cause) {
    if (cause?.code === "SUPABASE_NOT_CONFIGURED") throw cause;
    throw failure("BACKUP_AUTH_FAILED", "No se pudo comprobar la sesión", cause);
  }
  if (!session?.user?.id || !session.access_token) {
    throw failure("BACKUP_AUTH_REQUIRED", "Inicia sesión para subir una copia de seguridad");
  }
  return session;
}

// Explicitly invoked application operation. Never imported by SQLite or startup.
export async function uploadBackup() {
  const session = await requireSession();
  const userId = session.user.id;
  let snapshot;
  try {
    // This await includes COMMIT; subsequent network work is outside the queue.
    snapshot = await getBackupSnapshot();
  } catch (cause) {
    throw failure("BACKUP_SNAPSHOT_FAILED", "No se pudo crear la copia local", cause);
  }
  let body;
  try { body = encodeUtf8(serializeBackup(snapshot)); }
  catch (cause) {
    throw failure("BACKUP_SERIALIZATION_FAILED", "No se pudo serializar la copia de seguridad", cause);
  }
  // Capture/encoding may take time: do not knowingly send under a changed account.
  const current = await requireSession();
  if (current.user.id !== userId) {
    throw failure("BACKUP_AUTH_CHANGED", "La cuenta cambió durante la creación de la copia. Inténtalo de nuevo.");
  }
  let uploaded;
  try { uploaded = await uploadBackupFile(userId, body); }
  catch (cause) {
    if (cause?.code === "SUPABASE_NOT_CONFIGURED") throw cause;
    throw failure("BACKUP_UPLOAD_FAILED", "No se pudo subir la copia de seguridad", cause);
  }
  return {
    ...uploaded,
    createdAt: snapshot.createdAt,
    schemaVersion: snapshot.schemaVersion,
    formatVersion: BACKUP_FORMAT_VERSION,
    sizeBytes: body.byteLength,
  };
}
