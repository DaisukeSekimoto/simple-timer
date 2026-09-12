import { state } from "../../core/state.js";
import { setDurationInputValues } from "../history/duration.js";
import { getDisplayMs } from "./clock.js";
import {
  freezeRunningTimer,
  setCountdownDuration,
  startTicking,
} from "./controls.js";
import { timerSession } from "./state.js";
import { render } from "./view.js";
import { formatTime, normalizeSeconds, now } from "../../shared/time.js";
import { saveState } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function getDurationFromInputs() {
  const hours = Math.min(99, normalizeSeconds(elements.hoursInput.value, 0));
  const minutes = Math.min(
    59,
    normalizeSeconds(elements.minutesInput.value, 0),
  );
  const seconds = Math.min(
    59,
    normalizeSeconds(elements.secondsInput.value, 0),
  );
  return Math.max(1, hours * 3600 + minutes * 60 + seconds) * 1000;
}

export function setCountdownDurationInputs(totalSeconds) {
  const normalizedSeconds = Math.max(1, Math.round(totalSeconds));
  setDurationInputValues(
    [elements.hoursInput, elements.minutesInput, elements.secondsInput],
    normalizedSeconds * 1000,
  );
}

export function applyUntilTimeToInputs() {
  if (!elements.untilTimeInput.value) {
    elements.untilTimeStatus.textContent = "終了時刻を入力してください。";
    return;
  }
  const [hours, minutes] = elements.untilTimeInput.value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    elements.untilTimeStatus.textContent = "終了時刻を正しく入力してください。";
    return;
  }
  const current = new Date();
  const target = new Date(current);
  target.setHours(hours, minutes, 0, 0);
  let dayLabel = "本日";
  if (target.getTime() <= current.getTime()) {
    target.setDate(target.getDate() + 1);
    dayLabel = "翌日";
  }
  const durationSeconds = Math.max(
    1,
    Math.ceil((target.getTime() - current.getTime()) / 1000),
  );
  if (state.pomodoroEnabled) {
    const workUnitSeconds = Math.max(
      1,
      Math.round(getDurationFromInputs() / 1000),
    );
    const breakMinutes = Math.min(
      60,
      Math.max(1, normalizeSeconds(elements.untilTimeBreakInput.value, 5)),
    );
    const breakSeconds = breakMinutes * 60;
    const breakCount = Math.floor(
      Math.max(0, durationSeconds - 1) / (workUnitSeconds + breakSeconds),
    );
    const finalWorkSeconds =
      durationSeconds - breakCount * (workUnitSeconds + breakSeconds);
    const firstWorkSeconds =
      breakCount > 0 ? workUnitSeconds : finalWorkSeconds;
    timerSession.pendingUntilPomodoroPlan = {
      breakMinutes,
      breakCount,
      finalWorkSeconds,
      firstWorkSeconds,
    };
    elements.untilTimeStatus.textContent =
      `→ 作業 ${formatTime(workUnitSeconds * 1000)}単位\n` +
      `  休憩 ${breakMinutes}分 × ${breakCount}回\n` +
      `  最終作業 ${formatTime(finalWorkSeconds * 1000)}`;
    return;
  }
  timerSession.pendingUntilPomodoroPlan = null;
  setCountdownDurationInputs(durationSeconds);
  elements.untilTimeStatus.textContent = `${dayLabel} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}まで（残り ${formatTime(durationSeconds * 1000)}）`;
}

export function syncInputsFromDuration() {
  const totalSeconds = Math.round(state.countdownDurationMs / 1000);
  setCountdownDurationInputs(totalSeconds);
  elements.countdownDurationDisplay.textContent = formatTime(
    state.countdownDurationMs,
  );
  elements.pomodoroEnabledInput.checked = state.pomodoroEnabled;
  elements.pomodoroBreakInput.value = String(
    Math.round(state.pomodoroBreakDurationMs / 60000),
  );
  elements.untilTimeBreakInput.value = String(
    Math.round(state.pomodoroBreakDurationMs / 60000),
  );
}

