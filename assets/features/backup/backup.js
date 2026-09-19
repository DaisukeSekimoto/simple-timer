import {
  AGGREGATION_ENABLED_KEY,
  BACKUP_FORMAT,
  BACKUP_STORAGE_KEYS,
  BACKUP_VERSION,
  DAILY_MEMOS_KEY,
  DEFAULT_MODE_KEY,
  FINISH_SOUND_VOLUME_KEY,
  MINIMIZED_POPUP_SIZE_KEY,
  MODES,
  POPUP_SIZE_KEY,
  PRIMARY_TIME_DISPLAY_KEY,
  RECORDS_KEY,
  STORAGE_KEY,
  THEME_KEY,
  TODOS_KEY,
  WORKDAY_TIMES_KEY,
} from "../../core/constants.js";
import { state } from "../../core/state.js";
import { backupSession } from "./state.js";
import { historySession } from "../history/state.js";
import { downloadFile } from "../../shared/download.js";
import { localDateKey } from "../../shared/time.js";
import { storage } from "../../storage/client.js";
import {
  saveDailyMemos,
  saveRecords,
  saveState,
  saveWorkdayTimes,
} from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";

export function setBackupStatus(message, isError = false) {
  elements.backupStatus.textContent = message;
  elements.backupStatus.classList.toggle("is-error", isError);
}

export function getBackupSummary(storage) {
  const parse = (key, fallback) => {
    try {
      return JSON.parse(storage[key] || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  };
  const records = parse(RECORDS_KEY, []);
  const timerState = parse(STORAGE_KEY, {});
  const memos = parse(DAILY_MEMOS_KEY, {});
  const workdays = parse(WORKDAY_TIMES_KEY, {});
  const dates = Array.isArray(records)
    ? records
        .map((record) => record && record.date)
        .filter((date) => typeof date === "string")
        .sort()
    : [];
  return [
    `作業履歴：${Array.isArray(records) ? records.length : 0}件`,
    `対象期間：${dates.length ? `${dates[0]} ～ ${dates[dates.length - 1]}` : "履歴なし"}`,
    `タイマータブ：${Array.isArray(timerState.timerTabs) ? timerState.timerTabs.length : 0}件`,
    `日別メモ：${memos && typeof memos === "object" && !Array.isArray(memos) ? Object.keys(memos).length : 0}件`,
    `出退勤記録：${workdays && typeof workdays === "object" && !Array.isArray(workdays) ? Object.keys(workdays).length : 0}件`,
  ].join("\n");
}

export function exportBackup() {
  saveState();
  saveRecords();
  saveDailyMemos();
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    storage: Object.fromEntries(
      BACKUP_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]),
    ),
  };
  if (
    !window.confirm(
      `次の内容をバックアップします。\n\n${getBackupSummary(backup.storage)}\n\nエクスポートしますか？`,
    )
  ) {
    setBackupStatus("エクスポートをキャンセルしました。");
    return;
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  downloadFile(blob, `simple-timer-backup-${localDateKey()}.json`);
  setBackupStatus("バックアップファイルを保存しました。");
}

export function validateBackup(backup) {
  if (
    !backup ||
    backup.format !== BACKUP_FORMAT ||
    backup.version !== BACKUP_VERSION
  ) {
    throw new Error(
      "Simple Timerのバックアップファイルではないか、対応していない形式です。",
    );
  }
  if (
    !backup.storage ||
    typeof backup.storage !== "object" ||
    Array.isArray(backup.storage)
  ) {
    throw new Error("バックアップの保存データが見つかりません。");
  }
  BACKUP_STORAGE_KEYS.forEach((key) => {
    if (!(key in backup.storage)) backup.storage[key] = null;
    const value = backup.storage[key];
    if (value !== null && typeof value !== "string") {
      throw new Error("バックアップ内のデータ形式が正しくありません。");
    }
  });
  [
    [
      STORAGE_KEY,
      (value) => value && typeof value === "object" && !Array.isArray(value),
    ],
    [RECORDS_KEY, Array.isArray],
    [TODOS_KEY, Array.isArray],
    [
      POPUP_SIZE_KEY,
      (value) =>
        value && Number.isFinite(value.width) && Number.isFinite(value.height),
    ],
    [
      MINIMIZED_POPUP_SIZE_KEY,
      (value) =>
        value && Number.isFinite(value.width) && Number.isFinite(value.height),
    ],
    [
      DAILY_MEMOS_KEY,
      (value) => value && typeof value === "object" && !Array.isArray(value),
    ],
    [
      WORKDAY_TIMES_KEY,
      (value) => value && typeof value === "object" && !Array.isArray(value),
    ],
  ].forEach(([key, isValid]) => {
    const rawValue = backup.storage[key];
    if (rawValue === null) return;
    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      throw new Error("バックアップ内のJSONデータが破損しています。");
    }
    if (!isValid(parsed))
      throw new Error("バックアップ内のデータ形式が正しくありません。");
  });
  if (
    backup.storage[DEFAULT_MODE_KEY] !== null &&
    !Object.values(MODES).includes(backup.storage[DEFAULT_MODE_KEY])
  ) {
    throw new Error("バックアップ内の初期表示設定が正しくありません。");
  }
  if (
    backup.storage[AGGREGATION_ENABLED_KEY] !== null &&
    !["true", "false"].includes(backup.storage[AGGREGATION_ENABLED_KEY])
  ) {
    throw new Error("バックアップ内の高度な計測設定が正しくありません。");
  }
  if (
    backup.storage[THEME_KEY] !== null &&
    !["system", "light", "dark"].includes(backup.storage[THEME_KEY])
  ) {
    throw new Error("バックアップ内のテーマ設定が正しくありません。");
  }
  if (
    backup.storage[PRIMARY_TIME_DISPLAY_KEY] !== null &&
    !["measurement", "clock"].includes(backup.storage[PRIMARY_TIME_DISPLAY_KEY])
  ) {
    throw new Error("バックアップ内の時間表示設定が正しくありません。");
  }
  if (backup.storage[FINISH_SOUND_VOLUME_KEY] !== null) {
    const volume = Number(backup.storage[FINISH_SOUND_VOLUME_KEY]);
    if (!Number.isSafeInteger(volume) || volume < 0) {
      throw new Error("バックアップ内の終了音量設定が正しくありません。");
    }
  }
}

