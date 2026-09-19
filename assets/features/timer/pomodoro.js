import { state } from "../../core/state.js";
import { freezeRunningTimer } from "./controls.js";
import { syncInputsFromDuration } from "./countdown.js";
import { render } from "./view.js";
import { now } from "../../shared/time.js";
import { saveState } from "../../storage/repository.js";
import { showToast } from "../../ui/toast.js";

export function finishCountdown() {
  freezeRunningTimer();
  state.hasStarted = true;
  saveState();
  render();
}

export function finishPomodoroPhase() {
  const completedPhase = state.pomodoroPhase;
  freezeRunningTimer();
  if (completedPhase === "work") {
    state.elapsedBeforeStartMs += Math.max(
      0,
      state.countdownDurationMs - state.pomodoroPhaseElapsedBeforeStartMs,
    );
    if (
      state.pomodoroPlannedBreakCount >= 0 &&
      state.pomodoroCompletedBreakCount >= state.pomodoroPlannedBreakCount
    ) {
      state.pomodoroEnabled = false;
      state.pomodoroPhase = "work";
      state.pomodoroPhaseElapsedBeforeStartMs = 0;
      state.countdownSessionStartElapsedMs = Math.max(
        0,
        state.elapsedBeforeStartMs - state.countdownDurationMs,
      );
      state.finishedAt = now();
      saveState();
      render();
      showToast("指定時刻までのポモドーロが完了しました");
      return;
    }
    state.pomodoroPhase = "break";
  } else {
    state.pomodoroCompletedBreakCount += 1;
    state.pomodoroPhase = "work";
    if (
      state.pomodoroPlannedBreakCount >= 0 &&
      state.pomodoroCompletedBreakCount >= state.pomodoroPlannedBreakCount &&
      state.pomodoroFinalWorkDurationMs > 0
    ) {
      state.countdownDurationMs = state.pomodoroFinalWorkDurationMs;
      syncInputsFromDuration();
    }
  }
  state.pomodoroPhaseElapsedBeforeStartMs = 0;
  state.finishedAt = 0;
  state.hasStarted = state.elapsedBeforeStartMs > 0;
  saveState();
  render();
  showToast(
    completedPhase === "work"
      ? "作業終了です。休憩を開始できます"
      : "休憩終了です。次の作業を開始できます",
  );
}

export function finishPomodoroBreakEarly() {
  freezeRunningTimer();
  if (state.pomodoroPlannedBreakCount >= 0) {
    state.pomodoroCompletedBreakCount += 1;
    if (
      state.pomodoroCompletedBreakCount >= state.pomodoroPlannedBreakCount &&
      state.pomodoroFinalWorkDurationMs > 0
    ) {
      state.countdownDurationMs = state.pomodoroFinalWorkDurationMs;
      syncInputsFromDuration();
    }
  }
  state.pomodoroPhase = "work";
  state.pomodoroPhaseElapsedBeforeStartMs = 0;
  state.finishedAt = 0;
  saveState();
  render();
  showToast("休憩を終了しました。次の作業を開始できます");
}
