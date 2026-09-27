# SQLite storage

Import the public API from `@/storage/database`. The facade keeps existing callers
independent of the repositories and exposes the same function names.

- `connection.js` owns the single connection and operation queue.
- `initialize.js` shares initialization, retries failures and gates repository calls.
- `migrations.js` adds legacy columns and backfills subtask order.
- `taskMappers.js` converts SQLite values, including legacy reminder fields.
- `repositories/` contains SQL for tasks, categories, subtasks and occurrences.
- `repositories/taskRows.js` exposes transaction-internal task reads/writes.
- `repositories/taskWrites.js` commits task/subtask drafts as aggregates and handles
  completion read-modify-write operations against the current stored state.

Every public operation rejects on database failure. Occurrence lookups return
`null` when no active row exists. UI callers must await mutations before clearing
inputs or closing a modal, and handle rejected promises at the interaction boundary.

Initialization and migrations, dependent deletions, occurrence writes, automatic
subtask ordering and aggregate task reads run in transactions. `getAllTasks` uses
four reads inside one transaction, regardless of the number of tasks.

All repository operations pass through the connection queue so another operation
cannot join an asynchronous transaction. This uses `withTransactionAsync`, which
is available on web as well as native platforms. A transaction callback must use
its supplied connection directly; calling a public repository function from inside
it would wait on the same queue. The queue coordinates this JavaScript module's
connection, not separate app processes or other database connections.

Task commands use aggregate operations: task creation/editing and all subtask
changes share a single transaction. Existing subtask completion/history is retained
on text/order edits. Omitted rows and their occurrences are soft-deleted; unknown existing
IDs fail rather than updating another task or resurrecting a removed row. Subtask
arrays represent the complete desired list, not a patch.

The low-level saveTask/updateTask APIs remain available for compatibility. Calling
several low-level repositories separately does not create a single transaction.
OS notifications run after the aggregate commit, outside the SQLite transaction.

Run `npm test` from the project root. Database tests execute the real SQL against
Python 3's in-memory SQLite through `tests/helpers/sqlite_bridge.py`, with failures
injected at the adapter boundary. No user database is opened. Native Expo behavior
and visual interaction still require device testing.

## Local change tracking

All five tables have `updated_at` (non-null INTEGER) and `deleted_at` (nullable
INTEGER), expressed as UTC Unix milliseconds. Initialization migrates existing
rows in one transaction, using migration time because historical edit times are
unknown. Reopening the database preserves these values.

SQLite triggers timestamp inserts and updates across all write paths. Each row's
`updated_at` advances by at least one millisecond per local update, including
notification metadata writes. Explicitly changed timestamps are preserved for
future import code. Indexes on `updated_at` support per-table change scans.
Child writes timestamp the child row; they do not timestamp the parent task.

Repository deletions retain tombstones, including dependent subtasks and
occurrences, and regular reads exclude them. Stale task/subtask edits cannot
restore deleted rows. Setting a cleared occurrence explicitly restores that
occurrence with its original ID. Category deletion still detaches tasks; a partial
unique index permits reusing a deleted category's name with a new ID.

The optional backup service can upload raw snapshots; see
`features/backup/README.md`. Restore v1 replaces local data atomically as documented below. No retention purge
or device synchronization is implemented. Backups include raw rows from every table
(including tombstones), not just `getAllTasks()`. A sync
protocol still needs conflict resolution and device-clock handling; these local
wall-clock timestamps alone do not provide either.

## Backup snapshot API (stage 1)

`getBackupSnapshot()` is exported through `@/storage/database`. It awaits local
initialization/migration, then reads all five tables in one queued transaction,
including deleted rows, without mappers or UI filters. It returns
`{ schemaVersion, createdAt, tables }`. `createdAt` is the UTC ISO timestamp at
capture start. Reads use the supplied connection sequentially, and any failure
rejects the whole operation. No network operation runs in the SQLite queue.

`SQLITE_SCHEMA_VERSION = 1` in migrations identifies the current post-migration
row schema for backups; it is an explicit application contract, not SQLite's
internal `schema_version` counter or an existing migration history. Increment it
when changing columns or stored-value semantics. Legacy null values remain null
in backups, including `repeat_interval` (the UI's fallback to 1 is not applied).
Legacy `updated_at` is migration time, not an inferred historical edit time.

`createBackupDocument(snapshot)` and `serializeBackup(snapshot)` in
`features/backup/domain/backupFormat.js` package these raw rows in a JSON envelope:
`{ format: "geska-sqlite-backup", formatVersion: 1, schemaVersion, createdAt, tables }`.
Format and row-schema versions evolve independently. This is a logical data export,
not a byte-for-byte SQLite file or a backup of AsyncStorage settings. Notification
IDs are preserved as raw data but are device-local; Restore v1 normalizes them before insertion. Restore-time validation is implemented separately in backupValidation.js.

Supabase's optional `getSupabaseClient()` lives in `storage/supabase/client.js`.
It creates one client on demand or returns null when either environment variable
is missing. Invalid non-empty configuration can throw at the accessor; it is not
used by the local startup or task repositories. Optional Auth is documented in
`../supabase/README.md`. Upload infrastructure is optional and separate; BackupScreen provides manual upload and restore; no backup scheduling is connected.
Snapshot and JSON creation work entirely offline.


## Restore maintenance

The facade exposes `replaceDatabaseFromBackup`. It validates the complete current
backup schema, drains task/reminder work through `restoreMaintenance.js`, and
replaces all five tables with bound inserts in a single transaction. Foreign-key
checks are explicit because older connections may not enforce them automatically.
No table definitions or schemaVersion change is required. The API does not download
or access cloud services. See `features/backup/README.md` for the two-phase flow,
normalization, UI generation reset, and post-commit notification warning contract.
