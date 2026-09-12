import { MODES } from "../../core/constants.js";
import { state } from "../../core/state.js";
import { popupSession } from "../popup/state.js";
import {
  getCurrentBody,
  isPopupContext,
  scheduleFitPopupContent,
} from "../popup/window.js";
import { getPrimaryTimeDisplay } from "../settings/settings.js";
import { startCountdownAlert } from "./audio.js";
import {
  getCountdownOvertimeMs,
  getCountdownSessionElapsedMs,
  getDisplayMs,
  getElapsedMs,
  isPomodoroActive,
} from "./clock.js";
import { timerSession } from "./state.js";
import { renderTimerTabs } from "./tabs.js";
import { formatTime, now } from "../../shared/time.js";
import { saveState } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";

export function updateModeUi() {
  elements.modeTabs.forEach((tab) => {
    const active = tab.dataset.mode === state.mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  elements.countdownSettings.hidden = state.mode !== MODES.COUNTDOWN;
  elements.pomodoroEnabledInput.checked = state.pomodoroEnabled;
  elements.pomodoroBreakSettings.classList.toggle(
    "is-active",
    state.pomodoroEnabled,
  );
  elements.pomodoroBreakSettings.setAttribute(
    "aria-hidden",
    String(!state.pomodoroEnabled),
  );
  elements.pomodoroBreakInput.disabled = !state.pomodoroEnabled;
  elements.countdownDurationButton.querySelector("span").textContent =
    state.pomodoroEnabled ? "作業時間（1回）" : "作業時間";
  elements.countdownWorkDurationLegend.textContent = state.pomodoroEnabled
    ? "作業時間（1回）"
    : "作業時間";
  elements.untilTimePomodoroSettings.hidden = !state.pomodoroEnabled;
  elements.untilTimePomodoroHelp.hidden = !state.pomodoroEnabled;
  elements.countdownDialogPomodoroInput.checked = state.pomodoroEnabled;
}

export function updateStatus() {
  const isCountdownWaiting =
    state.mode === MODES.COUNTDOWN &&
    state.elapsedBeforeStartMs > 0 &&
    getCountdownSessionElapsedMs() === 0;
  if (isAwaitingCountdownStop()) {
    elements.statusText.textContent =
      "0秒になりました。停止ボタンを押してください";
  } else if (isPomodoroActive() && state.isRunning) {
    elements.statusText.textContent =
      state.pomodoroPhase === "work" ? "作業中" : "休憩中";
  } else if (
    isPomodoroActive() &&
    state.pomodoroPhaseElapsedBeforeStartMs > 0
  ) {
    elements.statusText.textContent =
      state.pomodoroPhase === "work" ? "作業を一時停止中" : "休憩を一時停止中";
  } else if (state.finishedAt) elements.statusText.textContent = "完了";
  else if (state.isRunning) elements.statusText.textContent = "計測中";
  else if (state.elapsedBeforeStartMs > 0 && !isCountdownWaiting)
    elements.statusText.textContent = "一時停止中";
  else elements.statusText.textContent = "待機中";
}

export function isFinishedCountdown() {
  return (
    state.mode === MODES.COUNTDOWN &&
    !state.pomodoroEnabled &&
    !state.isRunning &&
    state.finishedAt > 0
  );
}

export function isAwaitingCountdownStop() {
  return (
    state.mode === MODES.COUNTDOWN && state.isRunning && state.finishedAt > 0
  );
}

export function markCountdownReachedZero() {
  if (state.finishedAt) return;
  state.finishedAt = now();
  state.hasStarted = true;
  saveState();
  startCountdownAlert();
}

export function fitButtonText(button) {
  button.style.fontSize = "";
  if (!button.isConnected || button.offsetParent === null) return;

  const computedStyle = getComputedStyle(button);
  const maxSize = Number.parseFloat(computedStyle.fontSize) || 16;
  const minSize = Math.max(10, maxSize * 0.68);
  let size = maxSize;

  button.style.fontSize = `${size}px`;
  while (size > minSize && button.scrollWidth > button.clientWidth + 1) {
    size -= 0.5;
    button.style.fontSize = `${size}px`;
  }
}

export function fitControlButtonText() {
  fitButtonText(elements.startPauseButton);
  fitButtonText(elements.nextTaskButton);
  fitButtonText(elements.compactStartPauseButton);
}

export function scheduleFitControlButtonText() {
  const view = elements.app.ownerDocument.defaultView || window;
  view.cancelAnimationFrame(popupSession.fitButtonsFrame);
  popupSession.fitButtonsFrame =
    view.requestAnimationFrame(fitControlButtonText);
}

export function updateDocumentTitle() {
  const title = state.taskName.trim() || "Simple Timer";
  document.title = title;
  const currentDocument = elements.app.ownerDocument;
  if (currentDocument !== document) currentDocument.title = title;
  elements.appTitle.textContent =
    isPopupContext() && state.isMinimized && state.taskName.trim()
      ? state.taskName.trim()
      : "Simple Timer";
}

export function render() {
  if (
    state.mode === MODES.COUNTDOWN &&
    state.isRunning &&
    getDisplayMs() <= 0
  ) {
    markCountdownReachedZero();
  }
  updateDocumentTitle();
  elements.taskNameDisplay.textContent = state.taskName || "タスク名を入力";
  const measurementMs = getDisplayMs();
  const measurementLabel = isAwaitingCountdownStop()
    ? "超過"
    : state.mode === MODES.STOPWATCH
      ? "計測"
      : isPomodoroActive()
        ? state.pomodoroPhase === "work"
          ? "作業 残り"
          : "休憩 残り"
        : "残り";
  const measurementText = isAwaitingCountdownStop()
    ? `+${formatTime(getCountdownOvertimeMs())}`
    : formatTime(
        measurementMs,
        state.mode === MODES.COUNTDOWN ? "ceil" : "floor",
      );
  const showClockAsPrimary = getPrimaryTimeDisplay() === "clock";
  elements.timeDisplay.textContent = showClockAsPrimary
    ? timerSession.currentClockText
    : measurementText;
  elements.secondaryTimeDisplay.textContent = showClockAsPrimary
    ? `${measurementLabel} ${measurementText}`
    : `現在 ${timerSession.currentClockText}`;
  elements.cumulativeTimeDisplay.hidden = state.mode !== MODES.COUNTDOWN;
  elements.timeMetaRow.hidden = false;
  elements.cumulativeTimeDisplay.textContent = `作業時間 ${formatTime(getElapsedMs())}`;
  elements.pomodoroPhaseDisplay.hidden = !isPomodoroActive();
  const plannedWorkCount =
    state.pomodoroPlannedBreakCount >= 0
      ? state.pomodoroPlannedBreakCount + 1
      : 0;
  const currentWorkNumber = Math.min(
    state.pomodoroCompletedBreakCount + 1,
    plannedWorkCount || Infinity,
  );
  elements.pomodoroPhaseDisplay.textContent =
    state.pomodoroPhase === "work"
      ? plannedWorkCount
        ? `作業 ${currentWorkNumber}/${plannedWorkCount}`
        : "作業"
      : plannedWorkCount
        ? `休憩 ${state.pomodoroCompletedBreakCount + 1}/${state.pomodoroPlannedBreakCount}`
        : "休憩（作業時間外）";
  elements.pomodoroPhaseDisplay.classList.toggle(
    "is-break",
    state.pomodoroPhase === "break",
  );
  const canResumeCurrentSession = isPomodoroActive()
    ? state.pomodoroPhaseElapsedBeforeStartMs > 0
    : state.mode === MODES.STOPWATCH
      ? state.elapsedBeforeStartMs > 0
      : getCountdownSessionElapsedMs() > 0;
  const primaryActionLabel = isAwaitingCountdownStop()
    ? "停止"
    : isFinishedCountdown()
      ? "同じタスクで計測"
      : state.isRunning
        ? "一時停止"
        : isPomodoroActive() && state.pomodoroPhase === "break"
          ? state.pomodoroPhaseElapsedBeforeStartMs > 0
            ? "休憩再開"
            : "休憩開始"
          : canResumeCurrentSession
            ? "再開"
            : "開始";
  elements.startPauseButton.textContent = primaryActionLabel;
  elements.compactStartPauseButton.textContent = isAwaitingCountdownStop()
    ? "停止"
    : isFinishedCountdown()
      ? "同じタスク"
      : state.isRunning
        ? "一時停止"
        : isPomodoroActive() && state.pomodoroPhase === "break"
          ? state.pomodoroPhaseElapsedBeforeStartMs > 0
            ? "休憩再開"
            : "休憩開始"
          : canResumeCurrentSession
            ? "再開"
            : "開始";
  elements.resetButton.textContent =
    isPomodoroActive() &&
    state.pomodoroPhase === "break" &&
    (state.isRunning || state.pomodoroPhaseElapsedBeforeStartMs > 0)
      ? "休憩終了"
      : "リセット";
  elements.panel.classList.toggle("is-finished", state.finishedAt > 0);
  elements.panel.classList.toggle(
    "is-history-resumed",
    Boolean(state.resumedRecordId),
  );
  elements.historyResumeIndicator.hidden = !state.resumedRecordId;
  elements.panel.classList.toggle(
    "is-awaiting-stop",
    isAwaitingCountdownStop(),
  );
  elements.timeDisplay.classList.toggle(
    "is-measurement-finished",
    !showClockAsPrimary && state.finishedAt > 0,
  );
  elements.timeDisplay.classList.toggle(
    "is-measurement-awaiting-stop",
    !showClockAsPrimary && isAwaitingCountdownStop(),
  );
  elements.secondaryTimeDisplay.classList.toggle(
    "is-measurement-finished",
    showClockAsPrimary && state.finishedAt > 0,
  );
  elements.secondaryTimeDisplay.classList.toggle(
    "is-measurement-awaiting-stop",
    showClockAsPrimary && isAwaitingCountdownStop(),
  );
  elements.panel.classList.toggle(
    "is-overtime-background",
    isAwaitingCountdownStop() && now() - state.finishedAt >= 5000,
  );
  renderTimerTabs();
  getCurrentBody().classList.toggle(
    "is-minimized",
    state.isMinimized && isPopupContext(),
  );
  getCurrentBody().classList.toggle(
    "is-minimized-countdown-overtime",
    state.isMinimized && isPopupContext() && isAwaitingCountdownStop(),
  );
  elements.minimizeButton.querySelector("span").textContent = state.isMinimized
    ? "□"
    : "−";
  updateModeUi();
  updateStatus();
  scheduleFitControlButtonText();
  scheduleFitPopupContent();
}
