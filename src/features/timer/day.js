import { state } from "../../core/state.js";
import {
  isPastHistoryEditUnlocked,
  updatePastHistoryEditSetting,
} from "../settings/settings.js";
import { normalizeTaskName } from "../tasks/tasks.js";
import { getElapsedMs } from "./clock.js";
import { freezeRunningTimer, stopTicking } from "./controls.js";
import { syncInputsFromDuration } from "./countdown.js";
import { applyTimerTab, createTimerTab, snapshotActiveTimer } from "./model.js";
import { timerSession } from "./state.js";
import { render } from "./view.js";
import { renderTodos } from "../todos/todos.js";
import {
  formatHistoryDateLabel,
  formatTime,
  localDateKey,
  now,
} from "../../shared/time.js";
import { saveRecords, saveState } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function updateDateTime(date = new Date()) {
  const dateKey = localDateKey(date);
  const todoList = elements.todoList;
  if (elements.todoDialog.open && todoList.dataset.date !== dateKey)
    renderTodos();
  if (
    dateKey !== timerSession.activeStateDate &&
    state.timerTabs.length &&
    !timerSession.pendingNewDateKey
  ) {
    const hasPreviousDayWork = state.timerTabs.some((tab) => {
      const elapsedMs =
        tab.id === state.activeTimerId
          ? getElapsedMs()
          : tab.elapsedBeforeStartMs;
      return elapsedMs > 0;
    });
    if (hasPreviousDayWork) openPreviousDayConfirm(dateKey);
    else resetTimersForNewDay(dateKey, false);
  }
  const currentSecond = Math.floor(date.getTime() / 1000);
  if (currentSecond === timerSession.displayedClockSecond) return;
  timerSession.displayedClockSecond = currentSecond;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const dateText = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  elements.recordDate.textContent = `${dateText}(${weekdays[date.getDay()]})`;
  timerSession.currentClockText = `${hours}:${minutes}:${seconds}`;
  if (elements.settingsDialog.open && isPastHistoryEditUnlocked())
    updatePastHistoryEditSetting();
  if (state.timerTabs.length) render();
}

export function resetTimersForNewDay(dateKey = localDateKey(), notify = true) {
  stopTicking();
  const firstTab = createTimerTab(1);
  state.timerTabs = [firstTab];
  state.nextTimerNumber = 2;
  applyTimerTab(firstTab);
  timerSession.activeStateDate = dateKey;
  timerSession.timerTabsSignature = "";
  syncInputsFromDuration();
  saveState();
  render();
  if (notify) showToast("前日分の計測途中データをリセットしました");
}

export function startDateTimeUpdates() {
  if (timerSession.dateTimeIntervalId || timerSession.pendingNewDateKey) return;
  const scheduleNextUpdate = () => {
    if (timerSession.pendingNewDateKey) {
      timerSession.dateTimeIntervalId = 0;
      return;
    }
    updateDateTime();
    if (timerSession.pendingNewDateKey) {
      timerSession.dateTimeIntervalId = 0;
      return;
    }
    // 毎回現在時刻から次の秒境界を求め、タイマーの遅延を累積させない。
    const delay = Math.max(20, 1000 - (Date.now() % 1000) + 10);
    timerSession.dateTimeIntervalId = window.setTimeout(
      scheduleNextUpdate,
      delay,
    );
  };
  scheduleNextUpdate();
}

export function stopDateTimeUpdates() {
  if (!timerSession.dateTimeIntervalId) return;
  window.clearTimeout(timerSession.dateTimeIntervalId);
  timerSession.dateTimeIntervalId = 0;
}

export function openPreviousDayConfirm(newDateKey) {
  freezeRunningTimer();
  snapshotActiveTimer();
  saveState();
  timerSession.pendingNewDateKey = newDateKey;
  stopDateTimeUpdates();
  const totalMs = state.timerTabs.reduce(
    (total, tab) => total + Math.max(0, tab.elapsedBeforeStartMs),
    0,
  );
  elements.previousDayConfirmMessage.textContent = `${formatHistoryDateLabel(timerSession.activeStateDate)}の作業時間 ${formatTime(totalMs)} が残っています。`;
  elements.previousDayConfirmOverlay.hidden = false;
  elements.recordPreviousDayButton.focus();
}

export function finishPreviousDayResolution(message) {
  const newDateKey = timerSession.pendingNewDateKey || localDateKey();
  timerSession.pendingNewDateKey = "";
  elements.previousDayConfirmOverlay.hidden = true;
  resetTimersForNewDay(newDateKey, false);
  updateDateTime();
  startDateTimeUpdates();
  showToast(message);
}

export function resetPreviousDayWork() {
  finishPreviousDayResolution("前日分の作業時間をリセットしました");
}

export function recordPreviousDayWork() {
  const [year, month, day] = timerSession.activeStateDate
    .split("-")
    .map(Number);
  const endOfSavedDate = new Date(year, month - 1, day + 1).getTime() - 1;
  const addedAt = Number.isFinite(endOfSavedDate) ? endOfSavedDate : now();
  state.timerTabs.forEach((tab) => {
    if (tab.elapsedBeforeStartMs <= 0) return;
    state.records.push({
      id: `${now()}-${Math.random().toString(16).slice(2)}`,
      date: timerSession.activeStateDate,
      taskName: normalizeTaskName(tab.taskName) || `タイマー ${tab.number}`,
      memo: typeof tab.taskMemo === "string" ? tab.taskMemo : "",
      durationMs: Math.round(tab.elapsedBeforeStartMs),
      mode: tab.mode,
      firstStartedAt:
        Number.isFinite(tab.firstStartedAt) && tab.firstStartedAt > 0
          ? new Date(tab.firstStartedAt).toISOString()
          : undefined,
      createdAt: new Date(addedAt).toISOString(),
    });
  });
  saveRecords();
  finishPreviousDayResolution("前日分を作業履歴に追加しました");
}
