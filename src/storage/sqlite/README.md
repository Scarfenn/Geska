# SQLite storage

Import the public API from `@/storage/database`. The facade keeps existing callers
independent of the repositories and exposes the same function names.

- `connection.js` owns the single connection and operation queue.
- `initialize.js` shares initialization, retries failures and gates repository calls.
- `migrations.js` adds legacy columns and backfills subtask order.
- `taskMappers.js` converts SQLite values, including legacy reminder fields.
- `repositories/` contains SQL for tasks, categories, subtasks and occurrences.

Every public operation rejects on database failure. Occurrence lookups return
`null` only when no row exists. UI callers must await mutations before clearing
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

Transactions cover individual repository operations. A service that calls several
repositories and schedules OS notifications is not a single atomic operation.

Run `npm test` from the project root. Database tests execute the real SQL against
Python 3's in-memory SQLite through `tests/helpers/sqlite_bridge.py`, with failures
injected at the adapter boundary. No user database is opened. Native Expo behavior
and visual interaction still require device testing.
