import { MODES } from "../../core/constants.js";
import { state } from "../../core/state.js";
import {
  fillCurrentTimeIfEmpty,
  finishDurationConflict,
  normalizeDurationInputs,
  normalizeEditDurationInputs,
  normalizeManualDurationInputs,
  openTimePicker,
  parseHistoryTimeRange,
  resolveDurationConflict,
  syncDurationAfterTimeRangeChange,
} from "./duration.js";
import { renderHistory } from "./list.js";
import { renderHistoryDateOptions } from "./memos.js";
import { isRecordBeingResumed } from "./recording.js";
import { historySession } from "./state.js";
import { canEditHistoryDate, getDefaultMode } from "../settings/settings.js";
import { renderRecentTasks, resolveTaskName } from "../tasks/tasks.js";
import { freezeRunningTimer } from "../timer/controls.js";
import { syncInputsFromDuration } from "../timer/countdown.js";
import {
  applyTimerTab,
  createTimerTab,
  snapshotActiveTimer,
} from "../timer/model.js";
import { timerSession } from "../timer/state.js";
import { render } from "../timer/view.js";
import {
  calculateTimeRangeDuration,
  formatTimeInputValue,
  localDateKey,
  now,
} from "../../shared/time.js";
import { formatRecordDuration } from "./format.js";
import {
  loadRecords,
  saveRecords,
  saveState,
} from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function openEditHistoryDialog(record) {
  const canEdit = canEditHistoryDate(record.date);
  historySession.editingRecord = record;
  const isResuming = isRecordBeingResumed(record);
  elements.editHistoryDialog.classList.toggle("is-read-only", !canEdit);
  elements.editHistoryTitle.textContent = canEdit
    ? "作業履歴を編集"
    : "作業履歴の詳細";
  elements.resumeHistoryButton.hidden =
    !canEdit || record.date !== localDateKey() || isResuming;
  elements.editDeleteButton.hidden = !canEdit || isResuming;
  elements.editHistorySubmitButton.hidden = !canEdit;
  const startedAt = new Date(record.firstStartedAt);
  const endedAt = new Date(record.createdAt);
  const hasTimeRange =
    !Number.isNaN(startedAt.getTime()) && !Number.isNaN(endedAt.getTime());
  elements.editStartTimeInput.value = hasTimeRange
    ? formatTimeInputValue(startedAt)
    : "";
  elements.editEndTimeInput.value = hasTimeRange
    ? formatTimeInputValue(endedAt)
    : "";
  historySession.previousEditTimeRangeDurationMs = hasTimeRange
    ? calculateTimeRangeDuration(
        record.date,
        elements.editStartTimeInput.value,
        elements.editEndTimeInput.value,
      )
    : null;
  const totalSeconds = Math.round(record.durationMs / 1000);
  elements.editHoursInput.value = String(Math.floor(totalSeconds / 3600));
  elements.editMinutesInput.value = String(
    Math.floor((totalSeconds % 3600) / 60),
  );
  elements.editSecondsInput.value = String(totalSeconds % 60);
  historySession.editTimingSnapshot = {
    startTime: elements.editStartTimeInput.value,
    endTime: elements.editEndTimeInput.value,
    durationMs: totalSeconds * 1000,
  };
  elements.editTaskInput.value = record.taskName;
  elements.editMemoInput.value = record.memo || "";
  [
    elements.editStartTimeInput,
    elements.editEndTimeInput,
    elements.editHoursInput,
    elements.editMinutesInput,
    elements.editSecondsInput,
    elements.editTaskInput,
    elements.editMemoInput,
  ].forEach((input) => {
    input.readOnly = !canEdit;
  });
  elements.editHistoryError.textContent = canEdit
    ? ""
    : "参照専用です。内容の変更・削除はできません。";
  elements.editHistoryDialog.showModal();
  window.setTimeout(() => {
    if (canEdit) elements.editTaskInput.focus();
    else elements.editHistoryDialog.querySelector(".close-dialog")?.focus();
  }, 0);
}

