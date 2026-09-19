import { MODES, TICK_INTERVAL_MS } from "../../core/constants.js";
import { state } from "../../core/state.js";
import { stopCountdownAlert } from "./audio.js";
import {
  getCountdownSessionElapsedMs,
  getDisplayMs,
  getElapsedMs,
  getPomodoroPhaseDurationMs,
  getRunningDeltaMs,
  isPomodoroActive,
} from "./clock.js";
import { getDurationFromInputs, syncInputsFromDuration } from "./countdown.js";
import { applyTimerTab, snapshotActiveTimer } from "./model.js";
import {
  finishCountdown,
  finishPomodoroBreakEarly,
  finishPomodoroPhase,
} from "./pomodoro.js";
import { timerSession } from "./state.js";
import { requestTimerNavigation } from "./tabs.js";
import {
  isAwaitingCountdownStop,
  isFinishedCountdown,
  markCountdownReachedZero,
  render,
} from "./view.js";
import { formatTime, normalizeSeconds, now } from "../../shared/time.js";
import { saveState } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function startTimer() {
  stopCountdownAlert();
  if (state.mode === MODES.COUNTDOWN) {
    state.countdownDurationMs = getDurationFromInputs();
    if (isPomodoroActive()) {
      state.pomodoroBreakDurationMs =
        Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) *
        60000;
      if (
        state.pomodoroPhaseElapsedBeforeStartMs >= getPomodoroPhaseDurationMs()
      ) {
        state.pomodoroPhaseElapsedBeforeStartMs = 0;
      }
    } else if (
      state.finishedAt ||
      getCountdownSessionElapsedMs() >= state.countdownDurationMs
    ) {
      state.countdownSessionStartElapsedMs = getElapsedMs();
    }
    syncInputsFromDuration();
  }
  state.finishedAt = 0;
  state.hasStarted = true;
  state.isRunning = true;
  state.startedAt = now();
  if (!state.firstStartedAt) state.firstStartedAt = state.startedAt;
  saveState();
  startTicking();
  render();
}

export function pauseTimer() {
  if (!state.isRunning) return;
  freezeRunningTimer();
  saveState();
  render();
}

export function freezeRunningTimer() {
  if (!state.isRunning) return;
  stopCountdownAlert();
  if (isPomodoroActive()) {
    const deltaMs = getRunningDeltaMs();
    if (state.pomodoroPhase === "work") state.elapsedBeforeStartMs += deltaMs;
    state.pomodoroPhaseElapsedBeforeStartMs += deltaMs;
  } else {
    state.elapsedBeforeStartMs = getElapsedMs();
  }
  state.isRunning = false;
  state.startedAt = 0;
  const activeTab = state.timerTabs.find(
    (tab) => tab.id === state.activeTimerId,
  );
  if (activeTab) {
    activeTab.isRunning = false;
    activeTab.startedAt = 0;
    activeTab.elapsedBeforeStartMs = state.elapsedBeforeStartMs;
    activeTab.pomodoroPhaseElapsedBeforeStartMs =
      state.pomodoroPhaseElapsedBeforeStartMs;
  }
  if (!state.timerTabs.some((tab) => tab.isRunning)) stopTicking();
}

export function freezeTimerTab(tab) {
  if (!tab || !tab.isRunning) return;
  const deltaMs = Math.max(0, now() - tab.startedAt);
  if (tab.pomodoroEnabled) {
    if (tab.pomodoroPhase === "work") tab.elapsedBeforeStartMs += deltaMs;
    tab.pomodoroPhaseElapsedBeforeStartMs += deltaMs;
  } else {
    tab.elapsedBeforeStartMs += deltaMs;
  }
  tab.isRunning = false;
  tab.startedAt = 0;
  timerSession.timerTabsSignature = "";
}

export function prepareAdditionalCountdown() {
  if (!isFinishedCountdown()) return;
  state.countdownSessionStartElapsedMs = getElapsedMs();
  state.finishedAt = 0;
  saveState();
  render();
  elements.statusText.textContent = "追加する時間を選択して開始してください";
}

export function toggleTimer() {
  if (
    state.mode === MODES.COUNTDOWN &&
    state.isRunning &&
    getDisplayMs() <= 0 &&
    !state.finishedAt
  ) {
    markCountdownReachedZero();
  }
  if (isAwaitingCountdownStop()) {
    if (isPomodoroActive()) finishPomodoroPhase();
    else finishCountdown();
    return;
  }
  if (isFinishedCountdown()) {
    prepareAdditionalCountdown();
    return;
  }
  if (state.isRunning) {
    pauseTimer();
    return;
  }
  snapshotActiveTimer();
  const runningTab = state.timerTabs.find(
    (tab) => tab.id !== state.activeTimerId && tab.isRunning,
  );
  if (runningTab) {
    requestTimerNavigation({ type: "start", runningTimerId: runningTab.id });
    return;
  }
  startTimer();
}

export function handleTimerPointerDown(event) {
  if (!event.isPrimary || event.button !== 0) return;
  timerSession.timerPointerHandledAt = now();
  toggleTimer();
}

export function handleTimerClick() {
  // pointerdownの直後に発生するclickでは同じ操作を二重実行しない。
  if (now() - timerSession.timerPointerHandledAt < 500) return;
  toggleTimer();
}

