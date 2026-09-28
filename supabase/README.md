# Account deletion

The Expo client calls `delete-account` with its user access token and an empty
body. The function validates the current user through `auth.getUser(jwt)` before
creating an administrative client. No client-provided user, bucket or path is
accepted. It removes only `geska-backups/<verified-user.id>/backup.json`, then
hard-deletes that Auth user. There are no SQLite imports or changes to RLS.

The runtime supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`. Never add administrative credentials to Expo's `.env`,
source, requests or logs. No custom secret is needed with the current hosted setup.

## Deploy / update

From the repository root, using the project reference corresponding to the app's
`EXPO_PUBLIC_SUPABASE_URL`:

```sh
npx supabase@latest login
npx supabase@latest functions deploy delete-account --project-ref YOUR_PROJECT_REF --use-api
npx supabase@latest functions list --project-ref YOUR_PROJECT_REF
```

The config explicitly selects `functions/delete-account/index.js`. JavaScript is
supported by Supabase's custom entrypoint setting, and prevents Expo from detecting
the server directory as a TypeScript mobile app and installing unnecessary TS / React
typing dependencies. `verify_jwt` remains enabled; no RLS hardening is applied here.
Docs: https://supabase.com/docs/guides/functions/function-configuration

The original real-device failure was a missing deployment. The user subsequently
confirmed successful deletion of Auth and backup, local sign-out and preservation
of local data. The diagnostic changes to this handler still require redeployment.
No deployment is performed by unit tests or by `npm test`.

An OPTIONS request is non-destructive and returns 204 when the handler is reached.
Check the function's Invocations/Logs for gateway failures separately from handler
errors. Never run a POST with an empty body and a real user JWT merely as a health
check: that is the actual destructive operation.

## Failure contract

- Missing/invalid JWT: reject before privileged operations.
- Auth identity lookup outage/rate limit/malformed response: `ACCOUNT_AUTH_CHECK_FAILED`,
  not an invalid-session diagnosis. No deletion has started.
- Only explicit object-not-found responses mean no backup; generic 404, missing
  bucket, forbidden, invalid metadata and Storage failures stop before Auth deletion.
- Backup removed/absent followed by an Auth rejection: `ACCOUNT_AUTH_DELETE_FAILED`.
  Retrying tolerates the missing backup. There is no cross-service rollback.
- Transport failure during Auth deletion: `ACCOUNT_DELETE_UNCONFIRMED`; never infer
  success from a lost response or an authentication error on the next attempt.
- Success: `{ "status": "deleted" }`. Local cleanup is a separate client operation.
- The client distinguishes missing-function 404/NOT_FOUND and gateway 401/403 from
  handler errors, retaining the original SDK response and HTTP status internally.

Requests repeated after successful deletion may fail user validation; no operation
ledger or blanket idempotent success response is implemented. A concurrent upload
can cause ownership checks to reject Auth deletion. The function does not broaden
its target to other objects or buckets to bypass that rejection.

## Deferred security review

Already-issued JWTs can remain valid until expiry after Auth deletion. Folder-only
Storage RLS may still accept such a JWT, including an upload from another device.
Checking live sessions in RLS is explicitly deferred for a separate review; this
feature does not claim immediate revocation of every issued access token and adds
no client DELETE policy. See https://supabase.com/docs/guides/auth/managing-user-data

## Verification

`node tests/accountDeletion.test.mjs` tests the handler with injected services, the
facade/controller, all theme variants, public SDK storage/dispose integration, late
writes, retries and exact preservation of the five real in-memory SQLite tables.
The Node 20 Auth integration supplies an unused Realtime transport only in the test
(no WebSocket connection or new production dependency). No tests contact Supabase.

After redeployment, manually check with a disposable account: with and without a
backup, invalid/expired session, offline request, duplicate taps, sign-in after
successful deletion, app restart and unchanged tasks/history. Errors must not imply
success when the server response was lost.
