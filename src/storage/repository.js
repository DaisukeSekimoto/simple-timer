import {
  DAILY_MEMOS_KEY,
  MODES,
  RECORDS_KEY,
  STORAGE_KEY,
  WORKDAY_TIMES_KEY,
} from "../core/constants.js";
import { state } from "../core/state.js";
import { historySession } from "../features/history/state.js";
import { normalizeTaskName } from "../features/tasks/tasks.js";
import {
  applyTimerTab,
  createTimerTab,
  isValidTimerTab,
  snapshotActiveTimer,
  snapshotBackgroundTimers,
} from "../features/timer/model.js";
import { timerSession } from "../features/timer/state.js";
import { localDateKey } from "../shared/time.js";
import { storage } from "./client.js";

export function loadState() {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
    const isFromToday =
      typeof saved.savedDate !== "string" || saved.savedDate === localDateKey();
    if (typeof saved.savedDate === "string")
      timerSession.activeStateDate = saved.savedDate;
    const savedTabs = Array.isArray(saved.timerTabs)
      ? saved.timerTabs.filter(isValidTimerTab)
      : [];
    if (savedTabs.length) {
      state.timerTabs = savedTabs.map((tab) => ({
        ...tab,
        mode: tab.mode === "pomodoro" ? MODES.COUNTDOWN : tab.mode,
        pomodoroEnabled:
          tab.pomodoroEnabled === true || tab.mode === "pomodoro",
        countdownDurationMs:
          tab.mode === "pomodoro" && Number.isFinite(tab.pomodoroWorkDurationMs)
            ? tab.pomodoroWorkDurationMs
            : tab.countdownDurationMs,
        taskName: tab.taskName.slice(0, 80),
        resumedRecordId:
          typeof tab.resumedRecordId === "string" ? tab.resumedRecordId : "",
        isRunning: false,
        startedAt: 0,
        countdownSessionStartElapsedMs: Number.isFinite(
          tab.countdownSessionStartElapsedMs,
        )
          ? Math.min(
              tab.countdownSessionStartElapsedMs,
              tab.elapsedBeforeStartMs,
            )
          : 0,
        hasStarted:
          tab.hasStarted === true ||
          tab.elapsedBeforeStartMs > 0 ||
          tab.finishedAt > 0,
      }));
      state.nextTimerNumber =
        Math.max(...state.timerTabs.map((tab) => tab.number)) + 1;
      const activeTab =
        state.timerTabs.find((tab) => tab.id === saved.activeTimerId) ||
        state.timerTabs[0];
      applyTimerTab(activeTab);
    } else {
      const firstTab = createTimerTab(1);
      if (isFromToday) {
        if (Object.values(MODES).includes(saved.mode))
          firstTab.mode = saved.mode;
        if (
          Number.isFinite(saved.countdownDurationMs) &&
          saved.countdownDurationMs > 0
        ) {
          firstTab.countdownDurationMs = saved.countdownDurationMs;
        }
        if (typeof saved.taskName === "string")
          firstTab.taskName = saved.taskName.slice(0, 80);
      }
      state.timerTabs = [firstTab];
      state.nextTimerNumber = 2;
      applyTimerTab(firstTab);
      if (!isFromToday) timerSession.activeStateDate = localDateKey();
    }
    loadRecords();
  } catch {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(RECORDS_KEY);
    const firstTab = createTimerTab(1);
    state.timerTabs = [firstTab];
    state.nextTimerNumber = 2;
    applyTimerTab(firstTab);
  }
}

export function saveState() {
  snapshotActiveTimer();
  snapshotBackgroundTimers();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      savedDate: timerSession.activeStateDate,
      activeTimerId: state.activeTimerId,
      nextTimerNumber: state.nextTimerNumber,
      timerTabs: state.timerTabs,
    }),
  );
}

export function saveRecords() {
  storage.setItem(RECORDS_KEY, JSON.stringify(state.records));
  loadRecords();
}

export function loadDailyMemos() {
  try {
    const savedMemos = JSON.parse(storage.getItem(DAILY_MEMOS_KEY) || "{}");
    historySession.dailyMemos =
      savedMemos && typeof savedMemos === "object" && !Array.isArray(savedMemos)
        ? Object.fromEntries(
            Object.entries(savedMemos)
              .filter(
                ([date, memo]) =>
                  /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof memo === "string",
              )
              .map(([date, memo]) => [date, memo.slice(0, 1000)]),
          )
        : {};
  } catch {
    storage.removeItem(DAILY_MEMOS_KEY);
    historySession.dailyMemos = {};
  }
}

export function saveDailyMemos() {
  storage.setItem(DAILY_MEMOS_KEY, JSON.stringify(historySession.dailyMemos));
  loadDailyMemos();
}

export function loadWorkdayTimes() {
  try {
    const saved = JSON.parse(storage.getItem(WORKDAY_TIMES_KEY) || "{}");
    historySession.workdayTimes =
      saved && typeof saved === "object" && !Array.isArray(saved)
        ? Object.fromEntries(
            Object.entries(saved)
              .filter(
                ([date, value]) =>
                  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
                  value &&
                  typeof value.clockIn === "string" &&
                  typeof value.clockOut === "string",
              )
              .map(([date, value]) => [
                date,
                {
                  clockIn: value.clockIn,
                  clockOut: value.clockOut,
                  breakDurationMs:
                    Number.isFinite(value.breakDurationMs) &&
                    value.breakDurationMs >= 0
                      ? value.breakDurationMs
                      : 0,
                  breakDurationSet: value.breakDurationSet === true,
                },
              ]),
          )
        : {};
  } catch {
    storage.removeItem(WORKDAY_TIMES_KEY);
    historySession.workdayTimes = {};
  }
}

export function saveWorkdayTimes() {
  storage.setItem(
    WORKDAY_TIMES_KEY,
    JSON.stringify(historySession.workdayTimes),
  );
  loadWorkdayTimes();
}

export function loadRecords() {
  try {
    const records = JSON.parse(storage.getItem(RECORDS_KEY) || "[]");
    if (!Array.isArray(records)) return;
    state.records = records
      .filter(
        (record) =>
          record &&
          typeof record.taskName === "string" &&
          typeof record.date === "string" &&
          Number.isFinite(record.durationMs) &&
          record.durationMs > 0,
      )
      .map((record) => ({
        ...record,
        taskName: normalizeTaskName(record.taskName),
        memo: typeof record.memo === "string" ? record.memo.slice(0, 300) : "",
      }));
  } catch {
    storage.removeItem(RECORDS_KEY);
    state.records = [];
  }
}
