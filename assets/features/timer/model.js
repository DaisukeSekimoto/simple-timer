import {
  DEFAULT_COUNTDOWN_SECONDS,
  DEFAULT_POMODORO_BREAK_MS,
  MODES,
} from "../../core/constants.js";
import { state } from "../../core/state.js";
import { getDefaultMode } from "../settings/settings.js";
import { stopCountdownAlert } from "./audio.js";
import { getElapsedMs, getPomodoroPhaseElapsedMs } from "./clock.js";
import { startTicking } from "./controls.js";
import { now } from "../../shared/time.js";

export function createTimerTab(number = state.nextTimerNumber) {
  return {
    id: `${now()}-${Math.random().toString(16).slice(2)}`,
    number,
    mode: getDefaultMode(),
    isRunning: false,
    startedAt: 0,
    elapsedBeforeStartMs: 0,
    countdownSessionStartElapsedMs: 0,
    countdownDurationMs: DEFAULT_COUNTDOWN_SECONDS * 1000,
    pomodoroEnabled: false,
    pomodoroPhase: "work",
    pomodoroPhaseElapsedBeforeStartMs: 0,
    pomodoroBreakDurationMs: DEFAULT_POMODORO_BREAK_MS,
    pomodoroPlannedBreakCount: -1,
    pomodoroCompletedBreakCount: 0,
    pomodoroFinalWorkDurationMs: 0,
    taskName: "",
    taskMemo: "",
    firstStartedAt: 0,
    resumedRecordId: "",
    finishedAt: 0,
    hasStarted: false,
  };
}

export function isValidTimerTab(tab) {
  return (
    tab &&
    typeof tab.id === "string" &&
    Number.isFinite(tab.number) &&
    (Object.values(MODES).includes(tab.mode) || tab.mode === "pomodoro") &&
    Number.isFinite(tab.elapsedBeforeStartMs) &&
    tab.elapsedBeforeStartMs >= 0 &&
    Number.isFinite(tab.countdownDurationMs) &&
    tab.countdownDurationMs > 0 &&
    typeof tab.taskName === "string"
  );
}

export function snapshotActiveTimer() {
  const tab = state.timerTabs.find((item) => item.id === state.activeTimerId);
  if (!tab) return;
  tab.mode = state.mode;
  const snapshotAt = now();
  tab.isRunning = state.isRunning;
  tab.elapsedBeforeStartMs = getElapsedMs();
  tab.startedAt = state.isRunning ? snapshotAt : 0;
  tab.countdownSessionStartElapsedMs = state.countdownSessionStartElapsedMs;
  tab.countdownDurationMs = state.countdownDurationMs;
  tab.pomodoroEnabled = state.pomodoroEnabled;
  tab.pomodoroPhase = state.pomodoroPhase;
  tab.pomodoroPhaseElapsedBeforeStartMs = getPomodoroPhaseElapsedMs();
  tab.pomodoroBreakDurationMs = state.pomodoroBreakDurationMs;
  tab.pomodoroPlannedBreakCount = state.pomodoroPlannedBreakCount;
  tab.pomodoroCompletedBreakCount = state.pomodoroCompletedBreakCount;
  tab.pomodoroFinalWorkDurationMs = state.pomodoroFinalWorkDurationMs;
  tab.taskName = state.taskName;
  tab.taskMemo = state.taskMemo;
  tab.firstStartedAt = state.firstStartedAt;
  tab.resumedRecordId = state.resumedRecordId;
  tab.finishedAt = state.finishedAt;
  tab.hasStarted = state.hasStarted;
  if (state.isRunning) {
    state.elapsedBeforeStartMs = tab.elapsedBeforeStartMs;
    state.pomodoroPhaseElapsedBeforeStartMs =
      tab.pomodoroPhaseElapsedBeforeStartMs;
    state.startedAt = snapshotAt;
  }
}

export function snapshotBackgroundTimers() {
  const snapshotAt = now();
  state.timerTabs.forEach((tab) => {
    if (
      tab.id === state.activeTimerId ||
      !tab.isRunning ||
      !Number.isFinite(tab.startedAt)
    )
      return;
    const deltaMs = Math.max(0, snapshotAt - tab.startedAt);
    if (tab.pomodoroEnabled) {
      if (tab.pomodoroPhase === "work") tab.elapsedBeforeStartMs += deltaMs;
      tab.pomodoroPhaseElapsedBeforeStartMs += deltaMs;
    } else {
      tab.elapsedBeforeStartMs += deltaMs;
    }
    tab.startedAt = snapshotAt;
  });
}

export function applyTimerTab(tab) {
  stopCountdownAlert();
  state.activeTimerId = tab.id;
  state.mode = tab.mode === "pomodoro" ? MODES.COUNTDOWN : tab.mode;
  state.isRunning =
    tab.isRunning === true &&
    Number.isFinite(tab.startedAt) &&
    tab.startedAt > 0;
  state.startedAt = state.isRunning ? tab.startedAt : 0;
  state.elapsedBeforeStartMs = tab.elapsedBeforeStartMs;
  state.countdownSessionStartElapsedMs = Number.isFinite(
    tab.countdownSessionStartElapsedMs,
  )
    ? Math.min(tab.countdownSessionStartElapsedMs, tab.elapsedBeforeStartMs)
    : 0;
  state.countdownDurationMs = tab.countdownDurationMs;
  state.pomodoroEnabled =
    tab.pomodoroEnabled === true || tab.mode === "pomodoro";
  state.pomodoroPhase = ["work", "break"].includes(tab.pomodoroPhase)
    ? tab.pomodoroPhase
    : "work";
  state.pomodoroPhaseElapsedBeforeStartMs = Number.isFinite(
    tab.pomodoroPhaseElapsedBeforeStartMs,
  )
    ? Math.max(0, tab.pomodoroPhaseElapsedBeforeStartMs)
    : 0;
  if (
    tab.mode === "pomodoro" &&
    Number.isFinite(tab.pomodoroWorkDurationMs) &&
    tab.pomodoroWorkDurationMs > 0
  ) {
    state.countdownDurationMs = tab.pomodoroWorkDurationMs;
  }
  state.pomodoroBreakDurationMs =
    Number.isFinite(tab.pomodoroBreakDurationMs) &&
    tab.pomodoroBreakDurationMs > 0
      ? tab.pomodoroBreakDurationMs
      : DEFAULT_POMODORO_BREAK_MS;
  state.pomodoroPlannedBreakCount = Number.isInteger(
    tab.pomodoroPlannedBreakCount,
  )
    ? Math.max(-1, tab.pomodoroPlannedBreakCount)
    : -1;
  state.pomodoroCompletedBreakCount = Number.isInteger(
    tab.pomodoroCompletedBreakCount,
  )
    ? Math.max(0, tab.pomodoroCompletedBreakCount)
    : 0;
  state.pomodoroFinalWorkDurationMs = Number.isFinite(
    tab.pomodoroFinalWorkDurationMs,
  )
    ? Math.max(0, tab.pomodoroFinalWorkDurationMs)
    : 0;
  state.taskName = tab.taskName;
  state.taskMemo = typeof tab.taskMemo === "string" ? tab.taskMemo : "";
  state.firstStartedAt = Number.isFinite(tab.firstStartedAt)
    ? tab.firstStartedAt
    : 0;
  state.resumedRecordId =
    typeof tab.resumedRecordId === "string" ? tab.resumedRecordId : "";
  state.finishedAt = tab.finishedAt || 0;
  state.hasStarted = tab.hasStarted === true;
  if (state.timerTabs.some((item) => item.isRunning)) startTicking();
}
