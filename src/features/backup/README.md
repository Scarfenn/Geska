# Manual backup upload infrastructure

Call `uploadBackup()` from `services/backupService.js` only in an explicit optional
cloud flow. Nothing currently invokes it from startup, tasks or UI.

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

No retry, history, UI, download, restore or schema changes are implemented.
One object per user means the last completed upload wins, including concurrent
uploads from multiple devices. An upload error can have an uncertain server outcome
(e.g. response lost after storage accepted it); it must not be shown as success.
Before BackupScreen, validate real-device upload and configured RLS/bucket limits,
and communicate that this replaces the previous backup. Consider request guarding
for repeated taps and a practical size limit: snapshot, JSON and encoded bytes are
materialized in memory. Local writes made during upload belong to the next backup.