export function updateHistoryRecord(event) {
  event.preventDefault();
  if (!historySession.editingRecord) return;
  if (!canEditHistoryDate(historySession.editingRecord.date)) {
    elements.editHistoryDialog.close();
    showToast("編集許可の5分間が終了しました");
    return;
  }
  const taskName = resolveTaskName(elements.editTaskInput.value);
  const durationMs = normalizeDurationInputs(
    [
      elements.editHoursInput,
      elements.editMinutesInput,
      elements.editSecondsInput,
    ],
    elements.editHistoryError,
  );
  if (durationMs === null) return;
  if (!taskName) {
    elements.editHistoryError.textContent = "タスク名を入力してください";
    return;
  }
  const timeRange = parseHistoryTimeRange(
    historySession.editingRecord.date,
    elements.editStartTimeInput.value,
    elements.editEndTimeInput.value,
    elements.editHistoryError,
  );
  if (timeRange === null) return;
  if (!timeRange && durationMs < 1000) {
    elements.editHistoryError.textContent = "作業時間を1秒以上入力してください";
    return;
  }
  const timingChanged =
    !historySession.editTimingSnapshot ||
    elements.editStartTimeInput.value !==
      historySession.editTimingSnapshot.startTime ||
    elements.editEndTimeInput.value !==
      historySession.editTimingSnapshot.endTime ||
    durationMs !== historySession.editTimingSnapshot.durationMs;
  const save = (selectedDurationMs) => {
    const previousRecord = JSON.parse(
      JSON.stringify(historySession.editingRecord),
    );
    const editedRecord = historySession.editingRecord;
    historySession.editingRecord.taskName = taskName;
    historySession.editingRecord.memo = elements.editMemoInput.value
      .trim()
      .slice(0, 300);
    historySession.editingRecord.updatedAt = new Date().toISOString();
    if (timingChanged) {
      historySession.editingRecord.durationMs = selectedDurationMs;
      if (timeRange) {
        historySession.editingRecord.firstStartedAt =
          timeRange.startDate.toISOString();
        historySession.editingRecord.createdAt =
          timeRange.endDate.toISOString();
      } else {
        delete historySession.editingRecord.firstStartedAt;
      }
    }
    saveRecords();
    elements.editHistoryDialog.close();
    renderHistory();
    showToast("作業履歴を変更しました", () => {
      const index = state.records.indexOf(editedRecord);
      if (index >= 0) state.records[index] = previousRecord;
      saveRecords();
      renderHistoryDateOptions(previousRecord.date);
      if (elements.historyDialog.open) renderHistory();
      showToast("作業履歴の変更を元に戻しました");
    });
  };
  if (timingChanged) {
    resolveDurationConflict(durationMs, timeRange, save);
  } else {
    save(historySession.editingRecord.durationMs);
  }
}

export function resumeFromHistory() {
  if (
    !historySession.editingRecord ||
    historySession.editingRecord.date !== localDateKey()
  )
    return;
  elements.resumeHistoryConfirmMessage.textContent = `「${historySession.editingRecord.taskName}（${formatRecordDuration(historySession.editingRecord.durationMs)}）」の計測を再開します。履歴へ追加したときに履歴を更新します。`;
  elements.resumeHistoryConfirmDialog.showModal();
}

export function confirmResumeFromHistory() {
  if (!historySession.editingRecord) return;
  const record = historySession.editingRecord;
  if (isRecordBeingResumed(record)) {
    elements.resumeHistoryConfirmDialog.close();
    showToast("この履歴はすでに計測再開中です");
    return;
  }
  if (!record.id) {
    record.id = String(now()) + "-" + Math.random().toString(16).slice(2);
    saveRecords();
  }
  freezeRunningTimer();
  snapshotActiveTimer();
  const tab = createTimerTab(state.nextTimerNumber);
  state.nextTimerNumber += 1;
  tab.mode =
    record.mode === "pomodoro"
      ? MODES.COUNTDOWN
      : Object.values(MODES).includes(record.mode)
        ? record.mode
        : getDefaultMode();
  tab.pomodoroEnabled = record.mode === "pomodoro";
  tab.taskName = record.taskName.slice(0, 80);
  tab.taskMemo =
    typeof record.memo === "string" ? record.memo.slice(0, 300) : "";
  const recordStartedAt = new Date(record.firstStartedAt).getTime();
  // 手動追加・編集された履歴も、保存済みの開始時刻を計測再開後まで維持する。
  tab.firstStartedAt = Number.isFinite(recordStartedAt) ? recordStartedAt : 0;
  tab.elapsedBeforeStartMs = record.durationMs;
  tab.countdownSessionStartElapsedMs = record.durationMs;
  tab.hasStarted = true;
  tab.resumedRecordId = record.id;
  state.timerTabs.push(tab);
  applyTimerTab(tab);
  syncInputsFromDuration();
  timerSession.timerTabsSignature = "";
  elements.resumeHistoryConfirmDialog.close();
  elements.editHistoryDialog.close();
  elements.historyDialog.close();
  saveRecords();
  saveState();
  render();
  showToast("開始操作で再開できます");
}

