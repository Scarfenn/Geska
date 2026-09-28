// No Expo imports. The authenticated identity is the only source of path/user ID.
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
const missingObject = error => error?.code === 'NoSuchKey' || error?.statusCode === 'NoSuchKey' ||
  (String(error?.statusCode) === '404' && error?.message === 'Object not found');

export function createDeleteAccountHandler({ verifyUser, createAdmin }) {
  return async request => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { code: 'METHOD_NOT_ALLOWED' });
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('Authorization') || '');
    if (!match) return reply(401, { code: 'ACCOUNT_AUTH_REQUIRED' });
    // Refuse arbitrary targets, even though no request data is ever used as a target.
    try {
      const text = await request.text();
      const body = text ? JSON.parse(text) : {};
      if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length) return reply(400, { code: 'INVALID_REQUEST' });
    } catch { return reply(400, { code: 'INVALID_REQUEST' }); }
    let user;
    try {
      const result = await verifyUser(match[1]);
      if (result.error) {
        const invalidSession = [401, 403].includes(result.error.status) ||
          ['bad_jwt', 'session_not_found', 'user_not_found'].includes(result.error.code);
        return reply(invalidSession ? 401 : 503, { code: invalidSession ? 'ACCOUNT_AUTH_REQUIRED' : 'ACCOUNT_AUTH_CHECK_FAILED' });
      }
      if (!result.data?.user?.id) return reply(503, { code: 'ACCOUNT_AUTH_CHECK_FAILED' });
      user = result.data.user;
    } catch { return reply(503, { code: 'ACCOUNT_AUTH_CHECK_FAILED' }); }
    try {
      const admin = createAdmin();
      const bucket = admin.storage.from('geska-backups');
      const path = `${user.id}/backup.json`;
      // Only a confirmed missing object is treated as absent, not any generic 404.
      try {
        const info = await bucket.info(path);
        if (info.error && !missingObject(info.error)) return reply(502, { code: 'ACCOUNT_STORAGE_FAILED' });
        if (!info.error) {
          if (!info.data?.id) return reply(502, { code: 'ACCOUNT_STORAGE_FAILED' });
          const removed = await bucket.remove([path]);
          if (removed.error && !missingObject(removed.error)) return reply(502, { code: 'ACCOUNT_STORAGE_FAILED' });
        }
      } catch { return reply(502, { code: 'ACCOUNT_STORAGE_FAILED' }); }
      const result = await admin.auth.admin.deleteUser(user.id, false);
      if (result.error) return reply(502, { code: 'ACCOUNT_AUTH_DELETE_FAILED', backupRemovedOrAbsent: true });
      return reply(200, { status: 'deleted' });
    } catch {
      // A transport failure may happen after Auth accepted deletion. Never claim success.
      return reply(503, { code: 'ACCOUNT_DELETE_UNCONFIRMED' });
    }
  };
}
