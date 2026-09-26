// Format version describes the envelope; schemaVersion describes SQLite rows.
// Neither version is the application release number.
export const BACKUP_FORMAT_VERSION = 1;
const requiredTables = ["categories", "tasks", "subtasks", "task_occurrences", "subtask_occurrences"];

// Pure packaging only. No storage, network, migrations or restore behavior.
export function createBackupDocument(snapshot) {
  if (!snapshot || !Number.isSafeInteger(snapshot.schemaVersion) || snapshot.schemaVersion < 1) {
    throw new TypeError("El snapshot necesita una versión de esquema válida");
  }
  if (typeof snapshot.createdAt !== "string" || !Number.isFinite(Date.parse(snapshot.createdAt))) {
    throw new TypeError("El snapshot necesita una fecha de creación válida");
  }
  const tables = {};
  for (const table of requiredTables) {
    const rows = snapshot.tables?.[table];
    if (!Array.isArray(rows)) throw new TypeError(`Falta la tabla ${table} en el snapshot`);
    tables[table] = rows.map(row => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new TypeError(`Registro inválido en ${table}`);
      }
      // SQLite currently stores only scalar JSON-compatible values. Reject
      // unsupported values instead of silently losing them during serialization.
      for (const value of Object.values(row)) {
        if (value !== null && typeof value !== "string" &&
            !(typeof value === "number" && Number.isFinite(value))) {
          throw new TypeError(`Valor no serializable de SQLite en ${table}`);
        }
      }
      return { ...row };
    });
  }
  return {
    format: "geska-sqlite-backup",
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: snapshot.schemaVersion,
    createdAt: new Date(snapshot.createdAt).toISOString(),
    tables,
  };
}

export function serializeBackup(snapshot) {
  return JSON.stringify(createBackupDocument(snapshot));
}
