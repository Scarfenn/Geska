# Optional Supabase Auth infrastructure

`client.js` exports a lazy singleton accessor. Importing it creates no client.
Missing/blank URL or publishable key returns null. Non-empty invalid configuration
can throw when explicitly requesting the client, never during SQLite startup.
The official SDK owns session persistence in AsyncStorage and token refresh;
Geska never manually stores credentials, session tokens, or passwords.

Use `auth.js` for all application Auth calls:

- `signUpWithEmail(email, password)` returns SDK data including user and session.
- `signInWithEmail(email, password)` returns SDK data including user and session.
- `getSession()` returns the persisted session or null; expired tokens may require
  a network refresh. It is not server verification of identity.
- `getUser()` calls the Auth server to validate the user; network/auth errors reject.
- `signOut()` resolves without a value and uses scope `local` (this session only).
  It does not clear SQLite. Network failures reject; do not report success then.

All operations reject with code `SUPABASE_NOT_CONFIGURED` when configuration is
missing. SDK errors and thrown transport errors propagate unchanged. Callers must
handle these in the optional cloud flow, never use them to gate local access.
A configured client with no session is distinct from an unconfigured client.

Email confirmation may produce a successful signup with user but null session.
Future UI must distinguish that from signing in. There is no deep-link handling,
Auth subscription, React hook, screen integration, or automatic startup call yet.

React Native foreground/background refresh control via AppState remains a future
lifecycle integration: register it once when wiring the cloud flow, inside Auth
infrastructure, with appropriate cleanup. The SDK autoRefreshToken option is
already enabled; importing these modules alone starts no refresh work.

Optional Storage transport now lives in `backupStorage.js`, coordinated by
`features/backup/services/backupService.js`; see the backup README. It has no UI
or startup integration. AsyncStorage is the requested
session adapter; it is not encrypted credential storage. The SDK persists session
tokens there, not the password supplied to sign-up/sign-in.

## Account deletion and supported local cleanup

`deleteAccount(expectedUserId)` calls the authenticated `delete-account` function;
`expectedUserId` is only a local confirmation check, never a request authority.
After explicit remote success, `finishAccountDeletion()` clears local Auth storage.
A local failure can retry this step without repeating the server deletion.

`authSessionStorage.js` implements Supabase's public `getItem`/`setItem`/`removeItem`
contract over AsyncStorage, keeping existing sessions compatible. It tracks only
keys supplied by the SDK; it neither interprets tokens nor computes internal key
names. After deletion it retires the old adapter synchronously, drains local I/O
and removes observed keys. Late SDK reads return null, writes/removals cannot touch
a replacement client's session, and failed removals all settle before retry.
`client.auth.dispose()` is a public API; it stops the old client's background work
but does not itself cancel in-flight fetches. The retired adapter isolates those.

There is no `AsyncStorage.clear()`, SDK-private call, password persistence or SQLite
access. The lazy accessor refuses a retired client while cleanup remains pending;
a successful retry releases it for lazy recreation. Physical storage failures are
reported, not treated as completed cleanup. Pending cleanup state is runtime-local;
a process crash/disk failure is not a durable deletion receipt. The server remains
authoritative about account existence. No cross-device JWT revocation guarantee is
made; additional RLS hardening was explicitly deferred.

Public contracts: https://supabase.com/docs/reference/javascript/auth and
https://supabase.com/docs/reference/javascript/auth-dispose
