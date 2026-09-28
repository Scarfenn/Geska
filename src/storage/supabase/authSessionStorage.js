// Public Supabase auth.storage contract. Keys and serialized values are opaque:
// only the SDK decides their names/content. Existing sessions need no migration.
export function createAuthSessionStorage(storage) {
  const keys = new Set();
  const pending = new Set();
  let retired = false;
  function track(operation) {
    const promise = Promise.resolve().then(operation);
    pending.add(promise);
    const release = () => pending.delete(promise);
    promise.then(release, release);
    return promise;
  }
  return {
    adapter: {
      async getItem(key) {
        if (retired) return null;
        keys.add(key);
        const value = await track(() => storage.getItem(key));
        return retired ? null : value;
      },
      setItem(key, value) {
        if (retired) return Promise.resolve();
        keys.add(key);
        return track(() => storage.setItem(key, value));
      },
      removeItem(key) {
        if (retired) return Promise.resolve();
        keys.add(key);
        return track(() => storage.removeItem(key));
      },
    },
    async clear() {
      // Retire synchronously. Late SDK writes/removals cannot affect a new client.
      retired = true;
      await Promise.allSettled([...pending]);
      // Drain every deletion even if one fails, before allowing a cleanup retry.
      const results = await Promise.allSettled([...keys].map(key => storage.removeItem(key)));
      const failed = results.find(result => result.status === "rejected");
      if (failed) throw failed.reason;
    },
  };
}
