import { state } from "../../core/state.js";
import { openTaskDialog } from "../tasks/tasks.js";
import { getElapsedMs } from "../timer/clock.js";
import { resetTimer } from "../timer/controls.js";
import { removeRecordedTimerTab } from "../timer/tabs.js";
import { render } from "../timer/view.js";
import { localDateKey, now } from "../../shared/time.js";
import { saveRecords, saveState } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function moveToNextTask() {
  const durationMs = getElapsedMs();
  if (!state.taskName.trim()) {
    elements.statusText.textContent = "記録するタスク名を入力してください";
    openTaskDialog(true);
    return;
  }
  if (durationMs < 1000) {
    elements.statusText.textContent = "1秒以上計測してから記録してください";
    return;
  }
  const addedAt = now();
  const resumedRecordId = state.resumedRecordId;
  const isResumedHistory = Boolean(resumedRecordId);
  const resumedRecordIndex = resumedRecordId
    ? state.records.findIndex((record) => record.id === resumedRecordId)
    : -1;
  const nextRecord = {
    id:
      resumedRecordId ||
      String(addedAt) + "-" + Math.random().toString(16).slice(2),
    date: localDateKey(),
    taskName: state.taskName.trim(),
    memo: state.taskMemo,
    durationMs: Math.round(durationMs),
    mode: state.mode,
    firstStartedAt: new Date(
      state.firstStartedAt || addedAt - durationMs,
    ).toISOString(),
    createdAt: new Date(addedAt).toISOString(),
    registeredAt: new Date().toISOString(),
  };
  if (resumedRecordIndex >= 0) {
    state.records[resumedRecordIndex] = {
      ...state.records[resumedRecordIndex],
      ...nextRecord,
    };
  } else {
    state.records.push(nextRecord);
  }
  saveRecords();
  if (isResumedHistory) {
    removeRecordedTimerTab(state.activeTimerId);
    elements.statusText.textContent = "再開元の作業履歴を更新しました";
    showToast("再開元の作業履歴を更新しました");
    return;
  }
  resetTimer();
  state.taskName = "";
  state.taskMemo = "";
  saveState();
  render();
  elements.statusText.textContent = "今日の作業として記録しました";
  showToast("作業履歴に追加しました");
}

export function getResumedRecordIds() {
  const resumedIds = new Set(
    state.timerTabs
      .map((tab) => tab.resumedRecordId)
      .filter((recordId) => typeof recordId === "string" && recordId),
  );
  if (state.resumedRecordId) resumedIds.add(state.resumedRecordId);
  return resumedIds;
}

export function isRecordBeingResumed(record) {
  return Boolean(record && record.id && getResumedRecordIds().has(record.id));
}
