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
