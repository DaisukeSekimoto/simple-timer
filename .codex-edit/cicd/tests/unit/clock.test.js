import { test } from "node:test";
import assert from "node:assert/strict";
import { state } from "../../assets/core/state.js";
import {
  getElapsedMs,
  getDisplayMs,
  getCountdownOvertimeMs,
} from "../../assets/features/timer/clock.js";
const initial = structuredClone(state);

test("paused stopwatch and resumed countdown preserve their separate baselines", () => {
  Object.assign(state, initial, {
    mode: "stopwatch",
    elapsedBeforeStartMs: 123000,
  });
  assert.equal(getElapsedMs(), 123000);
  assert.equal(getDisplayMs(), 123000);
  Object.assign(state, {
    mode: "countdown",
    countdownDurationMs: 60000,
    countdownSessionStartElapsedMs: 120000,
  });
  assert.equal(getDisplayMs(), 57000);
  state.elapsedBeforeStartMs = 185000;
  assert.equal(getDisplayMs(), 0);
  assert.equal(getCountdownOvertimeMs(), 5000);
});
test("pomodoro break time is excluded from recorded work duration", () => {
  Object.assign(state, initial, {
    mode: "countdown",
    pomodoroEnabled: true,
    pomodoroPhase: "break",
    elapsedBeforeStartMs: 1500000,
    pomodoroBreakDurationMs: 300000,
    pomodoroPhaseElapsedBeforeStartMs: 120000,
  });
  assert.equal(getElapsedMs(), 1500000);
  assert.equal(getDisplayMs(), 180000);
  state.pomodoroPhaseElapsedBeforeStartMs = 305000;
  assert.equal(getCountdownOvertimeMs(), 5000);
});