export function parseBackupJsonValue(storage, key, fallback) {
  try {
    const value = storage[key];
    return value === null || value === undefined ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function recordMergeKey(record) {
  if (record && typeof record.id === "string" && record.id)
    return `id:${record.id}`;
  return `record:${[
    record?.date,
    record?.createdAt,
    record?.firstStartedAt,
    record?.taskName,
    record?.durationMs,
  ].join("|")}`;
}

export function mergeBackupData(backup) {
  saveState();
  saveRecords();
  saveDailyMemos();
  saveWorkdayTimes();

  const storedCurrentRecords = parseBackupJsonValue(
    { [RECORDS_KEY]: storage.getItem(RECORDS_KEY) },
    RECORDS_KEY,
    [],
  );
  const storedImportedRecords = parseBackupJsonValue(
    backup.storage,
    RECORDS_KEY,
    [],
  );
  const currentRecords = Array.isArray(storedCurrentRecords)
    ? storedCurrentRecords
    : [];
  const importedRecords = Array.isArray(storedImportedRecords)
    ? storedImportedRecords
    : [];
  const mergedRecords = [];
  const recordKeys = new Set();
  [...currentRecords, ...importedRecords].forEach((record) => {
    const key = recordMergeKey(record);
    if (recordKeys.has(key)) return;
    recordKeys.add(key);
    mergedRecords.push(record);
  });

  const currentMemos = parseBackupJsonValue(
    { [DAILY_MEMOS_KEY]: storage.getItem(DAILY_MEMOS_KEY) },
    DAILY_MEMOS_KEY,
    {},
  );
  const importedMemos = parseBackupJsonValue(
    backup.storage,
    DAILY_MEMOS_KEY,
    {},
  );
  const currentWorkdays = parseBackupJsonValue(
    { [WORKDAY_TIMES_KEY]: storage.getItem(WORKDAY_TIMES_KEY) },
    WORKDAY_TIMES_KEY,
    {},
  );
  const importedWorkdays = parseBackupJsonValue(
    backup.storage,
    WORKDAY_TIMES_KEY,
    {},
  );

  storage.setItem(RECORDS_KEY, JSON.stringify(mergedRecords));
  storage.setItem(
    DAILY_MEMOS_KEY,
    JSON.stringify({ ...importedMemos, ...currentMemos }),
  );
  storage.setItem(
    WORKDAY_TIMES_KEY,
    JSON.stringify({ ...importedWorkdays, ...currentWorkdays }),
  );
}

export function finishBackupImport(mode) {
  if (!backupSession.pendingBackupImport) return;
  const backup = backupSession.pendingBackupImport;
  backupSession.pendingBackupImport = null;
  if (elements.backupImportModeDialog.open)
    elements.backupImportModeDialog.close();
  if (mode === "merge") {
    mergeBackupData(backup);
  } else {
    BACKUP_STORAGE_KEYS.forEach((key) => {
      const value = backup.storage[key];
      storage.removeItem(key);
      if (value !== null) storage.setItem(key, value);
    });
  }
  if (mode === "merge") {
    const currentTodos = JSON.parse(storage.getItem(TODOS_KEY));
    const importedTodos = parseBackupJsonValue(backup.storage, TODOS_KEY, []);
    storage.setItem(
      TODOS_KEY,
      JSON.stringify([
        ...new Map(
          [...importedTodos, ...currentTodos].map((todo) => [todo.id, todo]),
        ).values(),
      ]),
    );
  }
  location.reload();
}

export function hasCurrentImportableData() {
  return (
    state.records.length > 0 ||
    JSON.parse(storage.getItem(TODOS_KEY)).length > 0 ||
    Object.keys(historySession.dailyMemos).length > 0 ||
    Object.keys(historySession.workdayTimes).length > 0
  );
}

export async function importBackup(event) {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    validateBackup(backup);
    backupSession.pendingBackupImport = backup;
    if (!hasCurrentImportableData()) {
      finishBackupImport("replace");
      return;
    }
    elements.backupImportSummary.textContent = `バックアップの内容\n${getBackupSummary(backup.storage)}`;
    elements.backupImportModeDialog.showModal();
  } catch (error) {
    setBackupStatus(
      error instanceof Error
        ? error.message
        : "バックアップを読み込めませんでした。",
      true,
    );
  }
}

export function bindBackupEvents() {
  elements.backupExportButton.addEventListener("click", exportBackup);
  elements.backupImportButton.addEventListener("click", () =>
    elements.backupFileInput.click(),
  );
  elements.backupFileInput.addEventListener("change", importBackup);
  elements.cancelBackupImportButton.addEventListener("click", () => {
    backupSession.pendingBackupImport = null;
    elements.backupImportModeDialog.close();
    setBackupStatus("インポートをキャンセルしました。");
  });
  elements.mergeBackupImportButton.addEventListener("click", () =>
    finishBackupImport("merge"),
  );
  elements.replaceBackupImportButton.addEventListener("click", () =>
    finishBackupImport("replace"),
  );
  elements.backupImportModeDialog.addEventListener("cancel", () => {
    backupSession.pendingBackupImport = null;
    setBackupStatus("インポートをキャンセルしました。");
  });
}
