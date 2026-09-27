# Manual backup upload infrastructure

Call `uploadBackup()` from `services/backupService.js` only in an explicit optional
cloud flow. BackupScreen invokes it on an explicit button press, never from startup or tasks.

Sequence: getSession -> getBackupSnapshot (awaiting COMMIT) -> serializeBackup ->
UTF-8 ArrayBuffer -> recheck session identity -> Supabase Storage upload. Snapshot
and serialization reuse their existing APIs. database.js remains SQLite-only.
The SDK/server and bucket RLS validate the authenticated request; local session
inspection alone is not server verification. An account change after the second
check may still cause RLS/auth rejection, which is surfaced as an upload failure.

`storage/supabase/backupStorage.js` owns bucket `geska-backups` and exact path
`<user.id>/backup.json`. It sends application/json with upsert=true and selects
only path/bucket/id/fullPath from the response. The application result adds
createdAt (snapshot capture time), schemaVersion, formatVersion and sizeBytes.
No JSON, raw rows, user credentials or tokens are returned or logged.

`domain/utf8.js` uses standard JavaScript code points and Uint8Array to encode
UTF-8 without relying on browser Blob/File/FormData, Node Buffer or an optional
TextEncoder global. Tests cover accents, emoji and malformed surrogate replacement.
This follows Supabase's React Native recommendation to send ArrayBuffer:
https://supabase.com/docs/reference/javascript/file-buckets-upload

Errors expose a stable `code`. Original SDK/SQLite/serializer errors are retained
as `cause`, including Storage statusCode. No-config errors pass through unchanged.

| Code | Meaning |
| --- | --- |
| SUPABASE_NOT_CONFIGURED | Missing Supabase configuration |
| BACKUP_AUTH_REQUIRED | No current session/token/user |
| BACKUP_AUTH_FAILED | Session lookup/refresh failed |
| BACKUP_AUTH_CHANGED | Another account is active after capture |
| BACKUP_SNAPSHOT_FAILED | Local capture or commit failed |
| BACKUP_SERIALIZATION_FAILED | JSON serialization or UTF-8 conversion failed |
| BACKUP_UPLOAD_FAILED | Storage/RLS/network error |

No automatic retry, history or schema changes are implemented. Restore v1 is documented below.
One object per user means the last completed upload wins, including concurrent
uploads from multiple devices. An upload error can have an uncertain server outcome
(e.g. response lost after storage accepted it); it must not be shown as success.
Validate real-device upload and configured RLS/bucket limits,
and communicate that this replaces the previous backup. Consider request guarding
for repeated taps and a practical size limit: snapshot, JSON and encoded bytes are
materialized in memory. Local writes made during upload belong to the next backup.

## Manual backup screen

Settings now links to the hidden Drawer route `BackupScreen`. `useBackup` refreshes
on focus only, using a screen-local controller. A pending upload blocks duplicate
calls; a focus refresh waits for it. There is no global session check or provider.
UI imports neither SQLite nor the Supabase client. It uses existing themed style
factories and displays the same local-first explanation in all states.

`getCurrentBackup()` calls the installed Storage `info(path)` API for the exact
object. `lastModified` (or legacy `updatedAt`) is the remote modification time;
missing/invalid timestamps display "Fecha remota no disponible". No local date is
substituted. Only NoSuchKey or the explicit legacy 404/Object not found response
means absent; generic 404, missing bucket, permissions and connectivity errors reject.

`uploadBackup()` now returns `userId`, `remote` and `metadataError` in addition to
capture metadata. A post-upload metadata failure does not reject a successful
upload: the UI shows success with a warning and allows metadata refresh. Capture
`createdAt` is not used as "Última copia". Account identity is checked after metadata
reads as well. Remote metadata can reflect another device's later overwrite; it
represents the currently visible object, not an upload history.

Manual verification: test real-device RLS responses for a missing object, first
upload and overwrite; airplane mode before/during/after upload; email login and
return to BackupScreen; rapid taps and navigation during a pending request; large
font sizes, safe areas and all palettes. Restore v1 is documented below; cloud deletion, history, scheduling and
synchronization remain out of scope.

## Restore v1: prepare, then explicitly apply

`restoreService.prepareRestore()` checks the account, downloads the exact private
object using the installed SDK, reads its Blob using React Native FileReader,
and fully validates/normalizes the version 1 document. The default limits are
20 MiB downloaded content and 100,000 total rows. Limits are checked after the SDK
has downloaded the Blob; this is not a streaming memory limit.
It returns a frozen preview with capture date, format/schema versions and counts
(including deleted records). A WeakMap retains the associated immutable document
in memory, without exposing its contents or credentials in UI state. Cancel/blur
invalidates the preparation. There is no persistent safety copy and no Undo.

Apply requires that same preview object and account, never downloads again, and
consumes the preparation on success. The confirmation explicitly warns that all
five local tables will be replaced. It is a replacement, not a merge. Version
mismatch, invalid keys/types/relationships/duplicates/dates or a corrupt JSON
reject before SQLite access. Historical nullable done values become 0 and nullable
repeat_interval becomes 1, matching existing read semantics and fresh constraints.
Notification IDs become null/"[]"; reminder settings and imported timestamps are
preserved at insertion. Current timestamp triggers still advance updated_at when
new native notification IDs are subsequently persisted through normal repositories.

`replaceDatabaseFromBackup()` revalidates at the local API boundary and enters a
restore-only maintenance barrier before using one queued SQLite transaction. It
physically deletes children before parents, inserts parents before children,
checks counts and foreign keys, and commits. Failures roll back all five tables.
No schema/version change, SQL from the backup, network/native wait inside the
transaction, cloud dependency in SQLite, or local recovery history is introduced.

Maintenance tracks the existing task commands and reminder queue in this JS runtime,
invalidates the local generation immediately, rejects new/stale repository calls,
and drains admitted operations before BEGIN. Already-running SQLite operations
finish ahead of the queued replacement. UI actions also carry a generation so a
deferred old button callback cannot become a new command after the barrier.
TasksScreen unmounts its content during maintenance and remounts with a new key on
release: editors, cached reads, selections and drafts reload from SQLite, even
following a failed restore. This extends the existing single-connection/runtime
coordination; it is not a multi-process or multi-device locking protocol.

After COMMIT, the existing reminder queue cancels old scheduled task reminders,
dismisses presented task notifications and reconciles from current local data.
Missing permissions/native failures return `status: restored` plus a distinct
reminderWarning, never a failed database restore. Nothing after COMMIT attempts
to roll back SQLite. The UI shows that warning separately from the restore success.

Test with a disposable local database on-device: prepare and cancel, changed cloud
file between prepare/apply, empty backup replacement, corrupted/incompatible
backup, logged-out/account-change states, offline download, rapid taps, pending
native scheduling during apply, notification permission denial, previously shown
notifications, large fonts and task-list/editor refresh when returning from Restore.
