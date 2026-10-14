import { test } from "node:test";
import assert from "node:assert/strict";
import { createTimerStorage } from "../../assets/storage/shared-storage.js";
class Storage {
  data = new Map();
  get length() {
    return this.data.size;
  }
  key(i) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k) {
    return this.data.get(k) ?? null;
  }
  setItem(k, v) {
    this.data.set(k, String(v));
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
for (const key of ["simple-timer-records", "simple-timer-todos"]) {
  test(`${key}: concurrent additions, deletion and stale save`, () => {
    const raw = new Storage();
    raw.setItem(key, JSON.stringify([{ id: "old", text: "original" }]));
    const a = createTimerStorage(raw, new Storage()),
      b = createTimerStorage(raw, new Storage());
    const av = JSON.parse(a.getItem(key)),
      bv = JSON.parse(b.getItem(key));
    a.setItem(key, JSON.stringify([...av, { id: "a" }]));
    b.setItem(key, JSON.stringify([...bv, { id: "b" }]));
    assert.equal(JSON.parse(a.getItem(key)).length, 3);
    a.setItem(key, JSON.stringify([{ id: "a" }, { id: "b" }]));
    b.setItem(key, JSON.stringify([...bv, { id: "b" }, { id: "c" }]));
    assert.deepEqual(
      JSON.parse(a.getItem(key))
        .map((x) => x.id)
        .sort(),
      ["a", "b", "c"],
    );
  });
}
test("independent paused timer caches survive reload", () => {
  const raw = new Storage(),
    sa = new Storage(),
    sb = new Storage();
  const a = createTimerStorage(raw, sa),
    b = createTimerStorage(raw, sb);
  a.setItem("simple-timer-state", '{"paused":10}');
  b.setItem("simple-timer-state", '{"paused":20}');
  assert.equal(
    createTimerStorage(raw, sa).getItem("simple-timer-state"),
    '{"paused":10}',
  );
  assert.equal(
    createTimerStorage(raw, sb).getItem("simple-timer-state"),
    '{"paused":20}',
  );
});
test("different daily memos coexist", () => {
  const raw = new Storage(),
    a = createTimerStorage(raw, new Storage()),
    b = createTimerStorage(raw, new Storage());
  const key = "simple-timer-daily-memos";
  a.getItem(key);
  b.getItem(key);
  a.setItem(key, JSON.stringify({ "2026-09-12": "A" }));
  b.setItem(key, JSON.stringify({ "2026-09-13": "B" }));
  assert.deepEqual(JSON.parse(a.getItem(key)), {
    "2026-09-12": "A",
    "2026-09-13": "B",
  });
});
