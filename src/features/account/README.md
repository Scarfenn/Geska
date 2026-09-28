# Optional account flow

Settings navigates to the `Cuenta` route in SettingsStack. Back returns to the previous screen, including BackupScreen when opened from there. AccountScreen composes a
form, themed styles and useAccount; only the hook imports storage/supabase/auth.
The screen-local controller receives that facade and never imports SQLite.

useFocusEffect loads the SDK session when Cuenta receives focus, including when
returning to an already mounted route. There is no app-start session check, global
provider or subscription. Settings intentionally says "Gestionar cuenta", without
claiming a session state. A failed session check shows retry, not the login form.

Passwords live only in form state and in-flight function arguments; they are
cleared on successful authentication/signup, changing form mode, and leaving the
screen. No credentials or raw SDK errors are logged. Original errors are retained
inside controller state for inspection, while the UI renders mapped messages.
A synchronous busy guard rejects duplicate calls before React can rerender.

Signup with a null session shows the email confirmation instruction and switches
the form back to login. No deep-link processing is implemented: after confirming
email the user can return and sign in. A real session is required for the signed-in
view. Logout errors retain the current session view; successful logout invokes only
the existing facade with local scope and does not modify local data.

Before cloud backups: configure and test confirmation emails/redirect destinations
in the Supabase project, verify real-device session persistence and keyboard/accessibility,
and decide whether to add foreground refresh control and Auth event subscriptions
within the optional flow. No Storage, backup UI or restore logic is included.

## Optional account deletion

The signed-in view offers a separate destructive action and an explicit confirmation
that local tasks/data are kept. Only confirmation calls `auth.deleteAccount`;
the controller guards duplicate submissions and cancels unsubmitted confirmation
on blur. The facade also guards overlapping requests and checks the confirmed local
identity before invoking the function (no user ID is sent to authorize deletion).

Remote success clears the session via the controlled auth storage adapter and public
`auth.dispose()`. Disk failures have a separate `cleanup-pending` state: retry only
local cleanup, not the remote deletion. No SQLite/backup/restore service participates.
The original errors remain internal; UI messages distinguish deployment, gateway,
identity lookup, Storage, Auth deletion, uncertain outcomes and local cleanup failures.
See `supabase/README.md` for deployment and the deferred old-JWT security consideration.
