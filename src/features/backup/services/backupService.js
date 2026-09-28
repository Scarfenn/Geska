import { getSession } from "@/storage/supabase/auth";
import { getBackupSnapshot } from "@/storage/database";
import { serializeBackup, BACKUP_FORMAT_VERSION } from "@/features/backup/domain/backupFormat";
import { encodeUtf8 } from "@/features/backup/domain/utf8";
import { parseBackupDocument, MAX_RESTORE_BYTES } from "@/features/backup/domain/backupValidation";
import { uploadBackupFile, getBackupFileInfo } from "@/storage/supabase/backupStorage";

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

async function readRemote(userId) {
  try {
    const remote = await getBackupFileInfo(userId);
    const current = await requireSession();
    if (current.user.id !== userId) throw failure("BACKUP_AUTH_CHANGED", "La cuenta cambió. Actualiza la información.");
    return remote;
  } catch (cause) {
    if (cause?.code === "SUPABASE_NOT_CONFIGURED" || cause?.code?.startsWith("BACKUP_AUTH_")) throw cause;
    throw failure("BACKUP_METADATA_FAILED", "No se pudo consultar la copia remota", cause);
  }
}

export async function getCurrentBackup() {
  const session = await requireSession();
  return { userId: session.user.id, remote: await readRemote(session.user.id) };
}

// Explicitly invoked application operation. Never imported by SQLite or startup.
let uploading = false;
export async function uploadBackup() {
  if (uploading) throw failure("BACKUP_UPLOAD_BUSY", "Ya hay una copia en curso. Espera antes de volver a subir.");
  uploading = true;
  try { return await performUpload(); }
  finally { uploading = false; }
}

async function performUpload() {
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
  let json;
  try { json = serializeBackup(snapshot); }
  catch (cause) {
    throw failure("BACKUP_SERIALIZATION_FAILED", "No se pudo serializar la copia de seguridad", cause);
  }
  // Validate the exact document Restore will receive before replacing the only
  // remote copy. Keep raw snapshot values; Restore owns its normalization.
  try {
    parseBackupDocument(json);
    body = encodeUtf8(json);
    if (body.byteLength > MAX_RESTORE_BYTES) {
      throw failure("RESTORE_TOO_LARGE", "El backup excede el tamaño permitido");
    }
  } catch (cause) {
    throw failure(cause?.code === "RESTORE_TOO_LARGE" ? "BACKUP_TOO_LARGE" : "BACKUP_INVALID",
      "La copia no cumple el contrato de restauración. No se reemplazó la copia remota.", cause);
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
  let remote = null, metadataError = null;
  try {
    remote = await readRemote(userId);
    if (!remote) throw failure("BACKUP_METADATA_FAILED", "La subida terminó, pero el objeto no aparece en la consulta posterior");
  } catch (error) { metadataError = error; }
  return {
    ...uploaded,
    userId,
    remote,
    metadataError,
    createdAt: snapshot.createdAt,
    schemaVersion: snapshot.schemaVersion,
    formatVersion: BACKUP_FORMAT_VERSION,
    sizeBytes: body.byteLength,
  };
}
