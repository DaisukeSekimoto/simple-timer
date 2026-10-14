import { state } from "../../core/state.js";
import {
  closeDeleteConfirm,
  isDeleteConfirmOpen,
  openEditHistoryDialog,
  openHistoryDialog,
} from "./editor.js";
import {
  canCloseHistoryWithMemo,
  renderHistoryDateOptions,
  saveDailyMemoNow,
  scheduleDailyMemoSave,
} from "./memos.js";
import { isRecordBeingResumed } from "./recording.js";
import { historySession } from "./state.js";
import { openWorkSummaryDialog } from "./summary.js";
import {
  canEditHistoryDate,
  isPastHistoryEditUnlocked,
} from "../settings/settings.js";
import {
  calculateWorkDurationMs,
  compareHistoryRecordsByEndTimeDescending,
  formatHistoryTimeRange,
  localDateKey,
} from "../../shared/time.js";
import { formatRecordDuration } from "./format.js";
import { elements } from "../../ui/elements.js";

export function renderHistory() {
  const selectedDate = elements.historyDate.value;
  elements.historyDatePickerField.hidden = !isPastHistoryEditUnlocked();
  elements.historyDatePickerField.parentElement.classList.toggle(
    "is-calendar-enabled",
    isPastHistoryEditUnlocked(),
  );
  elements.historyDateInput.max = localDateKey();
  elements.historyDateInput.value = selectedDate;
  const isViewingToday = selectedDate === localDateKey();
  const canEdit = canEditHistoryDate(selectedDate);
  const keepCurrentDraft =
    historySession.dailyMemoEditingDate === selectedDate &&
    historySession.dailyMemoDirty;
  if (
    historySession.dailyMemoEditingDate &&
    historySession.dailyMemoEditingDate !== selectedDate &&
    historySession.dailyMemoDirty
  ) {
    saveDailyMemoNow(false);
  }
  const records = state.records
    .filter((record) => record.date === selectedDate)
    .sort(compareHistoryRecordsByEndTimeDescending);
  elements.historyDialog.classList.toggle("is-viewing-past", !isViewingToday);
  elements.historyDialog.classList.toggle(
    "is-editing-past",
    !isViewingToday && canEdit,
  );
  elements.historyDateContext.hidden = isViewingToday;
  elements.historyDateContext.textContent = canEdit
    ? "過去の履歴（編集許可中）"
    : "過去の履歴（参照のみ）";
  elements.historyHelp.textContent = canEdit
    ? "各記録をクリックすると内容の変更・削除ができます。"
    : "各記録をクリックすると詳細を確認できます。変更・削除は設定から5分間だけ許可できます。";
  elements.addHistoryButton.hidden = !canEdit;
  historySession.dailyMemoEditingDate = elements.historyDate.value;
  if (!keepCurrentDraft)
    elements.dailyMemoInput.value =
      historySession.dailyMemos[elements.historyDate.value] || "";
  elements.dailyMemoInput.readOnly = !canEdit;
  if (!keepCurrentDraft) {
    historySession.dailyMemoDirty = false;
    elements.dailyMemoStatus.textContent = canEdit
      ? "入力内容は自動保存されます"
      : "過去の日別メモは参照のみです";
  }
  elements.unitButtons.forEach((button) =>
    button.classList.toggle(
      "is-active",
      button.dataset.unit === state.historyUnit,
    ),
  );
  renderHistorySummary(records);
  elements.historyList.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "この日の記録はありません";
    elements.historyList.append(empty);
    return;
  }
  records.forEach((record) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "history-item";
    item.classList.toggle("is-read-only", !canEdit);
    const isResuming = isRecordBeingResumed(record);
    item.classList.toggle("is-resuming", isResuming);
    const details = document.createElement("span");
    details.className = "history-item-details";
    const task = document.createElement("strong");
    const duration = document.createElement("span");
    task.textContent = record.taskName;
    const metadata = document.createElement("small");
    metadata.className = "history-item-meta";
    const timeRange = formatHistoryTimeRange(record);
    metadata.textContent = [timeRange, record.memo || ""]
      .filter(Boolean)
      .join(" ／ ");
    details.append(task);
    if (isResuming) {
      const resumingLabel = document.createElement("small");
      resumingLabel.className = "history-resuming-label";
      resumingLabel.textContent = "計測再開中（履歴追加時に更新）";
      details.append(resumingLabel);
    }
    if (metadata.textContent) details.append(metadata);
    duration.textContent = formatRecordDuration(record.durationMs);
    item.append(details, duration);
    item.addEventListener("click", () => openEditHistoryDialog(record));
    elements.historyList.append(item);
  });
}

