import { MODES } from "../../core/constants.js";
import { state } from "../../core/state.js";
import { stopCountdownAlert } from "./audio.js";
import { freezeTimerTab, startTimer, stopTicking } from "./controls.js";
import { syncInputsFromDuration } from "./countdown.js";
import { applyTimerTab, createTimerTab, snapshotActiveTimer } from "./model.js";
import { timerSession } from "./state.js";
import { render } from "./view.js";
import { now } from "../../shared/time.js";
import { saveState } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function timerTabLabel(tab) {
  const name = tab.id === state.activeTimerId ? state.taskName : tab.taskName;
  return name.trim() || `タイマー ${tab.number}`;
}

export function isTimerTabOvertime(tab) {
  if (!tab || tab.mode !== MODES.COUNTDOWN || !tab.isRunning) return false;
  const runningDeltaMs = Number.isFinite(tab.startedAt)
    ? Math.max(0, now() - tab.startedAt)
    : 0;
  if (tab.pomodoroEnabled) {
    const phaseElapsedMs =
      Math.max(0, tab.pomodoroPhaseElapsedBeforeStartMs || 0) + runningDeltaMs;
    const phaseDurationMs =
      tab.pomodoroPhase === "break"
        ? tab.pomodoroBreakDurationMs
        : tab.countdownDurationMs;
    return (
      Number.isFinite(phaseDurationMs) && phaseElapsedMs >= phaseDurationMs
    );
  }
  const elapsedMs = Math.max(0, tab.elapsedBeforeStartMs || 0) + runningDeltaMs;
  const sessionElapsedMs =
    elapsedMs - Math.max(0, tab.countdownSessionStartElapsedMs || 0);
  return sessionElapsedMs >= tab.countdownDurationMs;
}

export function renderTimerTabs() {
  snapshotActiveTimer();
  const signature = JSON.stringify([
    state.activeTimerId,
    state.timerTabs.map((tab) => [
      tab.id,
      tab.taskName,
      tab.number,
      tab.resumedRecordId,
      tab.isRunning,
      isTimerTabOvertime(tab),
    ]),
  ]);
  if (signature === timerSession.timerTabsSignature) return;
  timerSession.timerTabsSignature = signature;
  elements.timerTabList.replaceChildren();
  state.timerTabs.forEach((tab) => {
    const item = document.createElement("div");
    item.className = "timer-workspace-tab";
    item.classList.toggle("is-active", tab.id === state.activeTimerId);
    item.classList.toggle("is-history-resumed", Boolean(tab.resumedRecordId));
    item.classList.toggle(
      "is-running-background",
      tab.isRunning && tab.id !== state.activeTimerId,
    );
    item.classList.toggle("is-countdown-overtime", isTimerTabOvertime(tab));

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "timer-tab-select";
    selectButton.dataset.timerId = tab.id;
    selectButton.setAttribute("role", "tab");
    selectButton.setAttribute("aria-controls", "timer-panel");
    selectButton.setAttribute(
      "aria-selected",
      String(tab.id === state.activeTimerId),
    );
    selectButton.textContent = timerTabLabel(tab);
    selectButton.title = timerTabLabel(tab);
    item.append(selectButton);

    if (state.timerTabs.length > 1) {
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "timer-tab-close";
      closeButton.dataset.closeTimerId = tab.id;
      closeButton.setAttribute("aria-label", `${timerTabLabel(tab)}を閉じる`);
      closeButton.textContent = "×";
      item.append(closeButton);
    }
    elements.timerTabList.append(item);
  });
}

export function performSelectTimerTab(timerId) {
  if (timerId === state.activeTimerId) return;
  const nextTab = state.timerTabs.find((tab) => tab.id === timerId);
  if (!nextTab) return;
  snapshotActiveTimer();
  applyTimerTab(nextTab);
  syncInputsFromDuration();
  timerSession.timerTabsSignature = "";
  saveState();
  render();
}

export function performAddTimerTab() {
  snapshotActiveTimer();
  const tab = createTimerTab(state.nextTimerNumber);
  state.nextTimerNumber += 1;
  state.timerTabs.push(tab);
  applyTimerTab(tab);
  syncInputsFromDuration();
  timerSession.timerTabsSignature = "";
  saveState();
  render();
}

export function closeTimerNavigationConfirm() {
  timerSession.pendingTimerNavigation = null;
  elements.timerNavigationConfirmOverlay.hidden = true;
  if (
    timerSession.timerNavigationConfirmPreviousFocus &&
    typeof timerSession.timerNavigationConfirmPreviousFocus.focus === "function"
  ) {
    timerSession.timerNavigationConfirmPreviousFocus.focus();
  }
  timerSession.timerNavigationConfirmPreviousFocus = null;
}

export function confirmTimerNavigation() {
  if (!timerSession.pendingTimerNavigation) return;
  const action = timerSession.pendingTimerNavigation;
  closeTimerNavigationConfirm();
  if (action.type === "start") {
    const runningTab = state.timerTabs.find(
      (tab) => tab.id === action.runningTimerId,
    );
    freezeTimerTab(runningTab);
    startTimer();
  } else if (action.type === "select") performSelectTimerTab(action.timerId);
  else performAddTimerTab();
}

