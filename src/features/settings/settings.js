import {
  AGGREGATION_ENABLED_KEY,
  DEFAULT_MODE_KEY,
  DEFAULT_TIME_FORMAT_KEY,
  FINISH_SOUND_VOLUME_KEY,
  MODES,
  PRIMARY_TIME_DISPLAY_KEY,
  THEME_KEY,
} from "../../core/constants.js";
import { state } from "../../core/state.js";
import { renderHistory } from "../history/list.js";
import { renderHistoryDateOptions } from "../history/memos.js";
import { historySession } from "../history/state.js";
import { renderTaskMemoDialog, renderWorkSummary } from "../history/summary.js";
import { updatePopupSizeSettings } from "../popup/window.js";
import { settingsSession } from "./state.js";
import { render } from "../timer/view.js";
import { localDateKey, now } from "../../shared/time.js";
import { storage } from "../../storage/client.js";
import { elements } from "../../ui/elements.js";
import { showToast } from "../../ui/toast.js";

export function getDefaultMode() {
  const savedMode = storage.getItem(DEFAULT_MODE_KEY);
  if (savedMode === "pomodoro") return MODES.COUNTDOWN;
  return Object.values(MODES).includes(savedMode) ? savedMode : MODES.COUNTDOWN;
}

export function getDefaultTimeFormat() {
  return storage.getItem(DEFAULT_TIME_FORMAT_KEY) === "clock"
    ? "clock"
    : "minutes";
}

export function setSharedTimeFormat(
  unit,
  { saveDefault = false, notify = false } = {},
) {
  const normalizedUnit = unit === "clock" ? "clock" : "minutes";
  state.historyUnit = normalizedUnit;
  historySession.workSummaryUnit = normalizedUnit;
  if (saveDefault) {
    storage.setItem(DEFAULT_TIME_FORMAT_KEY, normalizedUnit);
    elements.defaultTimeFormatSelect.value = normalizedUnit;
  }
  if (elements.historyDialog.open) renderHistory();
  if (elements.workSummaryDialog.open) renderWorkSummary();
  if (elements.taskMemoDialog.open) renderTaskMemoDialog();
  if (notify)
    showToast(
      normalizedUnit === "clock"
        ? "時間表記のデフォルトをhh:mm:ssに変更しました"
        : "時間表記のデフォルトを分に変更しました",
    );
}

export function isAggregationEnabled() {
  return storage.getItem(AGGREGATION_ENABLED_KEY) === "true";
}

export function isPastHistoryEditUnlocked() {
  return settingsSession.pastHistoryEditUnlockedUntil > now();
}

export function canEditHistoryDate(dateKey) {
  return dateKey === localDateKey() || isPastHistoryEditUnlocked();
}

export function updatePastHistoryEditSetting() {
  const unlocked = isPastHistoryEditUnlocked();
  elements.pastHistoryEditInput.checked = unlocked;
  if (!unlocked) {
    elements.pastHistoryEditStatus.textContent = "OFF（過去の履歴は参照のみ）";
    return;
  }
  const remainingSeconds = Math.max(
    0,
    Math.ceil((settingsSession.pastHistoryEditUnlockedUntil - now()) / 1000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  elements.pastHistoryEditStatus.textContent =
    "ON（残り " + minutes + ":" + seconds + "）";
}

export function disablePastHistoryEditing(notify = false) {
  const selectedDate = elements.historyDate.value;
  settingsSession.pastHistoryEditUnlockedUntil = 0;
  window.clearTimeout(settingsSession.pastHistoryEditTimeoutId);
  settingsSession.pastHistoryEditTimeoutId = 0;
  updatePastHistoryEditSetting();
  if (
    historySession.editingRecord &&
    historySession.editingRecord.date !== localDateKey() &&
    elements.editHistoryDialog.open
  ) {
    elements.editHistoryDialog.close();
  }
  if (
    elements.addHistoryDialog.open &&
    elements.manualDate.value !== localDateKey()
  ) {
    elements.addHistoryDialog.close();
  }
  if (elements.historyDialog.open) {
    renderHistoryDateOptions(selectedDate);
    renderHistory();
  }
  if (elements.workSummaryDialog.open) renderWorkSummary();
  if (notify) showToast("過去の履歴編集をOFFにしました");
}

export function enablePastHistoryEditing() {
  settingsSession.pastHistoryEditUnlockedUntil = now() + 5 * 60 * 1000;
  window.clearTimeout(settingsSession.pastHistoryEditTimeoutId);
  settingsSession.pastHistoryEditTimeoutId = window.setTimeout(
    () => disablePastHistoryEditing(true),
    5 * 60 * 1000,
  );
  updatePastHistoryEditSetting();
  if (elements.historyDialog.open) {
    renderHistoryDateOptions(elements.historyDate.value);
    renderHistory();
  }
  if (elements.workSummaryDialog.open) renderWorkSummary();
  showToast("過去の履歴編集を5分間許可しました");
}

export function openSettingsDialog() {
  elements.defaultModeSelect.value = getDefaultMode();
  elements.aggregationEnabledInput.checked = isAggregationEnabled();
  updatePastHistoryEditSetting();
  elements.themeSelect.value = getTheme();
  elements.primaryTimeDisplaySelect.value = getPrimaryTimeDisplay();
  elements.defaultTimeFormatSelect.value = getDefaultTimeFormat();
  updateFinishSoundVolumeSetting();
  elements.backupStatus.textContent = "";
  elements.backupStatus.classList.remove("is-error");
  updatePopupSizeSettings();
  elements.settingsDialog.showModal();
}

export function getTheme() {
  const theme = storage.getItem(THEME_KEY);
  return ["light", "dark"].includes(theme) ? theme : "system";
}

export function getPrimaryTimeDisplay() {
  return storage.getItem(PRIMARY_TIME_DISPLAY_KEY) === "clock"
    ? "clock"
    : "measurement";
}

export function getFinishSoundVolume() {
  const savedVolume = Number.parseInt(
    storage.getItem(FINISH_SOUND_VOLUME_KEY) || "50",
    10,
  );
  return Number.isSafeInteger(savedVolume) ? Math.max(0, savedVolume) : 50;
}

export function updateFinishSoundVolumeSetting() {
  const volume = getFinishSoundVolume();
  elements.finishSoundVolumeInput.value = String(Math.min(100, volume));
  elements.finishSoundVolumeNumberInput.value = String(volume);
}

export function saveFinishSoundVolume(value) {
  const parsedVolume = Number(value);
  if (!Number.isSafeInteger(parsedVolume)) return false;
  const volume = Math.max(0, parsedVolume);
  storage.setItem(FINISH_SOUND_VOLUME_KEY, String(volume));
  elements.finishSoundVolumeInput.value = String(Math.min(100, volume));
  elements.finishSoundVolumeNumberInput.value = String(volume);
  return true;
}

export function togglePrimaryTimeDisplay() {
  const value =
    getPrimaryTimeDisplay() === "measurement" ? "clock" : "measurement";
  storage.setItem(PRIMARY_TIME_DISPLAY_KEY, value);
  elements.primaryTimeDisplaySelect.value = value;
  render();
  showToast(
    value === "measurement"
      ? "計測時間を大きく表示します"
      : "現在時刻を大きく表示します",
  );
}

export function resolveTheme(theme) {
  if (theme !== "system") return theme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme = getTheme()) {
  document.documentElement.dataset.theme = theme;
  const appDocument = elements.app?.ownerDocument;
  if (appDocument && appDocument !== document) {
    appDocument.documentElement.dataset.theme = resolveTheme(theme);
  }
}
