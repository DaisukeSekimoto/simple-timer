import { MODES } from "../../core/constants.js";
import { state } from "../../core/state.js";
import { now } from "../../shared/time.js";

export function getRunningDeltaMs() {
  return state.isRunning ? Math.max(0, now() - state.startedAt) : 0;
}

export function isPomodoroActive() {
  return state.mode === MODES.COUNTDOWN && state.pomodoroEnabled;
}

export function getElapsedMs() {
  if (isPomodoroActive() && state.pomodoroPhase === "break") {
    return state.elapsedBeforeStartMs;
  }
  return state.isRunning
    ? state.elapsedBeforeStartMs + getRunningDeltaMs()
    : state.elapsedBeforeStartMs;
}

export function getCountdownSessionElapsedMs() {
  return Math.max(0, getElapsedMs() - state.countdownSessionStartElapsedMs);
}

export function getPomodoroPhaseElapsedMs() {
  return (
    state.pomodoroPhaseElapsedBeforeStartMs +
    (isPomodoroActive() ? getRunningDeltaMs() : 0)
  );
}

export function getPomodoroPhaseDurationMs() {
  return state.pomodoroPhase === "break"
    ? state.pomodoroBreakDurationMs
    : state.countdownDurationMs;
}

export function getDisplayMs() {
  if (state.mode === MODES.STOPWATCH) return getElapsedMs();
  if (isPomodoroActive()) {
    return Math.max(
      0,
      getPomodoroPhaseDurationMs() - getPomodoroPhaseElapsedMs(),
    );
  }
  return Math.max(
    0,
    state.countdownDurationMs - getCountdownSessionElapsedMs(),
  );
}

export function getCountdownOvertimeMs() {
  if (isPomodoroActive()) {
    return Math.max(
      0,
      getPomodoroPhaseElapsedMs() - getPomodoroPhaseDurationMs(),
    );
  }
  return Math.max(
    0,
    getCountdownSessionElapsedMs() - state.countdownDurationMs,
  );
}
