import { historySession } from "./state.js";
import {
  calculateTimeRangeDuration,
  formatTime,
  formatTimeInputValue,
} from "../../shared/time.js";
import { elements } from "../../ui/elements.js";

export function readDurationPart(input) {
  const value = input.value.trim();
  if (value === "") return 0;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function normalizeDurationInputs(inputs, errorElement) {
  const [hoursInput, minutesInput, secondsInput] = inputs;
  const hours = readDurationPart(hoursInput);
  const minutes = readDurationPart(minutesInput);
  const seconds = readDurationPart(secondsInput);
  if ([hours, minutes, seconds].includes(null)) {
    errorElement.textContent = "作業時間は0以上の整数で入力してください";
    return null;
  }
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  if (
    !Number.isSafeInteger(totalSeconds) ||
    totalSeconds > Number.MAX_SAFE_INTEGER / 1000
  ) {
    errorElement.textContent = "作業時間の値が大きすぎます";
    return null;
  }
  setDurationInputValues(inputs, totalSeconds * 1000);
  errorElement.textContent = "";
  return totalSeconds * 1000;
}

export function normalizeEditDurationInputs() {
  return normalizeDurationInputs(
    [
      elements.editHoursInput,
      elements.editMinutesInput,
      elements.editSecondsInput,
    ],
    elements.editHistoryError,
  );
}

export function normalizeManualDurationInputs() {
  return normalizeDurationInputs(
    [
      elements.manualHoursInput,
      elements.manualMinutesInput,
      elements.manualSecondsInput,
    ],
    elements.manualHistoryError,
  );
}

export function setDurationInputValues(inputs, durationMs) {
  const totalSeconds = Math.floor(durationMs / 1000);
  inputs[0].value = String(Math.floor(totalSeconds / 3600));
  inputs[1].value = String(Math.floor((totalSeconds % 3600) / 60));
  inputs[2].value = String(totalSeconds % 60);
}

export function readDurationInputValues(inputs) {
  const parts = inputs.map(readDurationPart);
  if (parts.includes(null)) return null;
  const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.isSafeInteger(totalSeconds) ? totalSeconds * 1000 : null;
}

export function syncDurationAfterTimeRangeChange(kind) {
  const isManual = kind === "manual";
  const timeInputs = isManual
    ? [elements.manualStartTimeInput, elements.manualEndTimeInput]
    : [elements.editStartTimeInput, elements.editEndTimeInput];
  const durationInputs = isManual
    ? [
        elements.manualHoursInput,
        elements.manualMinutesInput,
        elements.manualSecondsInput,
      ]
    : [
        elements.editHoursInput,
        elements.editMinutesInput,
        elements.editSecondsInput,
      ];
  const recordDate = isManual
    ? elements.manualDate.value
    : historySession.editingRecord?.date;
  const nextDurationMs = calculateTimeRangeDuration(
    recordDate,
    timeInputs[0].value,
    timeInputs[1].value,
  );
  if (nextDurationMs === null) return;
  const enteredDurationMs = readDurationInputValues(durationInputs);
  const previousDurationMs = isManual
    ? historySession.previousManualTimeRangeDurationMs
    : historySession.previousEditTimeRangeDurationMs;
  if (enteredDurationMs === 0 || enteredDurationMs === previousDurationMs) {
    setDurationInputValues(durationInputs, nextDurationMs);
  }
  if (isManual)
    historySession.previousManualTimeRangeDurationMs = nextDurationMs;
  else historySession.previousEditTimeRangeDurationMs = nextDurationMs;
}

export function fillCurrentTimeIfEmpty(input) {
  if (input.disabled || input.readOnly || input.value) return;
  input.value = formatTimeInputValue(new Date());
  const view = input.ownerDocument.defaultView || window;
  input.dispatchEvent(new view.Event("input", { bubbles: true }));
}

export function openTimePicker(input) {
  if (input.disabled || input.readOnly) return;
  input.focus({ preventScroll: true });
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    // ブラウザ側で時刻選択UIが既に開いている場合は、そのまま利用する。
  }
}

export function parseHistoryTimeRange(
  recordDate,
  startTime,
  endTime,
  errorElement,
) {
  if (!startTime && !endTime) return false;
  if (!startTime || !endTime) {
    errorElement.textContent =
      "時刻を指定する場合は開始と終了の両方を入力してください";
    return null;
  }
  const startDate = new Date(`${recordDate}T${startTime}`);
  const endDate = new Date(`${recordDate}T${endTime}`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    errorElement.textContent = "開始時刻と終了時刻を正しく入力してください";
    return null;
  }
  if (startDate.getTime() > endDate.getTime())
    startDate.setDate(startDate.getDate() - 1);
  const durationMs = endDate.getTime() - startDate.getTime();
  if (!Number.isSafeInteger(durationMs) || durationMs < 1000) {
    errorElement.textContent = "終了時刻は開始時刻より後にしてください";
    return null;
  }
  errorElement.textContent = "";
  return { startDate, endDate, durationMs };
}

export function resolveDurationConflict(enteredDurationMs, timeRange, save) {
  if (
    !timeRange ||
    enteredDurationMs < 1000 ||
    enteredDurationMs === timeRange.durationMs
  ) {
    save(
      timeRange && enteredDurationMs < 1000
        ? timeRange.durationMs
        : enteredDurationMs,
    );
    return;
  }
  historySession.pendingDurationConflict = {
    enteredDurationMs,
    timeRangeDurationMs: timeRange.durationMs,
    save,
  };
  elements.durationConflictMessage.textContent = `入力した作業時間は ${formatTime(enteredDurationMs)}、開始・終了から計算した時間は ${formatTime(timeRange.durationMs)} です。`;
  elements.durationConflictDialog.showModal();
  window.setTimeout(() => elements.useTimeRangeDurationButton.focus(), 0);
}

export function finishDurationConflict(useTimeRange) {
  if (!historySession.pendingDurationConflict) return;
  const resolution = historySession.pendingDurationConflict;
  historySession.pendingDurationConflict = null;
  elements.durationConflictDialog.close();
  resolution.save(
    useTimeRange
      ? resolution.timeRangeDurationMs
      : resolution.enteredDurationMs,
  );
}
