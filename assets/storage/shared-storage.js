import {
  STORAGE_KEY,
  RECORDS_KEY,
  TODOS_KEY,
  DAILY_MEMOS_KEY,
  WORKDAY_TIMES_KEY,
} from "../core/constants.js";

/* Each changed item has its own key: unrelated writes cannot overwrite it. */
export function createTimerStorage(storage, session) {
  const arrays = new Set([RECORDS_KEY, TODOS_KEY]);
  const shared = new Set([...arrays, DAILY_MEMOS_KEY, WORKDAY_TIMES_KEY]);
  const baseline = new Map();
  const timerKey = STORAGE_KEY;
  const prefix = (key) => `${key}:item:`;
  const parse = (value, fallback) => {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const toMap = (key, value) =>
    arrays.has(key)
      ? Object.fromEntries(
          (Array.isArray(value) ? value : []).map((item) => [
            String(item.id ?? JSON.stringify(item)),
            item,
          ]),
        )
      : value;
  function read(key) {
    const result = toMap(
      key,
      parse(storage.getItem(key), arrays.has(key) ? [] : {}),
    );
    for (let i = 0; i < storage.length; i++) {
      const name = storage.key(i);
      if (!name?.startsWith(prefix(key))) continue;
      const id = decodeURIComponent(name.slice(prefix(key).length));
      const value = parse(storage.getItem(name), null);
      if (value === null) delete result[id];
      else result[id] = value;
    }
    return result;
  }
  return {
    getItem(key) {
      if (key === timerKey) return session.getItem(key) || storage.getItem(key);
      if (!shared.has(key)) return storage.getItem(key);
      const value = read(key);
      baseline.set(key, structuredClone(value));
      return JSON.stringify(arrays.has(key) ? Object.values(value) : value);
    },
    setItem(key, raw) {
      if (key === timerKey) session.setItem(key, raw);
      if (!shared.has(key)) {
        storage.setItem(key, raw);
        return;
      }
      const next = toMap(key, JSON.parse(raw));
      const before = baseline.get(key) || read(key);
      for (const id of new Set([
        ...Object.keys(before),
        ...Object.keys(next),
      ])) {
        if (JSON.stringify(before[id]) === JSON.stringify(next[id])) continue;
        storage.setItem(
          prefix(key) + encodeURIComponent(id),
          JSON.stringify(next[id] ?? null),
        );
      }
      // Keep the caller's snapshot, so unseen remote additions are never deleted.
      baseline.set(key, structuredClone(next));
    },
    removeItem(key) {
      if (key === timerKey) session.removeItem(key);
      if (shared.has(key)) {
        const names = [];
        for (let i = 0; i < storage.length; i++)
          if (storage.key(i)?.startsWith(prefix(key)))
            names.push(storage.key(i));
        names.forEach((name) => storage.removeItem(name));
        baseline.delete(key);
      }
      storage.removeItem(key);
    },
  };
}
