# Task operations

`taskCommands.js` is the shared application layer for the screen and notification
actions. It owns no React state and never reads a screen's captured task array.

- `createTask(draft)` and `editTask(taskId, draft)` validate editable fields through
  `domain/taskDraft.js`. The draft contains `text`, `categoryId`, `subtasks` and
  `schedule` (the existing date/time/repeat/reminder editor object).
- `saveTaskSubtasks(taskId, drafts)` replaces the complete subtask list atomically.
  Array order becomes contiguous sort order; blank rows are omitted. Retained IDs
  preserve done state and occurrence history. Unknown existing IDs are conflicts.
- `setTaskDone(taskId, done, occurrenceDate)` is explicit and idempotent.
  `toggleTaskDone` and `toggleSubtaskDone` read the current stored value and invert
  it in the same transaction. Repeating tasks require a local occurrence date.
- `removeTask(taskId)` deletes the task and its descendants before cancelling native
  reminders. A cancellation failure cannot undo a committed deletion.

Commands return `{ status: "saved" | "deleted", task, changed, reminders }`.
Validation/storage failures reject before notification work. After commit, reminder
failures return `reminders.status === "failed"` with the original error; denied
permission is reported separately. A caller must not resubmit an already saved task
because its reminders failed. Idempotent completion still reconciles reminders so
an earlier failure can recover. Subtask-only changes leave task reminders unchanged.

The aggregate repository reads current completion/description/notification fields
inside its transaction before merging editable fields. Transaction helpers use the
supplied SQLite connection, never the public queued repository API. Operations for
one task serialize through commit and reminder reconciliation within this JS runtime.
This is not a distributed lock for multiple processes or optimistic version control
for two editors replacing the same complete subtask list.

`useTaskActions` owns refresh, warning presentation and in-flight UI submissions. It
shares a form's pending promise on repeated saves, exposes saving flags, and releases
the guard after success or failure. Native modals retain their draft on rejected
saves. List interactions handle errors in the hook. `taskCompletion.js` is a small
notification adapter that always requests `done: true` and emits `tasks-updated`
after successful persistence, even if reminders need recovery.

`taskMutations.js` and `subtaskMutations.js` retain legacy handler names as forwarding
adapters. New code should use the commands or the UI hook, not chain low-level
repository writes. Category handlers also flow through the hook's pending guard.

Run `npm test`. Aggregate rollback, retained history, stale editor fields, completion,
reminder failures and notification adaptation are tested with real in-memory SQLite
and a simulated native notification boundary. UI tests cover form failure and double
submission. Native visual/interaction validation remains a device check.