export function deleteHistoryRecord(record) {
  if (!canEditHistoryDate(record.date)) {
    showToast("過去の履歴は参照のみです");
    return;
  }
  const duration = formatRecordDuration(record.durationMs);
  historySession.pendingDeleteRecordId = record.id || "";
  historySession.pendingDeleteRecord = record;
  historySession.confirmPreviousFocus =
    elements.app.ownerDocument.activeElement;
  elements.confirmMessage.textContent = `「${record.taskName}（${duration}）」を削除します。`;
  elements.confirmOverlay.hidden = false;
  elements.confirmDeleteButton.focus();
}

export function closeDeleteConfirm() {
  historySession.pendingDeleteRecordId = "";
  historySession.pendingDeleteRecord = null;
  elements.confirmOverlay.hidden = true;
  if (
    historySession.confirmPreviousFocus &&
    typeof historySession.confirmPreviousFocus.focus === "function"
  ) {
    historySession.confirmPreviousFocus.focus();
  }
  historySession.confirmPreviousFocus = null;
}

export function isDeleteConfirmOpen() {
  return !elements.confirmOverlay.hidden;
}

export function confirmDeleteHistoryRecord() {
  if (
    !historySession.pendingDeleteRecordId &&
    !historySession.pendingDeleteRecord
  )
    return;
  if (
    historySession.pendingDeleteRecord &&
    !canEditHistoryDate(historySession.pendingDeleteRecord.date)
  ) {
    closeDeleteConfirm();
    showToast("編集許可の5分間が終了しました");
    return;
  }
  const recordIndex = state.records.findIndex(
    (item) =>
      item.id === historySession.pendingDeleteRecordId ||
      item === historySession.pendingDeleteRecord,
  );
  if (recordIndex < 0) {
    closeDeleteConfirm();
    return;
  }
  const removedRecord = state.records[recordIndex];
  state.records.splice(recordIndex, 1);
  closeDeleteConfirm();
  if (elements.editHistoryDialog.open) elements.editHistoryDialog.close();
  saveRecords();
  renderHistoryDateOptions();
  renderHistory();
  showToast("作業履歴を削除しました", () => {
    state.records.splice(
      Math.min(recordIndex, state.records.length),
      0,
      removedRecord,
    );
    saveRecords();
    renderHistoryDateOptions(removedRecord.date);
    if (elements.historyDialog.open) renderHistory();
    showToast("作業履歴を元に戻しました");
  });
}

export function openHistoryDialog() {
  loadRecords();
  renderHistoryDateOptions(localDateKey());
  renderHistory();
  elements.historyDialog.showModal();
}

export function openAddHistoryDialog() {
  const selectedDate = elements.historyDialog.open
    ? elements.historyDate.value
    : localDateKey();
  elements.manualDate.value = canEditHistoryDate(selectedDate)
    ? selectedDate
    : localDateKey();
  elements.manualTaskInput.value = "";
  elements.manualMemoInput.value = "";
  elements.manualHoursInput.value = "0";
  elements.manualMinutesInput.value = "0";
  elements.manualSecondsInput.value = "0";
  elements.manualStartTimeInput.value = "";
  elements.manualEndTimeInput.value = "";
  historySession.previousManualTimeRangeDurationMs = null;
  elements.manualHistoryError.textContent = "";
  renderRecentTasks(elements.manualRecentTaskList, elements.manualTaskInput);
  elements.addHistoryDialog.showModal();
  window.setTimeout(() => elements.manualTaskInput.focus(), 0);
}

