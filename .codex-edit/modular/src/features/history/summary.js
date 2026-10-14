import { state } from "../../core/state.js";
import { renderHistory } from "./list.js";
import { historySession } from "./state.js";
import {
  canEditHistoryDate,
  setSharedTimeFormat,
} from "../settings/settings.js";
import { normalizeTaskName } from "../tasks/tasks.js";
import {
  calculateWorkDurationMs,
  compareHistoryRecordsByEndTimeDescending,
  formatDurationForUnit,
  formatHistoryDateLabel,
  formatHistoryTimeRange,
} from "../../shared/time.js";
import { saveWorkdayTimes } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function groupTaskRecords(records) {
  const totals = new Map();
  records.forEach((record) => {
    const taskName = normalizeTaskName(record.taskName);
    const group = totals.get(taskName) || {
      taskName,
      durationMs: 0,
      records: [],
    };
    group.durationMs += record.durationMs;
    group.records.push(record);
    totals.set(taskName, group);
  });
  return [...totals.values()].sort(
    (a, b) =>
      b.durationMs - a.durationMs || a.taskName.localeCompare(b.taskName, "ja"),
  );
}

export function createTaskSummaryTable(records, unit = state.historyUnit) {
  const table = document.createElement("table");
  table.className = "history-summary-table";
  const thead = document.createElement("thead");
  thead.innerHTML =
    '<tr><th scope="col">タスク名</th><th scope="col">件数</th><th scope="col">合計</th></tr>';
  const tbody = document.createElement("tbody");
  groupTaskRecords(records).forEach((group) => {
    const row = document.createElement("tr");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `${group.taskName}のメモを表示`);
    const name = document.createElement("th");
    name.scope = "row";
    name.textContent = group.taskName;
    const count = document.createElement("td");
    count.textContent = `${group.records.length}件`;
    const duration = document.createElement("td");
    duration.textContent = formatDurationForUnit(group.durationMs, unit);
    const open = () => openTaskMemoDialog(group.taskName, group.records, unit);
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    row.append(name, count, duration);
    tbody.append(row);
  });
  table.append(thead, tbody);
  return table;
}

export function renderTaskMemoDialog() {
  elements.taskMemoTitle.textContent = `${historySession.activeTaskMemoName}のメモ`;
  elements.taskMemoCount.textContent = `${historySession.activeTaskMemoRecords.length}件`;
  const totalDurationMs = historySession.activeTaskMemoRecords.reduce(
    (total, record) => total + record.durationMs,
    0,
  );
  const totalText = formatDurationForUnit(
    totalDurationMs,
    historySession.workSummaryUnit,
  );
  elements.taskMemoTotal.textContent = `合計 ${totalText}`;
  elements.taskMemoTotal.setAttribute(
    "aria-label",
    `合計 ${totalText}。クリックして時間表記を切り替え`,
  );
  elements.taskMemoList.replaceChildren();
  historySession.activeTaskMemoRecords
    .slice()
    .sort(compareHistoryRecordsByEndTimeDescending)
    .forEach((record) => {
      const item = document.createElement("article");
      item.className = "task-memo-item";
      const meta = document.createElement("strong");
      meta.textContent = `${formatHistoryTimeRange(record) || record.date} ／ ${formatDurationForUnit(record.durationMs, historySession.workSummaryUnit)}`;
      const memo = document.createElement("p");
      memo.textContent = record.memo || "メモはありません";
      memo.classList.toggle("is-empty", !record.memo);
      item.append(meta, memo);
      elements.taskMemoList.append(item);
    });
}

export function openTaskMemoDialog(
  taskName,
  records,
  unit = state.historyUnit,
) {
  historySession.activeTaskMemoName = taskName;
  historySession.activeTaskMemoRecords = records.slice();
  historySession.workSummaryUnit = unit === "clock" ? "clock" : "minutes";
  state.historyUnit = historySession.workSummaryUnit;
  renderTaskMemoDialog();
  elements.taskMemoDialog.showModal();
}

export function formatSignedDuration(
  milliseconds,
  unit = historySession.workSummaryUnit,
) {
  const displayedMs =
    unit === "minutes"
      ? Math.round(milliseconds / 60000) * 60000
      : Math.trunc(milliseconds / 1000) * 1000;
  const sign = displayedMs > 0 ? "+" : displayedMs < 0 ? "−" : "±";
  return `${sign}${formatDurationForUnit(Math.abs(displayedMs), unit)}`;
}

export function openWorkSummaryDialog(dateKey) {
  historySession.workSummaryDateKey = dateKey;
  renderWorkSummary();
  elements.workSummaryDialog.showModal();
}