export function resetTimer() {
  stopCountdownAlert();
  state.isRunning = false;
  state.startedAt = 0;
  state.elapsedBeforeStartMs = 0;
  state.countdownSessionStartElapsedMs = 0;
  state.finishedAt = 0;
  state.hasStarted = false;
  state.taskName = "";
  state.taskMemo = "";
  state.firstStartedAt = 0;
  state.resumedRecordId = "";
  state.pomodoroPhase = "work";
  state.pomodoroPhaseElapsedBeforeStartMs = 0;
  state.pomodoroPlannedBreakCount = -1;
  state.pomodoroCompletedBreakCount = 0;
  state.pomodoroFinalWorkDurationMs = 0;
  stopTicking();
  if (state.mode === MODES.COUNTDOWN) {
    state.countdownDurationMs = getDurationFromInputs();
    syncInputsFromDuration();
  }
  saveState();
  render();
}

export function requestResetTimer() {
  const elapsedMs = getElapsedMs();
  if (elapsedMs <= 0) {
    resetTimer();
    return;
  }
  elements.resetConfirmMessage.textContent = `現在の作業時間は ${formatTime(elapsedMs)} です。`;
  elements.resetConfirmOverlay.hidden = false;
  elements.confirmResetButton.focus();
}

export function closeResetConfirm() {
  elements.resetConfirmOverlay.hidden = true;
  elements.resetButton.focus();
}

export function confirmResetTimer() {
  elements.resetConfirmOverlay.hidden = true;
  snapshotActiveTimer();
  const timerIndex = state.timerTabs.findIndex(
    (tab) => tab.id === state.activeTimerId,
  );
  const timerSnapshot =
    timerIndex >= 0
      ? JSON.parse(JSON.stringify(state.timerTabs[timerIndex]))
      : null;
  resetTimer();
  showToast("履歴に追加せずリセットしました", () => {
    if (!timerSnapshot) return;
    const currentIndex = state.timerTabs.findIndex(
      (tab) => tab.id === timerSnapshot.id,
    );
    if (currentIndex >= 0) state.timerTabs[currentIndex] = timerSnapshot;
    else
      state.timerTabs.splice(
        Math.min(timerIndex, state.timerTabs.length),
        0,
        timerSnapshot,
      );
    applyTimerTab(timerSnapshot);
    syncInputsFromDuration();
    timerSession.timerTabsSignature = "";
    saveState();
    render();
    showToast("リセット前の状態に戻しました");
  });
}

export function requestResetOrFinishBreak() {
  if (
    isPomodoroActive() &&
    state.pomodoroPhase === "break" &&
    (state.isRunning || state.pomodoroPhaseElapsedBeforeStartMs > 0)
  ) {
    finishPomodoroBreakEarly();
    return;
  }
  requestResetTimer();
}

export function isResetConfirmOpen() {
  return !elements.resetConfirmOverlay.hidden;
}

export function performModeSwitch(mode) {
  if (state.mode === mode) return;
  freezeRunningTimer();
  state.mode = mode;
  state.countdownSessionStartElapsedMs = state.elapsedBeforeStartMs;
  state.finishedAt = 0;
  state.hasStarted = state.elapsedBeforeStartMs > 0;
  saveState();
  render();
}

export function closeModeSwitchConfirm() {
  timerSession.pendingMode = "";
  elements.modeSwitchConfirmOverlay.hidden = true;
  if (
    timerSession.modeSwitchConfirmPreviousFocus &&
    typeof timerSession.modeSwitchConfirmPreviousFocus.focus === "function"
  ) {
    timerSession.modeSwitchConfirmPreviousFocus.focus();
  }
  timerSession.modeSwitchConfirmPreviousFocus = null;
}

export function confirmModeSwitch() {
  if (!timerSession.pendingMode) return;
  const mode = timerSession.pendingMode;
  closeModeSwitchConfirm();
  performModeSwitch(mode);
}

export function switchMode(mode) {
  if (state.mode === mode) return;
  if (!state.hasStarted && !state.isRunning) {
    performModeSwitch(mode);
    return;
  }
  timerSession.pendingMode = mode;
  timerSession.modeSwitchConfirmPreviousFocus =
    elements.app.ownerDocument.activeElement;
  const modeName =
    mode === MODES.COUNTDOWN ? "カウントダウン" : "ストップウォッチ";
  elements.modeSwitchConfirmMessage.textContent = state.isRunning
    ? `現在の作業時間を維持し、動作中のタイマーを一時停止して「${modeName}」へ切り替えてもよろしいですか？`
    : `現在の作業時間を維持したまま「${modeName}」へ切り替えてもよろしいですか？`;
  elements.modeSwitchConfirmOverlay.hidden = false;
  elements.confirmModeSwitchButton.focus();
}

export function isModeSwitchConfirmOpen() {
  return !elements.modeSwitchConfirmOverlay.hidden;
}

export function setCountdownDuration(seconds) {
  freezeRunningTimer();
  state.countdownDurationMs = seconds * 1000;
  state.countdownSessionStartElapsedMs = state.elapsedBeforeStartMs;
  state.finishedAt = 0;
  state.hasStarted = state.elapsedBeforeStartMs > 0;
  syncInputsFromDuration();
  saveState();
  render();
}

export function startTicking() {
  if (!timerSession.tickId)
    timerSession.tickId = window.setInterval(render, TICK_INTERVAL_MS);
}

export function stopTicking() {
  if (timerSession.tickId) {
    window.clearInterval(timerSession.tickId);
    timerSession.tickId = 0;
  }
}
