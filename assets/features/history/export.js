import { state } from "../../core/state.js";
import { historySession } from "./state.js";
import { downloadFile } from "../../shared/download.js";
import {
  formatHistoryTimeRange,
  formatTime,
  localDateKey,
} from "../../shared/time.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function updateExportDurationFormatState() {
  const isDisabled = !elements.exportDurationInput.checked;
  elements.exportDurationFormatGroup.disabled = isDisabled;
  elements.exportDurationFormatGroup.classList.toggle(
    "is-disabled",
    isDisabled,
  );
}

export function openExportHistoryDialog() {
  elements.exportHistoryError.textContent = "";
  updateExportDurationFormatState();
  elements.exportHistoryDialog.showModal();
}

export function exportAllHistory(event) {
  event.preventDefault();
  const includeTimeRange = elements.exportTimeRangeInput.checked;
  const includeDuration = elements.exportDurationInput.checked;
  const includeMemo = elements.exportMemoInput.checked;
  if (!includeTimeRange && !includeDuration) {
    elements.exportHistoryError.textContent =
      "開始・終了時間または作業時間を1つ以上選択してください";
    return;
  }
  const hasExportableMemo =
    includeMemo &&
    Object.values(historySession.dailyMemos).some((memo) => memo.trim());
  if (!state.records.length && !hasExportableMemo) {
    elements.exportHistoryError.textContent =
      "出力できる履歴または日別メモがありません";
    return;
  }
  const durationFormat = new FormData(elements.exportHistoryForm).get(
    "export-duration-format",
  );
  const recordsByDate = new Map();
  [...state.records]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
    )
    .forEach((record) => {
      if (!recordsByDate.has(record.date)) recordsByDate.set(record.date, []);
      recordsByDate.get(record.date).push(record);
    });
  const dates = [
    ...new Set([
      ...recordsByDate.keys(),
      ...(includeMemo
        ? Object.keys(historySession.dailyMemos).filter((date) =>
            historySession.dailyMemos[date].trim(),
          )
        : []),
    ]),
  ].sort();
  const lines = ["Simple Timer 作業履歴", ""];
  dates.forEach((date) => {
    lines.push(date);
    if (includeMemo && historySession.dailyMemos[date]) {
      lines.push(
        `日別メモ: ${historySession.dailyMemos[date].replace(/\n/g, "\n  ")}`,
      );
    }
    const records = recordsByDate.get(date) || [];
    if (records.length) {
      const headings = ["作業名"];
      if (includeTimeRange) headings.push("開始～終了");
      if (includeDuration) headings.push("作業時間");
      lines.push(headings.join("\t"));
      records.forEach((record) => {
        const columns = [record.taskName];
        if (includeTimeRange)
          columns.push(formatHistoryTimeRange(record) || "～");
        if (includeDuration) {
          columns.push(
            durationFormat === "clock"
              ? formatTime(record.durationMs)
              : `${Math.round(record.durationMs / 60000)}分`,
          );
        }
        lines.push(columns.join("\t"));
        if (includeMemo && record.memo)
          lines.push(`  メモ: ${record.memo.replace(/\n/g, "\n    ")}`);
      });
    }
    lines.push("");
  });

  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/plain;charset=utf-8",
  });
  downloadFile(blob, `simple-timer-history-${localDateKey()}.txt`);
  elements.exportHistoryDialog.close();
  elements.statusText.textContent = "全履歴をTXT出力しました";
  showToast("選択した内容で履歴を出力しました");
}

export function bindExportEvents() {
  elements.exportHistoryButton.addEventListener(
    "click",
    openExportHistoryDialog,
  );
  elements.exportDurationInput.addEventListener(
    "change",
    updateExportDurationFormatState,
  );
  elements.exportHistoryForm.addEventListener("submit", exportAllHistory);
}
