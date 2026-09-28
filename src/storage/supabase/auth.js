import { getSupabaseClient, clearDeletedAccountSession } from "@/storage/supabase/client";

function requireAuth() {
  const client = getSupabaseClient();
  if (!client) {
    const error = new Error("Supabase no está configurado");
    error.code = "SUPABASE_NOT_CONFIGURED";
    throw error;
  }
  return client.auth;
}

// One mutation boundary survives screen unmounts. Reads wait for it so a newly
// opened account screen cannot display the session being deleted or signed out.
let mutation = null;
function mutate(operation, { cleanup = false } = {}) {
  if (mutation) return Promise.reject(deletionError("ACCOUNT_AUTH_BUSY"));
  if (remoteDeleted && !cleanup) return Promise.reject(deletionError("ACCOUNT_LOCAL_CLEANUP_FAILED"));
  const result = Promise.resolve().then(operation);
  mutation = result;
  const release = () => { if (mutation === result) mutation = null; };
  result.then(release, release);
  return result;
}

// Match local repositories: reject on failure, preserving SDK error details.
// Credentials are passed only to the SDK, never stored or logged by Geska.
export async function signUpWithEmail(email, password) {
  return mutate(async () => {
    const { data, error } = await requireAuth().signUp({ email, password });
    if (error) throw error;
    // With email confirmation enabled, user may exist while session is null.
    return data;
  });
}

export async function signInWithEmail(email, password) {
  return mutate(async () => {
    const { data, error } = await requireAuth().signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  });
}

export async function getSession() {
  if (mutation) await mutation.catch(() => {});
  return readSession();
}

async function readSession() {
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
  return mutate(async () => {
    // Sign out this session only; other devices keep their sessions.
    const { error } = await requireAuth().signOut({ scope: "local" });
    if (error) throw error;
  });
}

function deletionError(code, cause) {
  const error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

let deleting = false;
let remoteDeleted = false;
let deletionClient = null;
export function finishAccountDeletion() {
  return mutate(cleanupDeletedSession, { cleanup: true });
}
async function cleanupDeletedSession() {
  try { await clearDeletedAccountSession(deletionClient); }
  catch (cause) { throw deletionError("ACCOUNT_LOCAL_CLEANUP_FAILED", cause); }
  remoteDeleted = false;
  deletionClient = null;
}

export async function deleteAccount(expectedUserId) {
  if (deleting) throw deletionError("ACCOUNT_DELETE_BUSY");
  if (mutation) throw deletionError("ACCOUNT_AUTH_BUSY");
  deleting = true;
  try {
    return await mutate(async () => {
      if (remoteDeleted) return await cleanupDeletedSession();
      const session = await readSession();
      if (!session?.access_token || !session.user?.id) throw deletionError("ACCOUNT_AUTH_REQUIRED");
      // The local confirmation must still belong to this account. Never sent as authority.
      if (session.user.id !== expectedUserId) throw deletionError("ACCOUNT_AUTH_CHANGED");
      deletionClient = getSupabaseClient();
      let response;
      try {
        response = await deletionClient.functions.invoke("delete-account", {
          body: {}, headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch (cause) { throw deletionError("ACCOUNT_DELETE_UNCONFIRMED", cause); }
      if (response.error) {
        let body;
        const http = response.error.context;
        try { body = await (http?.clone ? http.clone() : http)?.json(); } catch { /* Non-JSON gateway/transport failure. */ }
        const allowed = ["ACCOUNT_AUTH_REQUIRED", "ACCOUNT_AUTH_CHECK_FAILED", "ACCOUNT_STORAGE_FAILED", "ACCOUNT_AUTH_DELETE_FAILED"];
        let code = allowed.includes(body?.code) ? body.code : "ACCOUNT_DELETE_UNCONFIRMED";
        if (code === "ACCOUNT_DELETE_UNCONFIRMED") {
          if (http?.status === 404 && body?.code === "NOT_FOUND") code = "ACCOUNT_FUNCTION_NOT_DEPLOYED";
          else if ([401, 403].includes(http?.status)) code = "ACCOUNT_FUNCTION_AUTH_FAILED";
        }
        const error = deletionError(code, response.error);
        error.httpStatus = http?.status;
        error.serverCode = body?.code;
        throw error;
      }
      if (response.data?.status !== "deleted") throw deletionError("ACCOUNT_DELETE_UNCONFIRMED");
      remoteDeleted = true;
      await cleanupDeletedSession();
    }, { cleanup: true });
  } finally { deleting = false; }
}
