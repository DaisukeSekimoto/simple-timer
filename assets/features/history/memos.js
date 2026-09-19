import { state } from "../../core/state.js";
import { historySession } from "./state.js";
import {
  canEditHistoryDate,
  isPastHistoryEditUnlocked,
} from "../settings/settings.js";
import { formatHistoryDateLabel, localDateKey } from "../../shared/time.js";
import { saveDailyMemos } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";

export function renderHistoryDateOptions(
  preferredDate = elements.historyDate.value,
) {
  const today = localDateKey();
  const storedDates = new Set([
    ...state.records.map((record) => record.date),
    ...Object.keys(historySession.dailyMemos),
    ...Object.keys(historySession.workdayTimes),
  ]);
  const canSelectPreferredDate =
    isPastHistoryEditUnlocked() &&
    /^\d{4}-\d{2}-\d{2}$/.test(preferredDate) &&
    preferredDate <= today;
  const availableDates = [
    ...new Set([
      today,
      ...(canSelectPreferredDate ? [preferredDate] : []),
      ...state.records.map((record) => record.date),
      ...Object.keys(historySession.dailyMemos),
      ...Object.keys(historySession.workdayTimes),
    ]),
  ].sort((a, b) => b.localeCompare(a));
  elements.historyDate.replaceChildren();
  availableDates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent =
      !storedDates.has(date) && date !== today
        ? `${formatHistoryDateLabel(date)}（未登録）`
        : formatHistoryDateLabel(date);
    elements.historyDate.append(option);
  });
  elements.historyDate.value = availableDates.includes(preferredDate)
    ? preferredDate
    : today;
  elements.historyDateInput.max = today;
  elements.historyDateInput.value = elements.historyDate.value;
  elements.historyDatePickerField.hidden = !isPastHistoryEditUnlocked();
  elements.historyDatePickerField.parentElement.classList.toggle(
    "is-calendar-enabled",
    isPastHistoryEditUnlocked(),
  );
}

export function saveDailyMemoNow(showFeedback = true) {
  window.clearTimeout(historySession.dailyMemoSaveId);
  historySession.dailyMemoSaveId = 0;
  const date =
    historySession.dailyMemoEditingDate || elements.historyDate.value;
  if (!date) return;
  if (!canEditHistoryDate(date)) {
    historySession.dailyMemoDirty = false;
    elements.dailyMemoStatus.textContent = "過去の日別メモは参照のみです";
    return;
  }
  const memo = elements.dailyMemoInput.value.trim().slice(0, 1000);
  if (memo) historySession.dailyMemos[date] = memo;
  else delete historySession.dailyMemos[date];
  saveDailyMemos();
  historySession.dailyMemoDirty = false;
  elements.dailyMemoStatus.textContent = memo
    ? "保存しました"
    : "空のメモとして保存しました";
  if (showFeedback) {
    window.setTimeout(() => {
      if (
        !historySession.dailyMemoDirty &&
        elements.historyDialog.open &&
        elements.historyDate.value === date
      ) {
        elements.dailyMemoStatus.textContent = "入力内容は自動保存されます";
      }
    }, 1800);
  }
}

export function scheduleDailyMemoSave() {
  if (elements.dailyMemoInput.readOnly) return;
  historySession.dailyMemoDirty = true;
  elements.dailyMemoStatus.textContent = "未保存の変更があります…";
  window.clearTimeout(historySession.dailyMemoSaveId);
  historySession.dailyMemoSaveId = window.setTimeout(
    () => saveDailyMemoNow(),
    700,
  );
}

export function canCloseHistoryWithMemo() {
  if (!historySession.dailyMemoDirty) return true;
  const shouldSave = window.confirm(
    "日別メモに未保存の変更があります。保存して作業履歴を閉じますか？",
  );
  if (!shouldSave) return false;
  saveDailyMemoNow(false);
  return true;
}