export function bindCountdownEvents() {
  elements.pomodoroEnabledInput.addEventListener("change", () => {
    const remainingMs = getDisplayMs();
    const wasRunning = state.isRunning;
    freezeRunningTimer();
    state.pomodoroEnabled = elements.pomodoroEnabledInput.checked;
    state.pomodoroPlannedBreakCount = -1;
    state.pomodoroCompletedBreakCount = 0;
    state.pomodoroFinalWorkDurationMs = 0;
    state.pomodoroBreakDurationMs =
      Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) *
      60000;
    if (state.pomodoroEnabled) {
      state.pomodoroPhase = "work";
      state.pomodoroPhaseElapsedBeforeStartMs = Math.max(
        0,
        state.countdownDurationMs - remainingMs,
      );
    } else {
      state.pomodoroPhase = "work";
      state.pomodoroPhaseElapsedBeforeStartMs = 0;
      state.countdownDurationMs = Math.max(1000, remainingMs);
      state.countdownSessionStartElapsedMs = state.elapsedBeforeStartMs;
      syncInputsFromDuration();
    }
    if (wasRunning) {
      state.isRunning = true;
      state.startedAt = now();
      startTicking();
    }
    saveState();
    render();
    showToast(
      state.pomodoroEnabled
        ? "残り時間を維持してポモドーロを有効にしました"
        : "残り時間を維持してポモドーロを無効にしました",
    );
  });
  elements.countdownDialogPomodoroInput.addEventListener("change", () => {
    elements.pomodoroEnabledInput.checked =
      elements.countdownDialogPomodoroInput.checked;
    const view = elements.app.ownerDocument.defaultView || window;
    elements.pomodoroEnabledInput.dispatchEvent(new view.Event("change"));
  });
  elements.pomodoroBreakInput.addEventListener("change", () => {
    state.pomodoroBreakDurationMs =
      Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) *
      60000;
    syncInputsFromDuration();
    saveState();
  });
  elements.countdownDurationButton.addEventListener("click", () => {
    syncInputsFromDuration();
    timerSession.pendingUntilPomodoroPlan = null;
    elements.untilTimePomodoroSettings.hidden = !state.pomodoroEnabled;
    elements.untilTimeStatus.textContent = "";
    elements.countdownDurationDialog.showModal();
    window.setTimeout(() => elements.hoursInput.focus(), 0);
  });
  elements.countdownDurationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (timerSession.pendingUntilPomodoroPlan && state.pomodoroEnabled) {
      state.pomodoroBreakDurationMs =
        timerSession.pendingUntilPomodoroPlan.breakMinutes * 60000;
      state.pomodoroPlannedBreakCount =
        timerSession.pendingUntilPomodoroPlan.breakCount;
      state.pomodoroCompletedBreakCount = 0;
      state.pomodoroFinalWorkDurationMs =
        timerSession.pendingUntilPomodoroPlan.finalWorkSeconds * 1000;
      elements.pomodoroBreakInput.value = String(
        timerSession.pendingUntilPomodoroPlan.breakMinutes,
      );
    } else {
      state.pomodoroPlannedBreakCount = -1;
      state.pomodoroCompletedBreakCount = 0;
      state.pomodoroFinalWorkDurationMs = 0;
    }
    const durationSeconds = timerSession.pendingUntilPomodoroPlan
      ? timerSession.pendingUntilPomodoroPlan.firstWorkSeconds
      : getDurationFromInputs() / 1000;
    setCountdownDuration(durationSeconds);
    timerSession.pendingUntilPomodoroPlan = null;
    elements.countdownDurationDialog.close();
    showToast(
      state.pomodoroEnabled && state.pomodoroPlannedBreakCount >= 0
        ? "指定時刻までのポモドーロを設定しました"
        : "カウントダウン時間を変更しました",
    );
  });
  elements.countdownDurationDialog.addEventListener(
    "close",
    syncInputsFromDuration,
  );
  elements.applyUntilTimeButton.addEventListener(
    "click",
    applyUntilTimeToInputs,
  );
  elements.presetButtons.forEach((button) =>
    button.addEventListener("click", () => {
      setCountdownDurationInputs(Number.parseInt(button.dataset.seconds, 10));
    }),
  );
}
