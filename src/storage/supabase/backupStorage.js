import { getSupabaseClient } from "@/storage/supabase/client";

export const BACKUP_BUCKET = "geska-backups";

// Only transport: the caller supplies a completed, encoded snapshot. RLS remains
// the authority for access to the authenticated user's folder.
export async function uploadBackupFile(userId, body) {
  const client = getSupabaseClient();
  if (!client) {
    const error = new Error("Supabase no está configurado");
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }
  const path = `${userId}/backup.json`;
  const { data, error } = await client.storage.from(BACKUP_BUCKET).upload(path, body, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw error;
  return { path, bucket: BACKUP_BUCKET, id: data?.id, fullPath: data?.fullPath };
}

export async function getBackupFileInfo(userId) {
  const client = getSupabaseClient();
  if (!client) {
    const error = new Error("Supabase no está configurado");
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }
  const path = `${userId}/backup.json`;
  const { data, error } = await client.storage.from(BACKUP_BUCKET).info(path);
  if (error) {
    // Do not treat a missing bucket, generic 404, forbidden, or network error
    // as an empty backup. Support the named code and explicit legacy response.
    const missing = error.statusCode === "NoSuchKey" || error.code === "NoSuchKey" ||
      (String(error.statusCode) === "404" && error.message === "Object not found");
    if (missing) return null;
    throw error;
  }
  if (!data?.id) throw new Error("Storage returned invalid object metadata");
  const modified = data.lastModified || data.updatedAt;
  return {
    path, bucket: BACKUP_BUCKET, id: data.id,
    lastModified: modified && Number.isFinite(Date.parse(modified)) ? modified : null,
    sizeBytes: data.size ?? null,
  };
}

// Downloaded files stay in memory; no credentials or JSON are logged/persisted.
export async function downloadBackupFile(userId, maxBytes) {
  const client = getSupabaseClient();
  if (!client) {
    const error = new Error("Supabase no está configurado"); error.code = "SUPABASE_NOT_CONFIGURED"; throw error;
  }
  const { data, error } = await client.storage.from(BACKUP_BUCKET).download(`${userId}/backup.json`, { cacheNonce: String(Date.now()) });
  if (error) throw error;
  if (!data || !Number.isFinite(data.size) || data.size > maxBytes) {
    const error = new Error("El backup supera el tamaño permitido o no es válido"); error.code = "RESTORE_TOO_LARGE"; throw error;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el backup"));
    reader.onabort = () => reject(new Error("Lectura del backup cancelada"));
    reader.readAsText(data, "UTF-8");
  });
}
