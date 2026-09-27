import { BACKUP_FORMAT_VERSION } from "@/features/backup/domain/backupFormat";
import { SQLITE_SCHEMA_VERSION } from "@/storage/sqlite/migrations";
import { parseLocalDate } from "@/features/tasks/domain/recurrence";

export const MAX_RESTORE_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 100000;
const text = value => typeof value === "string";
const nonempty = value => text(value) && value.trim().length > 0;
const id = value => text(value) && value.length > 0 && value.length <= 512 && !value.includes("\0");
const integer = value => Number.isSafeInteger(value) && value >= 0;
const timestamp = value => integer(value) && value > 0 && value <= 8640000000000000;
const nullable = check => value => value === null || check(value);
const date = value => !!parseLocalDate(value);
const enumOf = values => value => values.includes(value);
const numeric = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const base = { id, updated_at: timestamp, deleted_at: nullable(timestamp) };
const done = nullable(enumOf([0, 1])); // legacy nullable SQLite columns
export const BACKUP_ROW_RULES = {
  categories: { ...base, name: nonempty },
  tasks: {
    ...base, title: nonempty, description: nullable(text), done,
    date: nullable(date), time: nullable(value => text(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)),
    repeat_mode: nullable(enumOf(["none", "daily", "weekly", "monthly"])), repeat_days: nullable(text),
    repeat_end: nullable(date), repeat_interval: nullable(value => integer(value) && value >= 1),
    reminder_minutes: nullable(numeric), reminder_type: nullable(enumOf(["relative", "all_day", "persistent", "after"])),
    reminder_value: nullable(numeric), reminder_unit: nullable(enumOf(["minutes", "hours", "days"])), reminder_at: nullable(timestamp),
    notification_id: nullable(text), notification_ids: nullable(text), category_id: nullable(id),
  },
  subtasks: { ...base, task_id: id, text: nonempty, done, sort_order: integer },
  task_occurrences: { ...base, task_id: id, date, done },
  subtask_occurrences: { ...base, subtask_id: id, date, done },
};
export const BACKUP_TABLES = Object.freeze(Object.keys(BACKUP_ROW_RULES));
function invalid(message, code = "RESTORE_INVALID_BACKUP") {
  const error = new Error(message); error.code = code; throw error;
}
function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function keys(value, expected, context) {
  if (!object(value) || Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    invalid(`Estructura incorrecta: ${context}`);
  }
}
export function validateBackupDocument(document) {
  keys(document, ["format", "formatVersion", "schemaVersion", "createdAt", "tables"], "documento");
  if (document.format !== "geska-sqlite-backup") invalid("El archivo no es un backup de Geska");
  if (document.formatVersion !== BACKUP_FORMAT_VERSION || document.schemaVersion !== SQLITE_SCHEMA_VERSION) {
    invalid("La versión del backup no es compatible con esta versión de Geska", "RESTORE_INCOMPATIBLE_VERSION");
  }
  if (!text(document.createdAt) || !/^\d{4}-\d{2}-\d{2}T/.test(document.createdAt) || !Number.isFinite(Date.parse(document.createdAt)) || new Date(document.createdAt).toISOString() !== document.createdAt) invalid("Fecha de creación inválida");
  keys(document.tables, BACKUP_TABLES, "tablas");
  const tables = {}, indexes = {}; let total = 0;
  for (const table of BACKUP_TABLES) {
    const input = document.tables[table], rules = BACKUP_ROW_RULES[table];
    if (!Array.isArray(input)) invalid(`Tabla inválida: ${table}`);
    total += input.length;
    if (total > MAX_ROWS) invalid("El backup excede el límite de registros", "RESTORE_TOO_LARGE");
    const index = new Map(); indexes[table] = index;
    tables[table] = input.map(row => {
      keys(row, Object.keys(rules), table);
      for (const [column, check] of Object.entries(rules)) {
        if (!check(row[column])) invalid(`Valor inválido en ${table}.${column}`);
      }
      if (index.has(row.id)) invalid(`ID duplicado en ${table}`);
      if (row.deleted_at !== null && row.deleted_at > row.updated_at) invalid(`Timestamps inconsistentes en ${table}`);
      const normalized = { ...row };
      if ("done" in normalized) normalized.done ??= 0;
      if (table === "tasks") {
        normalized.repeat_interval ??= 1;
        normalized.notification_id = null;
        normalized.notification_ids = "[]";
        if (![null, "none"].includes(row.repeat_mode) && row.date === null) invalid("Fecha de repetición ausente");
        const days = row.repeat_days ? row.repeat_days.split(",").map(day => day.trim()) : [];
        if (row.repeat_mode === "weekly" && days.some(day => !["L", "M", "X", "J", "V", "S", "D"].includes(day))) invalid("Días semanales inválidos");
        if (row.repeat_mode === "monthly" && days.some(day => !/^([1-9]|[12]\d|3[01])$/.test(day))) invalid("Días mensuales inválidos");
        if (row.reminder_type === "relative" && (!row.time || !["minutes", "hours"].includes(row.reminder_unit) || row.reminder_value === null)) invalid("Recordatorio relativo inválido");
        if (row.reminder_type === "all_day" && (row.reminder_value === null || row.reminder_unit !== "days" || row.time !== null)) invalid("Recordatorio de día completo inválido");
        if (row.reminder_type === "persistent" && row.time !== null) invalid("Recordatorio persistente inválido");
        if (row.reminder_type === "after" && (row.reminder_at === null || row.time !== null || ![null, "none"].includes(row.repeat_mode))) invalid("Recordatorio absoluto inválido");
      }
      index.set(row.id, normalized);
      return Object.freeze(normalized);
    });
    Object.freeze(tables[table]);
  }
  const names = new Set();
  for (const row of tables.categories) if (row.deleted_at === null) {
    if (names.has(row.name)) invalid("Categorías activas con nombres duplicados");
    names.add(row.name);
  }
  const relations = [["tasks", "category_id", "categories"], ["subtasks", "task_id", "tasks"], ["task_occurrences", "task_id", "tasks"], ["subtask_occurrences", "subtask_id", "subtasks"]];
  for (const [table, key, parent] of relations) {
    const pairs = new Set();
    for (const row of tables[table]) {
      if (row[key] !== null && !indexes[parent].has(row[key])) invalid(`Referencia inexistente en ${table}.${key}`);
      if (table.endsWith("_occurrences")) {
        const pair = JSON.stringify([row[key], row.date]);
        if (pairs.has(pair)) invalid(`Ocurrencia duplicada en ${table}`);
        pairs.add(pair);
        if (row.id !== `${row[key]}_${row.date}`) invalid(`ID de ocurrencia inválido en ${table}`);
      }
    }
  }
  return Object.freeze({ ...document, tables: Object.freeze(tables) });
}
export function parseBackupDocument(json) {
  if (typeof json !== "string") invalid("Contenido de backup inválido");
  if (json.length > MAX_RESTORE_BYTES) invalid("El backup excede el tamaño permitido", "RESTORE_TOO_LARGE");
  let document;
  try { document = JSON.parse(json); }
  catch (cause) { const error = new Error("El backup no contiene JSON válido"); error.code = "RESTORE_INVALID_JSON"; error.cause = cause; throw error; }
  return validateBackupDocument(document);
}