export function addManualHistory(event) {
  event.preventDefault();
  const taskName = resolveTaskName(elements.manualTaskInput.value);
  const recordDate = elements.manualDate.value;
  if (!canEditHistoryDate(recordDate)) {
    elements.manualHistoryError.textContent =
      "この日付の履歴編集は許可されていません";
    return;
  }
  const timeRange = parseHistoryTimeRange(
    recordDate,
    elements.manualStartTimeInput.value,
    elements.manualEndTimeInput.value,
    elements.manualHistoryError,
  );
  if (timeRange === null) return;
  const enteredDurationMs = normalizeManualDurationInputs();
  if (enteredDurationMs === null) return;
  if (!timeRange && enteredDurationMs < 1000) {
    elements.manualHistoryError.textContent =
      "作業時間を1秒以上入力してください";
    return;
  }

  if (!taskName) {
    elements.manualHistoryError.textContent = "タスク名を入力してください";
    return;
  }
  const save = (durationMs) => {
    const selectedDateCurrentTime = new Date(
      `${recordDate}T${formatTimeInputValue(new Date())}`,
    ).getTime();
    const addedAt = timeRange
      ? timeRange.endDate.getTime()
      : Number.isFinite(selectedDateCurrentTime)
        ? selectedDateCurrentTime
        : now();
    const record = {
      id: `${addedAt}-${Math.random().toString(16).slice(2)}`,
      date: recordDate,
      taskName,
      memo: elements.manualMemoInput.value.trim().slice(0, 300),
      durationMs,
      mode: "manual",
      createdAt: new Date(addedAt).toISOString(),
    };
    if (timeRange) record.firstStartedAt = timeRange.startDate.toISOString();
    state.records.push(record);
    saveRecords();
    renderHistoryDateOptions(recordDate);
    renderHistory();
    elements.addHistoryDialog.close();
    elements.statusText.textContent = "作業履歴を追加しました";
  };
  resolveDurationConflict(enteredDurationMs, timeRange, save);
}

export function bindEditorEvents() {
  elements.addHistoryButton.addEventListener("click", openAddHistoryDialog);
  elements.addHistoryForm.addEventListener("submit", addManualHistory);
  [
    elements.manualStartTimeInput,
    elements.manualEndTimeInput,
    elements.editStartTimeInput,
    elements.editEndTimeInput,
  ].forEach((input) => {
    input.addEventListener("pointerdown", () => {
      historySession.timeInputsPendingPicker.delete(input);
      if (!input.disabled && !input.readOnly && !input.value) {
        historySession.timeInputsPendingPicker.add(input);
        fillCurrentTimeIfEmpty(input);
      }
    });
    input.addEventListener("focus", () => fillCurrentTimeIfEmpty(input));
    input.addEventListener("click", () => {
      if (historySession.timeInputsPendingPicker.delete(input))
        openTimePicker(input);
    });
  });
  [elements.manualStartTimeInput, elements.manualEndTimeInput].forEach(
    (input) =>
      input.addEventListener("input", () =>
        syncDurationAfterTimeRangeChange("manual"),
      ),
  );
  [elements.editStartTimeInput, elements.editEndTimeInput].forEach((input) =>
    input.addEventListener("input", () =>
      syncDurationAfterTimeRangeChange("edit"),
    ),
  );
  [
    elements.manualHoursInput,
    elements.manualMinutesInput,
    elements.manualSecondsInput,
  ].forEach((input) =>
    input.addEventListener("change", normalizeManualDurationInputs),
  );
  [
    elements.editHoursInput,
    elements.editMinutesInput,
    elements.editSecondsInput,
  ].forEach((input) =>
    input.addEventListener("change", normalizeEditDurationInputs),
  );
  elements.editHistoryForm.addEventListener("submit", updateHistoryRecord);
  elements.resumeHistoryButton.addEventListener("click", resumeFromHistory);
  elements.cancelResumeHistoryButton.addEventListener("click", () =>
    elements.resumeHistoryConfirmDialog.close(),
  );
  elements.confirmResumeHistoryButton.addEventListener(
    "click",
    confirmResumeFromHistory,
  );
  elements.cancelDurationConflictButton.addEventListener("click", () =>
    elements.durationConflictDialog.close(),
  );
  elements.useEnteredDurationButton.addEventListener("click", () =>
    finishDurationConflict(false),
  );
  elements.useTimeRangeDurationButton.addEventListener("click", () =>
    finishDurationConflict(true),
  );
  elements.durationConflictDialog.addEventListener("close", () => {
    historySession.pendingDurationConflict = null;
  });
  elements.editHistoryDialog.addEventListener("close", () => {
    historySession.editingRecord = null;
    historySession.editTimingSnapshot = null;
  });
  elements.editDeleteButton.addEventListener("click", () => {
    if (!historySession.editingRecord) return;
    const record = historySession.editingRecord;
    elements.editHistoryDialog.close();
    deleteHistoryRecord(record);
  });
  elements.cancelDeleteButton.addEventListener("click", closeDeleteConfirm);
  elements.confirmDeleteButton.addEventListener(
    "click",
    confirmDeleteHistoryRecord,
  );
  elements.confirmOverlay.addEventListener("click", (event) => {
    if (event.target === elements.confirmOverlay) closeDeleteConfirm();
  });
}
