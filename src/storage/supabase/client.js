import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { createAuthSessionStorage } from "@/storage/supabase/authSessionStorage";

let client = null;
let sessionStorage = null;
let cleanupPending = false;

// Optional infrastructure: importing this module neither creates a client nor
// starts session recovery. Only optional cloud infrastructure uses this accessor.
export function getSupabaseClient() {
  if (cleanupPending) {
    const error = new Error("La cuenta fue eliminada; falta limpiar la sesión local");
    error.code = "ACCOUNT_LOCAL_CLEANUP_FAILED";
    throw error;
  }
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;

  sessionStorage = createAuthSessionStorage(AsyncStorage);
  client = createClient(url, key, {
    auth: {
      storage: sessionStorage.adapter,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

// Only after confirmed remote deletion. No network request or SDK-private API.
export async function clearDeletedAccountSession(expectedClient = client) {
  if (!client) return;
  if (expectedClient && expectedClient !== client) throw new Error("La sesión de eliminación ya no corresponde al cliente actual");
  cleanupPending = true;
  const clearing = sessionStorage.clear();
  const results = await Promise.allSettled([clearing, client.auth.dispose()]);
  const failed = results.find(result => result.status === "rejected");
  if (failed) throw failed.reason;
  client = null;
  sessionStorage = null;
  cleanupPending = false;
}