export function renderWorkSummary() {
  if (!historySession.workSummaryDateKey) return;
  const values = historySession.workdayTimes[
    historySession.workSummaryDateKey
  ] || { clockIn: "", clockOut: "", breakDurationMs: 0 };
  const records = state.records.filter(
    (record) => record.date === historySession.workSummaryDateKey,
  );
  const measuredMs = records.reduce(
    (total, record) => total + record.durationMs,
    0,
  );
  const grossWorkMs = calculateWorkDurationMs(values.clockIn, values.clockOut);
  const breakDurationMs = Number.isFinite(values.breakDurationMs)
    ? Math.max(0, values.breakDurationMs)
    : 0;
  const breakExceedsWork =
    grossWorkMs !== null && breakDurationMs > grossWorkMs;
  const workMs =
    grossWorkMs === null ? null : Math.max(0, grossWorkMs - breakDurationMs);
  const canEdit = canEditHistoryDate(historySession.workSummaryDateKey);
  elements.workSummaryDate.textContent = formatHistoryDateLabel(
    historySession.workSummaryDateKey,
  );
  elements.clockInInput.value = values.clockIn;
  elements.clockOutInput.value = values.clockOut;
  const totalBreakMinutes = Math.round(breakDurationMs / 60000);
  const breakInputMinutes = Math.min(totalBreakMinutes, 23 * 60 + 59);
  elements.breakTimeInput.value = [
    Math.floor(breakInputMinutes / 60),
    breakInputMinutes % 60,
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  [
    elements.clockInInput,
    elements.clockOutInput,
    elements.breakTimeInput,
  ].forEach((input) => {
    input.disabled = !canEdit;
  });
  elements.workSummaryUnitButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.workSummaryUnit === historySession.workSummaryUnit,
    );
  });
  elements.workSummaryEditStatus.textContent = breakExceedsWork
    ? "休憩時間が拘束時間を超えています。勤務時間は0として表示します。"
    : canEdit
      ? "出退勤時間と休憩時間はこの端末に保存されます"
      : "過去の出退勤時間・休憩時間は参照のみです";
  elements.workSummaryEditStatus.classList.toggle("is-error", breakExceedsWork);
  const emptyDuration =
    historySession.workSummaryUnit === "minutes" ? "--分" : "--:--:--";
  elements.workDurationValue.textContent =
    workMs === null
      ? emptyDuration
      : formatDurationForUnit(workMs, historySession.workSummaryUnit);
  elements.measuredDurationValue.textContent = formatDurationForUnit(
    measuredMs,
    historySession.workSummaryUnit,
  );
  elements.workDifferenceValue.textContent =
    workMs === null
      ? emptyDuration
      : formatSignedDuration(
          workMs - measuredMs,
          historySession.workSummaryUnit,
        );
  const differenceMs = workMs === null ? null : workMs - measuredMs;
  const displayedDifferenceMs =
    differenceMs === null
      ? null
      : historySession.workSummaryUnit === "minutes"
        ? Math.round(differenceMs / 60000) * 60000
        : Math.trunc(differenceMs / 1000) * 1000;
  elements.workDifferenceValue.classList.toggle(
    "is-positive",
    displayedDifferenceMs !== null && displayedDifferenceMs > 0,
  );
  elements.workDifferenceValue.classList.toggle(
    "is-negative",
    displayedDifferenceMs !== null && displayedDifferenceMs < 0,
  );
  elements.workSummaryTaskTable.replaceChildren();
  if (records.length)
    elements.workSummaryTaskTable.append(
      createTaskSummaryTable(records, historySession.workSummaryUnit),
    );
  else {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "この日の記録はありません";
    elements.workSummaryTaskTable.append(empty);
  }
}

export function saveWorkSummaryTimes({
  applyDefaultBreak = false,
  breakEdited = false,
} = {}) {
  if (
    !historySession.workSummaryDateKey ||
    !canEditHistoryDate(historySession.workSummaryDateKey)
  ) {
    renderWorkSummary();
    showToast("過去の出退勤時間は参照のみです");
    return;
  }
  const clockIn = elements.clockInInput.value;
  const clockOut = elements.clockOutInput.value;
  const [breakHours, breakMinutes] = (elements.breakTimeInput.value || "00:00")
    .split(":")
    .map(Number);
  let breakDurationMs =
    (Math.max(0, breakHours || 0) * 60 + Math.max(0, breakMinutes || 0)) *
    60000;
  const existingValues =
    historySession.workdayTimes[historySession.workSummaryDateKey];
  const breakDurationSet =
    breakEdited || existingValues?.breakDurationSet === true;
  if (
    applyDefaultBreak &&
    clockIn &&
    clockOut &&
    !breakDurationSet &&
    breakDurationMs === 0
  ) {
    breakDurationMs = 60 * 60000;
    elements.breakTimeInput.value = "01:00";
  }
  if (clockIn || clockOut || breakDurationMs > 0) {
    historySession.workdayTimes[historySession.workSummaryDateKey] = {
      clockIn,
      clockOut,
      breakDurationMs,
      breakDurationSet,
    };
  } else delete historySession.workdayTimes[historySession.workSummaryDateKey];
  saveWorkdayTimes();
  renderWorkSummary();
  if (elements.historyDialog.open) renderHistory();
}

export function bindSummaryEvents() {
  elements.clockInInput.addEventListener("change", () =>
    saveWorkSummaryTimes({ applyDefaultBreak: true }),
  );
  elements.clockOutInput.addEventListener("change", () =>
    saveWorkSummaryTimes({ applyDefaultBreak: true }),
  );
  elements.breakTimeInput.addEventListener("change", () =>
    saveWorkSummaryTimes({ breakEdited: true }),
  );
  elements.workSummaryUnitButtons.forEach((button) =>
    button.addEventListener("click", () => {
      setSharedTimeFormat(button.dataset.workSummaryUnit);
    }),
  );
  elements.unitButtons.forEach((button) =>
    button.addEventListener("click", () => {
      setSharedTimeFormat(button.dataset.unit);
    }),
  );
  elements.taskMemoTotal.addEventListener("click", () => {
    setSharedTimeFormat(
      historySession.workSummaryUnit === "minutes" ? "clock" : "minutes",
    );
  });
  elements.taskMemoDialog.addEventListener("close", () => {
    historySession.activeTaskMemoName = "";
    historySession.activeTaskMemoRecords = [];
  });
}
