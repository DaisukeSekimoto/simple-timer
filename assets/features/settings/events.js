import {
  AGGREGATION_ENABLED_KEY,
  DEFAULT_MODE_KEY,
  MODES,
  PRIMARY_TIME_DISPLAY_KEY,
  THEME_KEY,
} from "../../core/constants.js";
import { state } from "../../core/state.js";
import { renderHistory } from "../history/list.js";
import {
  applyTheme,
  disablePastHistoryEditing,
  enablePastHistoryEditing,
  getFinishSoundVolume,
  openSettingsDialog,
  saveFinishSoundVolume,
  setSharedTimeFormat,
  togglePrimaryTimeDisplay,
  updateFinishSoundVolumeSetting,
} from "./settings.js";
import { playFinishSound } from "../timer/audio.js";
import { render } from "../timer/view.js";
import { storage } from "../../storage/client.js";
import { saveState } from "../../storage/repository.js";
import { bindActivation } from "../../ui/activation.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function bindSettingsEvents() {
  elements.settingsButton.addEventListener("click", openSettingsDialog);
  elements.defaultModeSelect.addEventListener("change", () => {
    if (!Object.values(MODES).includes(elements.defaultModeSelect.value))
      return;
    storage.setItem(DEFAULT_MODE_KEY, elements.defaultModeSelect.value);
    if (
      !state.hasStarted &&
      !state.isRunning &&
      state.elapsedBeforeStartMs === 0
    ) {
      state.mode = elements.defaultModeSelect.value;
      state.countdownSessionStartElapsedMs = 0;
      state.finishedAt = 0;
      saveState();
      render();
    }
    showToast("新しいタイマーの初期モードを変更しました");
  });
  elements.aggregationEnabledInput.addEventListener("change", () => {
    storage.setItem(
      AGGREGATION_ENABLED_KEY,
      String(elements.aggregationEnabledInput.checked),
    );
    if (elements.historyDialog.open) renderHistory();
    showToast(
      elements.aggregationEnabledInput.checked
        ? "高度な計測を有効にしました"
        : "高度な計測を無効にしました",
    );
  });
  elements.pastHistoryEditInput.addEventListener("change", () => {
    if (elements.pastHistoryEditInput.checked) enablePastHistoryEditing();
    else disablePastHistoryEditing(true);
  });
  elements.themeSelect.addEventListener("change", () => {
    const theme = elements.themeSelect.value;
    if (!["system", "light", "dark"].includes(theme)) return;
    if (theme === "system") storage.removeItem(THEME_KEY);
    else storage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    showToast("表示テーマを変更しました");
  });
  elements.primaryTimeDisplaySelect.addEventListener("change", () => {
    const value = elements.primaryTimeDisplaySelect.value;
    if (!["measurement", "clock"].includes(value)) return;
    storage.setItem(PRIMARY_TIME_DISPLAY_KEY, value);
    render();
    showToast(
      value === "measurement"
        ? "計測時間を大きく表示します"
        : "現在時刻を大きく表示します",
    );
  });
  elements.defaultTimeFormatSelect.addEventListener("change", () => {
    setSharedTimeFormat(elements.defaultTimeFormatSelect.value, {
      saveDefault: true,
      notify: true,
    });
  });
  elements.finishSoundVolumeInput.addEventListener("input", () => {
    saveFinishSoundVolume(Number(elements.finishSoundVolumeInput.value));
  });
  elements.finishSoundVolumeNumberInput.addEventListener("input", () => {
    if (elements.finishSoundVolumeNumberInput.value === "") return;
    saveFinishSoundVolume(Number(elements.finishSoundVolumeNumberInput.value));
  });
  elements.finishSoundVolumeNumberInput.addEventListener("change", () => {
    if (
      !saveFinishSoundVolume(
        Number(elements.finishSoundVolumeNumberInput.value),
      )
    ) {
      updateFinishSoundVolumeSetting();
    }
  });
  elements.previewFinishSoundButton.addEventListener("click", () => {
    if (getFinishSoundVolume() <= 0) {
      showToast("終了音の音量は0%です");
      return;
    }
    playFinishSound();
  });
}

export function bindDisplayEvents() {
  bindActivation(elements.timeDisplayArea, togglePrimaryTimeDisplay);
  elements.timeDisplay.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePrimaryTimeDisplay();
  });
  bindActivation(elements.secondaryTimeDisplay, togglePrimaryTimeDisplay);
  bindActivation(elements.cumulativeTimeDisplay, togglePrimaryTimeDisplay);
}
