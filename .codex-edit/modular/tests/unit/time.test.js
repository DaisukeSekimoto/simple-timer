import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTimeRangeDuration,
  calculateWorkDurationMs,
  compareHistoryRecordsByEndTimeDescending,
  formatDurationForUnit,
  formatTime,
  localDateKey,
} from "../../src/shared/time.js";

test("history records are ordered by latest edited end time first", () => {
  const records = [
    { taskName: "終了1時", createdAt: "2026-09-12T01:00:00+09:00" },
    { taskName: "終了9時2分", createdAt: "2026-09-12T09:02:00+09:00" },
    { taskName: "終了2時", createdAt: "2026-09-12T02:00:00+09:00" },
    { taskName: "終了時刻なし" },
  ];
  records.sort(compareHistoryRecordsByEndTimeDescending);
  assert.deepEqual(
    records.map((record) => record.taskName),
    ["終了9時2分", "終了2時", "終了1時", "終了時刻なし"],
  );
});

test("duration formatting preserves countdown rounding and rounded minutes", () => {
  assert.equal(formatTime(59999), "00:00:59");
  assert.equal(formatTime(59999, "ceil"), "00:01:00");
  assert.equal(formatDurationForUnit(90000, "minutes"), "2分");
  assert.equal(formatDurationForUnit(90000, "clock"), "00:01:30");
  assert.equal(formatTime(-1), "00:00:00");
});
test("overnight history uses the previous date for the start time", () => {
  assert.equal(
    calculateTimeRangeDuration("2026-09-12", "23:00:00", "01:30:00"),
    9000000,
  );
  assert.equal(calculateTimeRangeDuration("2026-09-12", "", "01:30:00"), null);
  assert.equal(
    calculateTimeRangeDuration("2026-09-12", "01:30:00", "01:30:00"),
    null,
  );
  assert.equal(calculateWorkDurationMs("23:00", "01:30"), 9000000);
});
test("local date keys use calendar components rather than UTC slicing", () => {
  assert.equal(localDateKey(new Date(2026, 8, 12, 0, 1)), "2026-09-12");
});
