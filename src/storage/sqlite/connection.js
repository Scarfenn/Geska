import * as SQLite from "expo-sqlite";
const db = SQLite.openDatabaseSync("tasks.db");
let pending = Promise.resolve();

// Every operation uses this queue, including reads. No unrelated query can
// accidentally join a transaction on this connection (also supported on web).
// Callbacks must use their db argument, never call a public repository function.
export function execute(operation, {
  transaction = false
} = {}) {
  const result = pending.then(async () => {
    if (!transaction) return operation(db);
    let value;
    await db.withTransactionAsync(async () => {
      value = await operation(db);
    });
    return value;
  });
  pending = result.catch(() => {});
  return result;
}
