import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

let client = null;

// Optional infrastructure: importing this module neither creates a client nor
// starts a session. Only a future backup operation should call this accessor.
export function getSupabaseClient() {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}