export function requestTimerNavigation(action) {
  timerSession.pendingTimerNavigation = action;
  timerSession.timerNavigationConfirmPreviousFocus =
    elements.app.ownerDocument.activeElement;
  const isStart = action.type === "start";
  const isSelect = action.type === "select";
  const runningTab = isStart
    ? state.timerTabs.find((tab) => tab.id === action.runningTimerId)
    : null;
  elements.timerNavigationConfirmMessage.textContent = isStart
    ? `バックグラウンドで計測中の「${timerTabLabel(runningTab)}」を一時停止して、このタイマーを開始しますか？`
    : "";
  elements.confirmTimerNavigationButton.textContent = isStart
    ? "一時停止して開始"
    : isSelect
      ? "移動"
      : "作成";
  elements.timerNavigationConfirmOverlay.hidden = false;
  elements.confirmTimerNavigationButton.focus();
}

export function selectTimerTab(timerId) {
  if (timerId === state.activeTimerId) return;
  performSelectTimerTab(timerId);
}

export function selectAdjacentTimerTab(direction = 1) {
  if (state.timerTabs.length <= 1) return;
  const currentIndex = state.timerTabs.findIndex(
    (tab) => tab.id === state.activeTimerId,
  );
  const nextIndex =
    currentIndex < 0
      ? 0
      : (currentIndex + direction + state.timerTabs.length) %
        state.timerTabs.length;
  selectTimerTab(state.timerTabs[nextIndex].id);
}

export function selectNextTimerTab() {
  selectAdjacentTimerTab(1);
}

export function addTimerTab() {
  performAddTimerTab();
}

export function isTimerNavigationConfirmOpen() {
  return !elements.timerNavigationConfirmOverlay.hidden;
}

export function timerHasActivity(tab) {
  return tab.id === state.activeTimerId
    ? state.hasStarted || state.isRunning
    : tab.hasStarted === true || tab.isRunning === true;
}

export function removeRecordedTimerTab(timerId) {
  const tabIndex = state.timerTabs.findIndex((tab) => tab.id === timerId);
  if (tabIndex < 0) return;
  stopCountdownAlert();
  stopTicking();
  state.timerTabs.splice(tabIndex, 1);
  if (!state.timerTabs.length) {
    const freshTab = createTimerTab(state.nextTimerNumber);
    state.nextTimerNumber += 1;
    state.timerTabs.push(freshTab);
  }
  const nextTab =
    state.timerTabs[Math.min(tabIndex, state.timerTabs.length - 1)];
  applyTimerTab(nextTab);
  syncInputsFromDuration();
  timerSession.timerTabsSignature = "";
  saveState();
  render();
}

export function removeTimerTab(timerId) {
  const tab = state.timerTabs.find((item) => item.id === timerId);
  if (!tab || state.timerTabs.length <= 1) return;
  snapshotActiveTimer();
  const removedTab = JSON.parse(JSON.stringify(tab));
  const removedIndex = state.timerTabs.indexOf(tab);
  const wasActive = tab.id === state.activeTimerId;
  if (tab.id === state.activeTimerId && state.isRunning) stopTicking();
  const index = removedIndex;
  state.timerTabs.splice(index, 1);
  if (tab.id === state.activeTimerId) {
    applyTimerTab(state.timerTabs[Math.min(index, state.timerTabs.length - 1)]);
    syncInputsFromDuration();
  }
  timerSession.timerTabsSignature = "";
  saveState();
  render();
  showToast("タイマータブを削除しました", () => {
    state.timerTabs.splice(
      Math.min(removedIndex, state.timerTabs.length),
      0,
      removedTab,
    );
    if (wasActive) {
      applyTimerTab(removedTab);
      syncInputsFromDuration();
    }
    timerSession.timerTabsSignature = "";
    saveState();
    render();
    showToast("タイマータブを元に戻しました。");
  });
}

export function closeTimerTabConfirm() {
  timerSession.pendingCloseTimerId = "";
  elements.timerTabConfirmOverlay.hidden = true;
  if (
    timerSession.timerTabConfirmPreviousFocus &&
    typeof timerSession.timerTabConfirmPreviousFocus.focus === "function"
  ) {
    timerSession.timerTabConfirmPreviousFocus.focus();
  }
  timerSession.timerTabConfirmPreviousFocus = null;
}

export function confirmCloseTimerTab() {
  if (!timerSession.pendingCloseTimerId) return;
  const timerId = timerSession.pendingCloseTimerId;
  closeTimerTabConfirm();
  removeTimerTab(timerId);
}

export function closeTimerTab(timerId) {
  const tab = state.timerTabs.find((item) => item.id === timerId);
  if (!tab || state.timerTabs.length <= 1) return;
  snapshotActiveTimer();
  if (!timerHasActivity(tab)) {
    removeTimerTab(timerId);
    return;
  }
  timerSession.pendingCloseTimerId = timerId;
  timerSession.timerTabConfirmPreviousFocus =
    elements.app.ownerDocument.activeElement;
  elements.timerTabConfirmMessage.textContent = `「${timerTabLabel(tab)}」は開始ずみです。計測内容を破棄して削除してもよろしいですか？`;
  elements.timerTabConfirmOverlay.hidden = false;
  elements.confirmTimerTabDeleteButton.focus();
}

export function isTimerTabConfirmOpen() {
  return !elements.timerTabConfirmOverlay.hidden;
}

export function hasStartedTimer() {
  snapshotActiveTimer();
  return state.timerTabs.some(timerHasActivity);
}
