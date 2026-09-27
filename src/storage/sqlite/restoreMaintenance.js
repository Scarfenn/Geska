// A restore-specific barrier for the existing single JS runtime/SQLite queue.
// Native notification actions use the same task command boundary.
let revision = 0;
let permit = null;
const operations = new Set();
const listeners = new Set();
export const getLocalRevision = () => revision;
export const isRestoring = () => permit !== null;
export function subscribeRestore(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function notify() { for (const listener of listeners) { try { listener(); } catch { /* UI cannot invalidate a database commit. */ } } }
export function assertLocalAccess(expected = revision, token) {
  if (token && token === permit) return;
  if (permit || expected !== revision) {
    const error = new Error("Los datos locales cambiaron o se están restaurando. Vuelve a abrir la acción.");
    error.code = "LOCAL_DATA_REPLACED";
    throw error;
  }
}
export function trackLocalOperation(operation) {
  const expected = revision;
  try { assertLocalAccess(expected); } catch (error) { return Promise.reject(error); }
  const promise = Promise.resolve().then(() => { assertLocalAccess(expected); return operation(); });
  operations.add(promise);
  const release = () => operations.delete(promise);
  promise.then(release, release);
  return promise;
}
export async function withRestoreMaintenance(operation) {
  assertLocalAccess();
  permit = Object.freeze({});
  const token = permit;
  revision++;
  notify();
  try {
    // Neither this wait nor native notification work holds a SQL transaction.
    await Promise.allSettled([...operations]);
    return await operation(token);
  } finally {
    permit = null;
    notify();
  }
}
