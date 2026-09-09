# Task reminders

`../notifications.js` is the compatibility facade. Importing it has no native
registration effects; `index.js` explicitly calls `registerNotifications()`.
The background task is still defined synchronously at application startup.

- `reminderPlanner.js`: pure `planTaskReminders(task, { now, limit })` returns
  `{ date, occurrenceDate, persistentHour? }` entries. Uses the shared recurrence
  domain and reminder model. The maximum is 16 entries; calendar search is bounded
  to 3,660 days from the later of today or the task anchor. `repeat_end` remains
  reserved, matching the existing recurrence domain.
- `notificationClient.js`: Expo permissions, channels, content, scheduling and
  cancellation. Partial scheduling failures attempt to cancel created IDs and
  report `createdIds`, `pendingCancellationIds` and failure causes.
- `reminderSync.js`: matches the expected plan against native requests using a
  versioned key (task, occurrence, reminder type, timestamp, persistent hour) and
  content. Keeps valid requests, creates missing ones, cancels obsolete/duplicate
  requests, then persists IDs. A full sync also removes deleted-task reminders.
- `registerNotifications.js`: foreground handler/listener and background task
  registration. The response logic stays in `../notificationResponseHandler.js`.

## Results and compatibility

`reconcileTaskReminders(task, persistTask?, { now? })` returns
`{ status: "scheduled" | "empty" | "permission-denied", ids }`.
Denial leaves native requests and persisted IDs unchanged; technical failures
reject. Permission checks are shared within a full sync and checked again when a
later operation needs to schedule. Plans are refreshed after permission dialogs;
expired entries are not sent to Expo.

`scheduleTaskReminders` still returns an ID array; on denial it preserves recorded
IDs. `scheduleTaskReminder` returns the first ID or null. `rescheduleTaskReminders`
returns the task with its IDs, and optionally accepts a persistence callback.
`syncTaskReminders` accepts a complete task snapshot and returns per-task results;
failures include successful results and individual causes. Do not pass a filtered
list to full sync: requests for missing tasks are considered orphaned.

`cancelTaskReminders(ids, { taskId? })` can also discover IDs that were not saved in
SQLite. Cancellation errors reject with pending IDs rather than silently succeeding.
Legacy requests with the old titles and task IDs are replaced once. Notifications
without a task marker/legacy task ID are not removed just because their title matches.

## Recovery and limits

SQLite and OS scheduling are not a transaction. Reconciliation is serialized within
this JavaScript runtime, including persistence callbacks. Callbacks must not invoke
another queued reminder operation. This does not lock separate native processes.
If SQLite persistence fails, native requests remain discoverable by their metadata
on the next sync. Even a native schedule call that creates a request but rejects
before returning its ID can be recovered this way. A failed cleanup may leave
obsolete requests until a later successful sync.

Existing requests are kept until replacements are created. Native queue limits can
therefore reject a replacement batch; that error preserves prior requests instead
of deleting all reminders first. The 16-entry limit is per task, not an OS-wide quota.
Recurring queues are replenished on synchronization; this is not a new background
scheduler. The application synchronizes at task-screen startup and after relevant
mutations. A failed post-save reconciliation warns that the task itself was saved.

Use `updateTaskNotificationIds` as the persistence callback so a delayed reminder
sync cannot overwrite the task title or completion state. Importing the facade
alone no longer registers handlers; use the explicit application bootstrap.

## Validation

`npm test` covers deterministic planning, midnight and DST boundaries, permission
outcomes, repeated sync, lost persistence, partial scheduling/cancellation, legacy
migration, concurrency, and explicit registration with simulated native adapters.
Database tests cover partial ID updates against real SQLite. Native permission
prompts, delivery, channel settings and background execution still need Android/iOS
device validation.