export function renderHistorySummary(records) {
  elements.historySummary.hidden = false;
  elements.historySummary.replaceChildren();
  elements.historySummary.tabIndex = 0;
  elements.historySummary.setAttribute("role", "button");
  elements.historySummary.setAttribute("aria-label", "この日の勤務集計を開く");
  elements.historySummary.onclick = () =>
    openWorkSummaryDialog(elements.historyDate.value);
  elements.historySummary.onkeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openWorkSummaryDialog(elements.historyDate.value);
  };
  const header = document.createElement("div");
  header.className = "history-summary-header";
  const heading = document.createElement("h3");
  heading.textContent = "この日の集計";
  const workSummaryIndicator = document.createElement("span");
  workSummaryIndicator.className = "work-summary-open-button";
  workSummaryIndicator.setAttribute("aria-hidden", "true");
  workSummaryIndicator.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M4 20V10h4v10H4Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z"/></svg><span>勤務集計</span>';
  header.append(heading, workSummaryIndicator);
  elements.historySummary.append(header);
  const totalDurationMs = records.reduce(
    (total, record) => total + record.durationMs,
    0,
  );
  const stats = document.createElement("dl");
  stats.className = "history-summary-stats";
  const count = document.createElement("div");
  count.innerHTML = "<dt>件数</dt>";
  const countValue = document.createElement("dd");
  countValue.textContent = `${records.length}件`;
  count.append(countValue);
  const total = document.createElement("div");
  total.innerHTML = "<dt>合計時間</dt>";
  const totalValue = document.createElement("dd");
  totalValue.textContent = formatRecordDuration(totalDurationMs);
  total.append(totalValue);
  stats.append(count, total);
  const workday = historySession.workdayTimes[elements.historyDate.value];
  const grossWorkMs = workday
    ? calculateWorkDurationMs(workday.clockIn, workday.clockOut)
    : null;
  if (workday && grossWorkMs !== null) {
    const breakDurationMs = Number.isFinite(workday.breakDurationMs)
      ? Math.max(0, workday.breakDurationMs)
      : 0;
    const netWorkMs = Math.max(0, grossWorkMs - breakDurationMs);
    const timeRange = document.createElement("div");
    timeRange.innerHTML = "<dt>出退勤時間</dt>";
    const timeRangeValue = document.createElement("dd");
    timeRangeValue.textContent = `${workday.clockIn}～${workday.clockOut}`;
    timeRange.append(timeRangeValue);
    const workDuration = document.createElement("div");
    workDuration.innerHTML = "<dt>勤務時間</dt>";
    const workDurationValue = document.createElement("dd");
    workDurationValue.textContent = formatRecordDuration(netWorkMs);
    workDuration.append(workDurationValue);
    stats.append(timeRange, workDuration);
  }
  elements.historySummary.append(stats);
}

export function bindHistoryEvents() {
  elements.historyButton.addEventListener("click", openHistoryDialog);
  elements.historyDialog.addEventListener("cancel", (event) => {
    if (!canCloseHistoryWithMemo()) event.preventDefault();
  });
  elements.historyDialog.addEventListener("close", () => {
    if (historySession.dailyMemoDirty) saveDailyMemoNow(false);
    if (isDeleteConfirmOpen()) closeDeleteConfirm();
  });
  elements.historyDate.addEventListener("change", renderHistory);
  elements.historyDateInput.addEventListener("change", () => {
    const selectedDate = elements.historyDateInput.value;
    if (
      !isPastHistoryEditUnlocked() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
    )
      return;
    renderHistoryDateOptions(selectedDate);
    renderHistory();
  });
  elements.dailyMemoInput.addEventListener("input", scheduleDailyMemoSave);
}
