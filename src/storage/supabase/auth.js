import { getSupabaseClient } from "@/storage/supabase/client";

function requireAuth() {
  const client = getSupabaseClient();
  if (!client) {
    const error = new Error("Supabase no está configurado");
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }
  return client.auth;
}

// Match local repositories: reject on failure, preserving SDK error details.
// Credentials are passed only to the SDK, never stored or logged by Geska.
export async function signUpWithEmail(email, password) {
  const { data, error } = await requireAuth().signUp({ email, password });
  if (error) throw error;
  // With email confirmation enabled, user may exist while session is null.
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await requireAuth().signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function getSession() {
  const { data, error } = await requireAuth().getSession();
  if (error) throw error;
  return data.session;
}

// This validates the user with the Auth server and may fail without connectivity.
// getSession() exposes the locally persisted session (and may refresh if expired).
export async function getUser() {
  const { data, error } = await requireAuth().getUser();
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  // Sign out this session only; other devices keep their sessions.
  const { error } = await requireAuth().signOut({ scope: "local" });
  if (error) throw error;
}
