(function () {
  const STORAGE_KEY = "simple-timer-state";
  const RECORDS_KEY = "simple-timer-records";
  const POPUP_SIZE_KEY = "simple-timer-popup-size";
  const MINIMIZED_POPUP_SIZE_KEY = "simple-timer-minimized-popup-size";
  const DEFAULT_MODE_KEY = "simple-timer-default-mode";
  const AGGREGATION_ENABLED_KEY = "simple-timer-aggregation-enabled";
  const DAILY_MEMOS_KEY = "simple-timer-daily-memos";
  const THEME_KEY = "simple-timer-theme";
  const PRIMARY_TIME_DISPLAY_KEY = "simple-timer-primary-time-display";
  const BACKUP_FORMAT = "simple-timer-backup";
  const BACKUP_VERSION = 1;
  const BACKUP_STORAGE_KEYS = [
    STORAGE_KEY,
    RECORDS_KEY,
    POPUP_SIZE_KEY,
    MINIMIZED_POPUP_SIZE_KEY,
    DEFAULT_MODE_KEY,
    AGGREGATION_ENABLED_KEY,
    DAILY_MEMOS_KEY,
    THEME_KEY,
    PRIMARY_TIME_DISPLAY_KEY,
  ];
  const MODES = { COUNTDOWN: "countdown", STOPWATCH: "stopwatch" };
  const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;
  const DEFAULT_POMODORO_BREAK_MS = 5 * 60 * 1000;
  const TICK_INTERVAL_MS = 250;
  const POPUP_SIZE_LIMITS = { minWidth: 320, maxWidth: 720, minHeight: 120, maxHeight: 900 };
  const MINIMIZED_POPUP_SIZE_LIMITS = { minWidth: 160, maxWidth: 720, minHeight: 72, maxHeight: 900 };
  const OPTIMAL_POPUP_MIN_HEIGHT = 360;

  const elements = {
    body: document.body,
    app: document.querySelector(".app"),
    appTitle: document.querySelector("#app-title"),
    panel: document.querySelector(".timer-panel"),
    statusText: document.querySelector("#status-text"),
    recordDate: document.querySelector("#record-date"),
    timeDisplayArea: document.querySelector("#time-display-area"),
    secondaryTimeDisplay: document.querySelector("#secondary-time-display"),
    toast: document.querySelector("#toast"),
    toastMessage: document.querySelector("#toast-message"),
    toastUndoButton: document.querySelector("#toast-undo-button"),
    previousDayConfirmOverlay: document.querySelector("#previous-day-confirm-overlay"),
    previousDayConfirmMessage: document.querySelector("#previous-day-confirm-message"),
    resetPreviousDayButton: document.querySelector("#reset-previous-day-button"),
    recordPreviousDayButton: document.querySelector("#record-previous-day-button"),
    timeDisplay: document.querySelector("#time-display"),
    cumulativeTimeDisplay: document.querySelector("#cumulative-time-display"),
    timeMetaRow: document.querySelector("#time-meta-row"),
    popupButton: document.querySelector("#popup-button"),
    minimizeButton: document.querySelector("#minimize-button"),
    historyButton: document.querySelector("#history-button"),
    settingsButton: document.querySelector("#settings-button"),
    settingsDialog: document.querySelector("#settings-dialog"),
    popupSizeStatus: document.querySelector("#popup-size-status"),
    resetPopupSizeButton: document.querySelector("#reset-popup-size-button"),
    minimizedPopupSizeStatus: document.querySelector("#minimized-popup-size-status"),
    resetMinimizedPopupSizeButton: document.querySelector("#reset-minimized-popup-size-button"),
    defaultModeSelect: document.querySelector("#default-mode-select"),
    aggregationEnabledInput: document.querySelector("#aggregation-enabled-input"),
    themeSelect: document.querySelector("#theme-select"),
    primaryTimeDisplaySelect: document.querySelector("#primary-time-display-select"),
    backupExportButton: document.querySelector("#backup-export-button"),
    backupImportButton: document.querySelector("#backup-import-button"),
    backupFileInput: document.querySelector("#backup-file-input"),
    backupStatus: document.querySelector("#backup-status"),
    timerTabList: document.querySelector("#timer-tab-list"),
    addTimerTabButton: document.querySelector("#add-timer-tab-button"),
    timerTabConfirmOverlay: document.querySelector("#timer-tab-confirm-overlay"),
    timerTabConfirmMessage: document.querySelector("#timer-tab-confirm-message"),
    cancelTimerTabDeleteButton: document.querySelector("#cancel-timer-tab-delete-button"),
    confirmTimerTabDeleteButton: document.querySelector("#confirm-timer-tab-delete-button"),
    modeSwitchConfirmOverlay: document.querySelector("#mode-switch-confirm-overlay"),
    modeSwitchConfirmMessage: document.querySelector("#mode-switch-confirm-message"),
    cancelModeSwitchButton: document.querySelector("#cancel-mode-switch-button"),
    confirmModeSwitchButton: document.querySelector("#confirm-mode-switch-button"),
    timerNavigationConfirmOverlay: document.querySelector("#timer-navigation-confirm-overlay"),
    timerNavigationConfirmMessage: document.querySelector("#timer-navigation-confirm-message"),
    cancelTimerNavigationButton: document.querySelector("#cancel-timer-navigation-button"),
    confirmTimerNavigationButton: document.querySelector("#confirm-timer-navigation-button"),
    modeTabs: Array.from(document.querySelectorAll(".mode-tab")),
    countdownSettings: document.querySelector("#countdown-settings"),
    pomodoroEnabledInput: document.querySelector("#pomodoro-enabled-input"),
    pomodoroBreakSettings: document.querySelector("#pomodoro-break-settings"),
    pomodoroBreakInput: document.querySelector("#pomodoro-break-input"),
    pomodoroPhaseDisplay: document.querySelector("#pomodoro-phase-display"),
    countdownDurationButton: document.querySelector("#countdown-duration-button"),
    countdownDurationDisplay: document.querySelector("#countdown-duration-display"),
    countdownDurationDialog: document.querySelector("#countdown-duration-dialog"),
    countdownDurationForm: document.querySelector("#countdown-duration-form"),
    untilTimeInput: document.querySelector("#until-time-input"),
    applyUntilTimeButton: document.querySelector("#apply-until-time-button"),
    untilTimeStatus: document.querySelector("#until-time-status"),
    hoursInput: document.querySelector("#hours-input"),
    minutesInput: document.querySelector("#minutes-input"),
    secondsInput: document.querySelector("#seconds-input"),
    presetButtons: Array.from(document.querySelectorAll(".preset-button")),
    taskButton: document.querySelector("#task-button"),
    taskNameDisplay: document.querySelector("#task-name-display"),
    taskInput: document.querySelector("#task-input"),
    taskMemoInput: document.querySelector("#task-memo-input"),
    taskDialog: document.querySelector("#task-dialog"),
    taskDialogForm: document.querySelector("#task-dialog-form"),
    recentTaskList: document.querySelector("#recent-task-list"),
    manualRecentTaskList: document.querySelector("#manual-recent-task-list"),
    historyDialog: document.querySelector("#history-dialog"),
    historyDate: document.querySelector("#history-date"),
    historyDateContext: document.querySelector("#history-date-context"),
    historyList: document.querySelector("#history-list"),
    historySummary: document.querySelector("#history-summary"),
    dailyMemoInput: document.querySelector("#daily-memo-input"),
    dailyMemoStatus: document.querySelector("#daily-memo-status"),
    addHistoryButton: document.querySelector("#add-history-button"),
    exportHistoryButton: document.querySelector("#export-history-button"),
    exportHistoryDialog: document.querySelector("#export-history-dialog"),
    exportHistoryForm: document.querySelector("#export-history-form"),
    exportDurationFormatGroup: document.querySelector("#export-duration-format-group"),
    exportTimeRangeInput: document.querySelector("#export-time-range-input"),
    exportDurationInput: document.querySelector("#export-duration-input"),
    exportMemoInput: document.querySelector("#export-memo-input"),
    exportHistoryError: document.querySelector("#export-history-error"),
    addHistoryDialog: document.querySelector("#add-history-dialog"),
    addHistoryForm: document.querySelector("#add-history-form"),
    manualDate: document.querySelector("#manual-date"),
    manualStartTimeInput: document.querySelector("#manual-start-time-input"),
    manualEndTimeInput: document.querySelector("#manual-end-time-input"),
    manualHoursInput: document.querySelector("#manual-hours-input"),
    manualMinutesInput: document.querySelector("#manual-minutes-input"),
    manualSecondsInput: document.querySelector("#manual-seconds-input"),
    manualTaskInput: document.querySelector("#manual-task-input"),
    manualMemoInput: document.querySelector("#manual-memo-input"),
    manualHistoryError: document.querySelector("#manual-history-error"),
    editHistoryDialog: document.querySelector("#edit-history-dialog"),
    editHistoryForm: document.querySelector("#edit-history-form"),
    editTaskInput: document.querySelector("#edit-task-input"),
    editMemoInput: document.querySelector("#edit-memo-input"),
    editHoursInput: document.querySelector("#edit-hours-input"),
    editMinutesInput: document.querySelector("#edit-minutes-input"),
    editSecondsInput: document.querySelector("#edit-seconds-input"),
    editHistoryError: document.querySelector("#edit-history-error"),
    editDeleteButton: document.querySelector("#edit-delete-button"),
    confirmOverlay: document.querySelector("#confirm-overlay"),
    confirmMessage: document.querySelector("#confirm-message"),
    cancelDeleteButton: document.querySelector("#cancel-delete-button"),
    confirmDeleteButton: document.querySelector("#confirm-delete-button"),
    unitButtons: Array.from(document.querySelectorAll(".unit-button")),
    closeDialogButtons: Array.from(document.querySelectorAll(".close-dialog")),
    startPauseButton: document.querySelector("#start-pause-button"),
    compactStartPauseButton: document.querySelector("#compact-start-pause-button"),
    resetButton: document.querySelector("#reset-button"),
    resetConfirmOverlay: document.querySelector("#reset-confirm-overlay"),
    resetConfirmMessage: document.querySelector("#reset-confirm-message"),
    cancelResetButton: document.querySelector("#cancel-reset-button"),
    confirmResetButton: document.querySelector("#confirm-reset-button"),
    nextTaskButton: document.querySelector("#next-task-button"),
    resumeHistoryButton: document.querySelector("#resume-history-button"),
    resumeHistoryConfirmDialog: document.querySelector("#resume-history-confirm-dialog"),
    resumeHistoryConfirmMessage: document.querySelector("#resume-history-confirm-message"),
    cancelResumeHistoryButton: document.querySelector("#cancel-resume-history-button"),
    confirmResumeHistoryButton: document.querySelector("#confirm-resume-history-button"),
  };

  const state = {
    mode: MODES.COUNTDOWN,
    isRunning: false,
    startedAt: 0,
    elapsedBeforeStartMs: 0,
    countdownSessionStartElapsedMs: 0,
    countdownDurationMs: DEFAULT_COUNTDOWN_SECONDS * 1000,
    pomodoroEnabled: false,
    pomodoroPhase: "work",
    pomodoroPhaseElapsedBeforeStartMs: 0,
    pomodoroBreakDurationMs: DEFAULT_POMODORO_BREAK_MS,
    taskName: "",
    taskMemo: "",
    firstStartedAt: 0,
    finishedAt: 0,
    hasStarted: false,
    isMinimized: false,
    records: [],
    historyUnit: "minutes",
    timerTabs: [],
    activeTimerId: "",
    nextTimerNumber: 1,
  };

  let tickId = 0;
  let toastId = 0;
  let toastUndoAction = null;
  let timerPointerHandledAt = 0;
  let audioContext = null;
  let finishSoundIntervalId = 0;
  let pendingRecordAfterTaskInput = false;
  let fitButtonsFrame = 0;
  let pendingDeleteRecordId = "";
  let pendingDeleteRecord = null;
  let editingRecord = null;
  let confirmPreviousFocus = null;
  let timerTabsSignature = "";
  let pendingCloseTimerId = "";
  let timerTabConfirmPreviousFocus = null;
  let pendingMode = "";
  let modeSwitchConfirmPreviousFocus = null;
  let pendingTimerNavigation = null;
  let timerNavigationConfirmPreviousFocus = null;
  let displayedClockSecond = -1;
  let popupResizeSaveId = 0;
  let suppressPopupSizeSaveUntil = 0;
  let preMinimizePopupSize = null;
  let activeStateDate = localDateKey();
  let pendingNewDateKey = "";
  let dateTimeIntervalId = 0;
  let popupFitFrame = 0;
  let popupFitSignature = "";
  let dailyMemos = {};
  let dailyMemoSaveId = 0;
  let dailyMemoDirty = false;
  let dailyMemoEditingDate = "";
  let currentClockText = "00:00:00";

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function updateDateTime(date = new Date()) {
    const dateKey = localDateKey(date);
    if (dateKey !== activeStateDate && state.timerTabs.length && !pendingNewDateKey) {
      const hasPreviousDayWork = state.timerTabs.some((tab) => {
        const elapsedMs = tab.id === state.activeTimerId ? getElapsedMs() : tab.elapsedBeforeStartMs;
        return elapsedMs > 0;
      });
      if (hasPreviousDayWork) openPreviousDayConfirm(dateKey);
      else resetTimersForNewDay(dateKey, false);
    }
    const currentSecond = Math.floor(date.getTime() / 1000);
    if (currentSecond === displayedClockSecond) return;
    displayedClockSecond = currentSecond;
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const dateText = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    elements.recordDate.textContent = `${dateText}(${weekdays[date.getDay()]})`;
    currentClockText = `${hours}:${minutes}:${seconds}`;
    if (state.timerTabs.length) render();
  }

  function resetTimersForNewDay(dateKey = localDateKey(), notify = true) {
    stopTicking();
    const firstTab = createTimerTab(1);
    state.timerTabs = [firstTab];
    state.nextTimerNumber = 2;
    applyTimerTab(firstTab);
    activeStateDate = dateKey;
    timerTabsSignature = "";
    syncInputsFromDuration();
    saveState();
    render();
    if (notify) showToast("前日分の計測途中データをリセットしました");
  }

  function startDateTimeUpdates() {
    if (dateTimeIntervalId || pendingNewDateKey) return;
    const scheduleNextUpdate = () => {
      if (pendingNewDateKey) {
        dateTimeIntervalId = 0;
        return;
      }
      updateDateTime();
      if (pendingNewDateKey) {
        dateTimeIntervalId = 0;
        return;
      }
      // 毎回現在時刻から次の秒境界を求め、タイマーの遅延を累積させない。
      const delay = Math.max(20, 1000 - (Date.now() % 1000) + 10);
      dateTimeIntervalId = window.setTimeout(scheduleNextUpdate, delay);
    };
    scheduleNextUpdate();
  }

  function stopDateTimeUpdates() {
    if (!dateTimeIntervalId) return;
    window.clearTimeout(dateTimeIntervalId);
    dateTimeIntervalId = 0;
  }

  function openPreviousDayConfirm(newDateKey) {
    freezeRunningTimer();
    snapshotActiveTimer();
    saveState();
    pendingNewDateKey = newDateKey;
    stopDateTimeUpdates();
    const totalMs = state.timerTabs.reduce((total, tab) => total + Math.max(0, tab.elapsedBeforeStartMs), 0);
    elements.previousDayConfirmMessage.textContent =
      `${formatHistoryDateLabel(activeStateDate)}の作業時間 ${formatTime(totalMs)} が残っています。`;
    elements.previousDayConfirmOverlay.hidden = false;
    elements.recordPreviousDayButton.focus();
  }

  function finishPreviousDayResolution(message) {
    const newDateKey = pendingNewDateKey || localDateKey();
    pendingNewDateKey = "";
    elements.previousDayConfirmOverlay.hidden = true;
    resetTimersForNewDay(newDateKey, false);
    updateDateTime();
    startDateTimeUpdates();
    showToast(message);
  }

  function resetPreviousDayWork() {
    finishPreviousDayResolution("前日分の作業時間をリセットしました");
  }

  function recordPreviousDayWork() {
    const [year, month, day] = activeStateDate.split("-").map(Number);
    const endOfSavedDate = new Date(year, month - 1, day + 1).getTime() - 1;
    const addedAt = Number.isFinite(endOfSavedDate) ? endOfSavedDate : now();
    state.timerTabs.forEach((tab) => {
      if (tab.elapsedBeforeStartMs <= 0) return;
      state.records.push({
        id: `${now()}-${Math.random().toString(16).slice(2)}`,
        date: activeStateDate,
        taskName: normalizeTaskName(tab.taskName) || `タイマー ${tab.number}`,
        memo: typeof tab.taskMemo === "string" ? tab.taskMemo : "",
        durationMs: Math.round(tab.elapsedBeforeStartMs),
        mode: tab.mode,
        firstStartedAt: Number.isFinite(tab.firstStartedAt) && tab.firstStartedAt > 0
          ? new Date(tab.firstStartedAt).toISOString()
          : undefined,
        createdAt: new Date(addedAt).toISOString(),
      });
    });
    saveRecords();
    finishPreviousDayResolution("前日分を作業履歴に追加しました");
  }

  function formatHistoryDateLabel(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const label = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric", month: "long", day: "numeric", weekday: "short",
    }).format(date);
    return dateKey === localDateKey() ? `${label}（本日）` : label;
  }

  function createTimerTab(number = state.nextTimerNumber) {
    return {
      id: `${now()}-${Math.random().toString(16).slice(2)}`,
      number,
      mode: getDefaultMode(),
      isRunning: false,
      startedAt: 0,
      elapsedBeforeStartMs: 0,
      countdownSessionStartElapsedMs: 0,
      countdownDurationMs: DEFAULT_COUNTDOWN_SECONDS * 1000,
      pomodoroEnabled: false,
      pomodoroPhase: "work",
      pomodoroPhaseElapsedBeforeStartMs: 0,
      pomodoroBreakDurationMs: DEFAULT_POMODORO_BREAK_MS,
      taskName: "",
      taskMemo: "",
      firstStartedAt: 0,
      finishedAt: 0,
      hasStarted: false,
    };
  }

  function getDefaultMode() {
    const savedMode = localStorage.getItem(DEFAULT_MODE_KEY);
    if (savedMode === "pomodoro") return MODES.COUNTDOWN;
    return Object.values(MODES).includes(savedMode) ? savedMode : MODES.COUNTDOWN;
  }

  function isValidTimerTab(tab) {
    return tab && typeof tab.id === "string" && Number.isFinite(tab.number) &&
      (Object.values(MODES).includes(tab.mode) || tab.mode === "pomodoro") &&
      Number.isFinite(tab.elapsedBeforeStartMs) && tab.elapsedBeforeStartMs >= 0 &&
      Number.isFinite(tab.countdownDurationMs) && tab.countdownDurationMs > 0 &&
      typeof tab.taskName === "string";
  }

  function snapshotActiveTimer() {
    const tab = state.timerTabs.find((item) => item.id === state.activeTimerId);
    if (!tab) return;
    tab.mode = state.mode;
    tab.isRunning = state.isRunning;
    tab.startedAt = state.startedAt;
    tab.elapsedBeforeStartMs = getElapsedMs();
    tab.countdownSessionStartElapsedMs = state.countdownSessionStartElapsedMs;
    tab.countdownDurationMs = state.countdownDurationMs;
    tab.pomodoroEnabled = state.pomodoroEnabled;
    tab.pomodoroPhase = state.pomodoroPhase;
    tab.pomodoroPhaseElapsedBeforeStartMs = getPomodoroPhaseElapsedMs();
    tab.pomodoroBreakDurationMs = state.pomodoroBreakDurationMs;
    tab.taskName = state.taskName;
    tab.taskMemo = state.taskMemo;
    tab.firstStartedAt = state.firstStartedAt;
    tab.finishedAt = state.finishedAt;
    tab.hasStarted = state.hasStarted;
  }

  function applyTimerTab(tab) {
    stopCountdownAlert();
    state.activeTimerId = tab.id;
    state.mode = tab.mode === "pomodoro" ? MODES.COUNTDOWN : tab.mode;
    state.isRunning = false;
    state.startedAt = 0;
    state.elapsedBeforeStartMs = tab.elapsedBeforeStartMs;
    state.countdownSessionStartElapsedMs = Number.isFinite(tab.countdownSessionStartElapsedMs)
      ? Math.min(tab.countdownSessionStartElapsedMs, tab.elapsedBeforeStartMs)
      : 0;
    state.countdownDurationMs = tab.countdownDurationMs;
    state.pomodoroEnabled = tab.pomodoroEnabled === true || tab.mode === "pomodoro";
    state.pomodoroPhase = ["work", "break"].includes(tab.pomodoroPhase) ? tab.pomodoroPhase : "work";
    state.pomodoroPhaseElapsedBeforeStartMs = Number.isFinite(tab.pomodoroPhaseElapsedBeforeStartMs)
      ? Math.max(0, tab.pomodoroPhaseElapsedBeforeStartMs)
      : 0;
    if (tab.mode === "pomodoro" && Number.isFinite(tab.pomodoroWorkDurationMs) && tab.pomodoroWorkDurationMs > 0) {
      state.countdownDurationMs = tab.pomodoroWorkDurationMs;
    }
    state.pomodoroBreakDurationMs = Number.isFinite(tab.pomodoroBreakDurationMs) && tab.pomodoroBreakDurationMs > 0
      ? tab.pomodoroBreakDurationMs
      : DEFAULT_POMODORO_BREAK_MS;
    state.taskName = tab.taskName;
    state.taskMemo = typeof tab.taskMemo === "string" ? tab.taskMemo : "";
    state.firstStartedAt = Number.isFinite(tab.firstStartedAt) ? tab.firstStartedAt : 0;
    state.finishedAt = tab.finishedAt || 0;
    state.hasStarted = tab.hasStarted === true;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const isFromToday = typeof saved.savedDate !== "string" || saved.savedDate === localDateKey();
      if (typeof saved.savedDate === "string") activeStateDate = saved.savedDate;
      const savedTabs = Array.isArray(saved.timerTabs) ? saved.timerTabs.filter(isValidTimerTab) : [];
      if (savedTabs.length) {
        state.timerTabs = savedTabs.map((tab) => ({
          ...tab,
          mode: tab.mode === "pomodoro" ? MODES.COUNTDOWN : tab.mode,
          pomodoroEnabled: tab.pomodoroEnabled === true || tab.mode === "pomodoro",
          countdownDurationMs: tab.mode === "pomodoro" && Number.isFinite(tab.pomodoroWorkDurationMs)
            ? tab.pomodoroWorkDurationMs
            : tab.countdownDurationMs,
          taskName: tab.taskName.slice(0, 80),
          isRunning: false,
          startedAt: 0,
          countdownSessionStartElapsedMs: Number.isFinite(tab.countdownSessionStartElapsedMs)
            ? Math.min(tab.countdownSessionStartElapsedMs, tab.elapsedBeforeStartMs)
            : 0,
          hasStarted: tab.hasStarted === true || tab.elapsedBeforeStartMs > 0 || tab.finishedAt > 0,
        }));
        state.nextTimerNumber = Math.max(...state.timerTabs.map((tab) => tab.number)) + 1;
        const activeTab = state.timerTabs.find((tab) => tab.id === saved.activeTimerId) || state.timerTabs[0];
        applyTimerTab(activeTab);
      } else {
        const firstTab = createTimerTab(1);
        if (isFromToday) {
          if (Object.values(MODES).includes(saved.mode)) firstTab.mode = saved.mode;
          if (Number.isFinite(saved.countdownDurationMs) && saved.countdownDurationMs > 0) {
            firstTab.countdownDurationMs = saved.countdownDurationMs;
          }
          if (typeof saved.taskName === "string") firstTab.taskName = saved.taskName.slice(0, 80);
        }
        state.timerTabs = [firstTab];
        state.nextTimerNumber = 2;
        applyTimerTab(firstTab);
        if (!isFromToday) activeStateDate = localDateKey();
      }
      loadRecords();
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(RECORDS_KEY);
      const firstTab = createTimerTab(1);
      state.timerTabs = [firstTab];
      state.nextTimerNumber = 2;
      applyTimerTab(firstTab);
    }
  }

  function saveState() {
    snapshotActiveTimer();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      savedDate: activeStateDate,
      activeTimerId: state.activeTimerId,
      nextTimerNumber: state.nextTimerNumber,
      timerTabs: state.timerTabs,
    }));
  }

  function saveRecords() {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records));
  }

  function loadDailyMemos() {
    try {
      const savedMemos = JSON.parse(localStorage.getItem(DAILY_MEMOS_KEY) || "{}");
      dailyMemos = savedMemos && typeof savedMemos === "object" && !Array.isArray(savedMemos)
        ? Object.fromEntries(Object.entries(savedMemos)
          .filter(([date, memo]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof memo === "string")
          .map(([date, memo]) => [date, memo.slice(0, 1000)]))
        : {};
    } catch {
      localStorage.removeItem(DAILY_MEMOS_KEY);
      dailyMemos = {};
    }
  }

  function saveDailyMemos() {
    localStorage.setItem(DAILY_MEMOS_KEY, JSON.stringify(dailyMemos));
  }

  function loadRecords() {
    try {
      const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
      if (!Array.isArray(records)) return;
      state.records = records.filter((record) =>
        record && typeof record.taskName === "string" && typeof record.date === "string" &&
        Number.isFinite(record.durationMs) && record.durationMs > 0,
      ).map((record) => ({
        ...record,
        taskName: normalizeTaskName(record.taskName),
        memo: typeof record.memo === "string" ? record.memo.slice(0, 300) : "",
      }));
    } catch {
      localStorage.removeItem(RECORDS_KEY);
      state.records = [];
    }
  }

  function now() { return Date.now(); }

  function getRunningDeltaMs() {
    return state.isRunning ? Math.max(0, now() - state.startedAt) : 0;
  }

  function isPomodoroActive() {
    return state.mode === MODES.COUNTDOWN && state.pomodoroEnabled;
  }

  function getElapsedMs() {
    if (isPomodoroActive() && state.pomodoroPhase === "break") {
      return state.elapsedBeforeStartMs;
    }
    return state.isRunning
      ? state.elapsedBeforeStartMs + getRunningDeltaMs()
      : state.elapsedBeforeStartMs;
  }

  function getRecordedElapsedMs() {
    return getElapsedMs();
  }

  function getCountdownSessionElapsedMs() {
    return Math.max(0, getElapsedMs() - state.countdownSessionStartElapsedMs);
  }

  function getPomodoroPhaseElapsedMs() {
    return state.pomodoroPhaseElapsedBeforeStartMs +
      (isPomodoroActive() ? getRunningDeltaMs() : 0);
  }

  function getPomodoroPhaseDurationMs() {
    return state.pomodoroPhase === "break" ? state.pomodoroBreakDurationMs : state.countdownDurationMs;
  }

  function getDisplayMs() {
    if (state.mode === MODES.STOPWATCH) return getElapsedMs();
    if (isPomodoroActive()) {
      return Math.max(0, getPomodoroPhaseDurationMs() - getPomodoroPhaseElapsedMs());
    }
    return Math.max(0, state.countdownDurationMs - getCountdownSessionElapsedMs());
  }

  function normalizeSeconds(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function getDurationFromInputs() {
    const hours = Math.min(99, normalizeSeconds(elements.hoursInput.value, 0));
    const minutes = Math.min(59, normalizeSeconds(elements.minutesInput.value, 0));
    const seconds = Math.min(59, normalizeSeconds(elements.secondsInput.value, 0));
    return Math.max(1, hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  function setCountdownDurationInputs(totalSeconds) {
    const normalizedSeconds = Math.max(1, Math.round(totalSeconds));
    elements.hoursInput.value = String(Math.floor(normalizedSeconds / 3600));
    elements.minutesInput.value = String(Math.floor((normalizedSeconds % 3600) / 60));
    elements.secondsInput.value = String(normalizedSeconds % 60);
  }

  function applyUntilTimeToInputs() {
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
    const durationSeconds = Math.max(1, Math.ceil((target.getTime() - current.getTime()) / 1000));
    setCountdownDurationInputs(durationSeconds);
    elements.untilTimeStatus.textContent =
      `${dayLabel} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}まで（残り ${formatTime(durationSeconds * 1000)}）`;
  }

  function syncInputsFromDuration() {
    const totalSeconds = Math.round(state.countdownDurationMs / 1000);
    setCountdownDurationInputs(totalSeconds);
    elements.countdownDurationDisplay.textContent = formatTime(state.countdownDurationMs);
    elements.pomodoroEnabledInput.checked = state.pomodoroEnabled;
    elements.pomodoroBreakInput.value = String(Math.round(state.pomodoroBreakDurationMs / 60000));
  }

  function formatTime(milliseconds, rounding = "floor") {
    const totalSeconds = Math.max(0, (rounding === "ceil" ? Math.ceil : Math.floor)(milliseconds / 1000));
    const parts = [
      Math.floor(totalSeconds / 3600),
      Math.floor((totalSeconds % 3600) / 60),
      totalSeconds % 60,
    ];
    return parts.map((part) => String(part).padStart(2, "0")).join(":");
  }

  function formatRecordDuration(milliseconds) {
    if (state.historyUnit === "minutes") return `${Math.round(milliseconds / 60000)}分`;
    return formatTime(milliseconds);
  }

  function normalizeTaskName(value) {
    return value.trim().replace(/\s+/g, " ").slice(0, 80);
  }

  function taskNameDistance(left, right) {
    const a = Array.from(left.toLocaleLowerCase("ja"));
    const b = Array.from(right.toLocaleLowerCase("ja"));
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 0; row < a.length; row += 1) {
      const current = [row + 1];
      for (let column = 0; column < b.length; column += 1) {
        current.push(Math.min(
          current[column] + 1,
          previous[column + 1] + 1,
          previous[column] + (a[row] === b[column] ? 0 : 1),
        ));
      }
      previous.splice(0, previous.length, ...current);
    }
    return previous[b.length];
  }

  function existingTaskNames() {
    const names = [];
    [...state.records.map((record) => record.taskName), ...state.timerTabs.map((tab) => tab.taskName)]
      .map(normalizeTaskName)
      .filter(Boolean)
      .forEach((name) => {
        if (!names.some((existing) => existing.toLocaleLowerCase("ja") === name.toLocaleLowerCase("ja"))) names.push(name);
      });
    return names;
  }

  function resolveTaskName(name) {
    const normalizedName = normalizeTaskName(name);
    if (!normalizedName || !isAggregationEnabled()) return normalizedName;
    const comparableName = normalizedName.toLocaleLowerCase("ja");
    const names = existingTaskNames();
    const exactMatch = names.find((existing) => existing.toLocaleLowerCase("ja") === comparableName);
    if (exactMatch) return exactMatch;
    const similarName = names
      .map((existing) => {
        const comparableExisting = existing.toLocaleLowerCase("ja");
        const maximumLength = Math.max(Array.from(comparableName).length, Array.from(comparableExisting).length);
        const distance = taskNameDistance(comparableName, comparableExisting);
        const contains = Math.min(Array.from(comparableName).length, Array.from(comparableExisting).length) >= 3 &&
          (comparableName.includes(comparableExisting) || comparableExisting.includes(comparableName));
        return { existing, distance, maximumLength, contains };
      })
      .filter((candidate) => candidate.contains || candidate.distance <= Math.max(1, Math.floor(candidate.maximumLength * 0.25)))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!similarName) return normalizedName;
    const shouldUnify = elements.app.ownerDocument.defaultView.confirm(
      `入力した「${normalizedName}」は、既存の「${similarName.existing}」と似ています。\n\n` +
      "同じタスクとして既存名に統一しますか？\nOK：既存名に統一 ／ キャンセル：別タスクとして使用",
    );
    return shouldUnify ? similarName.existing : normalizedName;
  }

  function isAggregationEnabled() {
    return localStorage.getItem(AGGREGATION_ENABLED_KEY) === "true";
  }

  function formatHistoryClock(date) {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "numeric", minute: "2-digit", hour12: false,
    }).format(date);
  }

  function formatHistoryTimeRange(record) {
    const addedAt = new Date(record.createdAt);
    if (Number.isNaN(addedAt.getTime())) return "";
    const storedStartedAt = new Date(record.firstStartedAt);
    return Number.isNaN(storedStartedAt.getTime())
      ? `～${formatHistoryClock(addedAt)}`
      : `${formatHistoryClock(storedStartedAt)}～${formatHistoryClock(addedAt)}`;
  }

  function displayWidth(value) {
    return Array.from(value).reduce((width, character) => {
      return width + (/^[\x20-\x7E]$/.test(character) ? 1 : 2);
    }, 0);
  }

  function padDisplayEnd(value, targetWidth) {
    return value + " ".repeat(Math.max(0, targetWidth - displayWidth(value)));
  }

  function getCurrentBody() { return elements.app.ownerDocument.body; }
  function isPopupContext() { return getCurrentBody().classList.contains("is-popup"); }

  function fitPopupContentToWindow() {
    if (!isPopupContext()) {
      elements.app.style.zoom = "";
      elements.app.style.width = "";
      elements.app.style.maxWidth = "";
      popupFitSignature = "";
      return;
    }
    const view = elements.app.ownerDocument.defaultView;
    const signature = JSON.stringify([
      view.innerWidth,
      state.isMinimized,
      state.mode,
      state.finishedAt > 0,
      state.timerTabs.length,
      elements.app.ownerDocument.querySelectorAll("dialog[open]").length,
    ]);
    if (signature === popupFitSignature) return;
    popupFitSignature = signature;
    elements.app.style.zoom = "1";
    elements.app.style.width = "100%";
    elements.app.style.maxWidth = "none";
    const baseWidth = state.isMinimized ? 320 : 430;
    const widthScale = (view.innerWidth - 2) / baseWidth;
    const scale = clamp(Math.min(1, widthScale), 0.25, 1);
    // 縮小時は基準幅のレイアウト全体を一度だけ拡縮する。
    // 描画後の幅は baseWidth * scale となり、PiPの横幅に収まる。
    elements.app.style.width = scale < 0.995 ? `${baseWidth}px` : "100%";
    elements.app.style.zoom = scale < 0.995 ? scale.toFixed(3) : "1";
    getCurrentBody().classList.toggle("is-content-scaled", scale < 0.995);
  }

  function scheduleFitPopupContent() {
    if (!isPopupContext()) return;
    const view = elements.app.ownerDocument.defaultView;
    view.cancelAnimationFrame(popupFitFrame);
    popupFitFrame = view.requestAnimationFrame(fitPopupContentToWindow);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalizePopupSize(size, limits = POPUP_SIZE_LIMITS) {
    if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) return null;
    return {
      width: Math.round(clamp(size.width, limits.minWidth, limits.maxWidth)),
      height: Math.round(clamp(size.height, limits.minHeight, limits.maxHeight)),
    };
  }

  function loadStoredPopupSize(key) {
    try {
      const limits = key === MINIMIZED_POPUP_SIZE_KEY ? MINIMIZED_POPUP_SIZE_LIMITS : POPUP_SIZE_LIMITS;
      return normalizePopupSize(JSON.parse(localStorage.getItem(key) || "null"), limits);
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  function loadSavedPopupSize() {
    return loadStoredPopupSize(POPUP_SIZE_KEY);
  }

  function loadSavedMinimizedPopupSize() {
    return loadStoredPopupSize(MINIMIZED_POPUP_SIZE_KEY);
  }

  function calculateOptimalPopupSize(view = window) {
    const screen = view.screen || window.screen;
    const availableWidth = Number.isFinite(screen.availWidth) ? screen.availWidth - 32 : POPUP_SIZE_LIMITS.maxWidth;
    const availableHeight = Number.isFinite(screen.availHeight) ? screen.availHeight - 48 : POPUP_SIZE_LIMITS.maxHeight;
    const configuredMaxWidth = Number.parseFloat(view.getComputedStyle(elements.app).maxWidth);
    const contentWidth = Math.ceil(Math.max(
      elements.app.scrollWidth,
      elements.app.getBoundingClientRect().width,
      Number.isFinite(configuredMaxWidth) ? configuredMaxWidth : 0,
    ));
    const contentHeight = Math.ceil(Math.max(elements.app.scrollHeight, elements.app.getBoundingClientRect().height));
    return {
      width: Math.round(clamp(contentWidth, POPUP_SIZE_LIMITS.minWidth, Math.min(POPUP_SIZE_LIMITS.maxWidth, availableWidth))),
      height: Math.round(clamp(contentHeight + 8, OPTIMAL_POPUP_MIN_HEIGHT, Math.min(POPUP_SIZE_LIMITS.maxHeight, availableHeight))),
    };
  }

  function calculateOptimalMinimizedPopupSize(view = window) {
    const previousZoom = elements.app.style.zoom;
    elements.app.style.zoom = "1";
    const screen = view.screen || window.screen;
    const availableWidth = Number.isFinite(screen.availWidth) ? screen.availWidth - 32 : MINIMIZED_POPUP_SIZE_LIMITS.maxWidth;
    const availableHeight = Number.isFinite(screen.availHeight) ? screen.availHeight - 48 : MINIMIZED_POPUP_SIZE_LIMITS.maxHeight;
    const appStyle = view.getComputedStyle(elements.app);
    const header = elements.app.querySelector(".app-header");
    const headerHeight = Math.ceil(header.getBoundingClientRect().height);
    const verticalPadding = (Number.parseFloat(appStyle.paddingTop) || 0) + (Number.parseFloat(appStyle.paddingBottom) || 0);
    const horizontalPadding = (Number.parseFloat(appStyle.paddingLeft) || 0) + (Number.parseFloat(appStyle.paddingRight) || 0);
    const isCurrentlyMinimized = state.isMinimized && isPopupContext();
    const timerHeight = isCurrentlyMinimized
      ? Math.ceil(elements.panel.getBoundingClientRect().height)
      : 96;
    const contentHeight = headerHeight + timerHeight + verticalPadding + 2;
    const contentWidth = isCurrentlyMinimized
      ? Math.max(header.scrollWidth, elements.panel.scrollWidth) + horizontalPadding
      : 360;
    const size = {
      width: Math.round(clamp(contentWidth, MINIMIZED_POPUP_SIZE_LIMITS.minWidth, Math.min(MINIMIZED_POPUP_SIZE_LIMITS.maxWidth, availableWidth))),
      height: Math.round(clamp(contentHeight, MINIMIZED_POPUP_SIZE_LIMITS.minHeight, Math.min(MINIMIZED_POPUP_SIZE_LIMITS.maxHeight, availableHeight))),
    };
    elements.app.style.zoom = previousZoom;
    return size;
  }

  function fitPopupSizeToScreen(size, view = window, limits = POPUP_SIZE_LIMITS) {
    const screen = view.screen || window.screen;
    const maximumWidth = Math.min(limits.maxWidth, Math.max(limits.minWidth, screen.availWidth - 32));
    const maximumHeight = Math.min(limits.maxHeight, Math.max(limits.minHeight, screen.availHeight - 48));
    return {
      width: Math.round(clamp(size.width, limits.minWidth, maximumWidth)),
      height: Math.round(clamp(size.height, limits.minHeight, maximumHeight)),
    };
  }

  function getPreferredPopupSize(view = window) {
    const savedSize = loadSavedPopupSize();
    return savedSize ? fitPopupSizeToScreen(savedSize, view) : calculateOptimalPopupSize(view);
  }

  function savePopupSize(size, isMinimized = false) {
    const limits = isMinimized ? MINIMIZED_POPUP_SIZE_LIMITS : POPUP_SIZE_LIMITS;
    const normalized = normalizePopupSize(size, limits);
    if (!normalized) return;
    const key = isMinimized ? MINIMIZED_POPUP_SIZE_KEY : POPUP_SIZE_KEY;
    localStorage.setItem(key, JSON.stringify(normalized));
    updatePopupSizeSettings();
  }

  function updatePopupSizeSettings() {
    const savedSize = loadSavedPopupSize();
    const savedMinimizedSize = loadSavedMinimizedPopupSize();
    const automaticSize = calculateOptimalPopupSize(elements.app.ownerDocument.defaultView || window);
    const automaticMinimizedSize = calculateOptimalMinimizedPopupSize(elements.app.ownerDocument.defaultView || window);
    const minimizedSize = savedMinimizedSize || automaticMinimizedSize;
    elements.popupSizeStatus.textContent = savedSize
      ? `${savedSize.width} × ${savedSize.height}px（保存済み）`
      : `${automaticSize.width} × ${automaticSize.height}px（自動）`;
    elements.minimizedPopupSizeStatus.textContent = savedMinimizedSize
      ? `${minimizedSize.width} × ${minimizedSize.height}px（保存済み）`
      : `${minimizedSize.width} × ${minimizedSize.height}px（自動）`;
    elements.resetPopupSizeButton.disabled = !savedSize;
    elements.resetMinimizedPopupSizeButton.disabled = !savedMinimizedSize;
  }

  function openSettingsDialog() {
    elements.defaultModeSelect.value = getDefaultMode();
    elements.aggregationEnabledInput.checked = isAggregationEnabled();
    elements.themeSelect.value = getTheme();
    elements.primaryTimeDisplaySelect.value = getPrimaryTimeDisplay();
    elements.backupStatus.textContent = "";
    elements.backupStatus.classList.remove("is-error");
    updatePopupSizeSettings();
    elements.settingsDialog.showModal();
  }

  function setBackupStatus(message, isError = false) {
    elements.backupStatus.textContent = message;
    elements.backupStatus.classList.toggle("is-error", isError);
  }

  function getTheme() {
    const theme = localStorage.getItem(THEME_KEY);
    return ["light", "dark"].includes(theme) ? theme : "system";
  }

  function getPrimaryTimeDisplay() {
    return localStorage.getItem(PRIMARY_TIME_DISPLAY_KEY) === "clock" ? "clock" : "measurement";
  }

  function togglePrimaryTimeDisplay() {
    const value = getPrimaryTimeDisplay() === "measurement" ? "clock" : "measurement";
    localStorage.setItem(PRIMARY_TIME_DISPLAY_KEY, value);
    elements.primaryTimeDisplaySelect.value = value;
    render();
    showToast(value === "measurement" ? "計測時間を大きく表示します" : "現在時刻を大きく表示します");
  }

  function resolveTheme(theme) {
    if (theme !== "system") return theme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme = getTheme()) {
    document.documentElement.dataset.theme = theme;
    const appDocument = elements.app?.ownerDocument;
    if (appDocument && appDocument !== document) {
      appDocument.documentElement.dataset.theme = resolveTheme(theme);
    }
  }

  function getBackupSummary(storage) {
    const parse = (key, fallback) => {
      try { return JSON.parse(storage[key] || JSON.stringify(fallback)); } catch { return fallback; }
    };
    const records = parse(RECORDS_KEY, []);
    const timerState = parse(STORAGE_KEY, {});
    const memos = parse(DAILY_MEMOS_KEY, {});
    const dates = Array.isArray(records)
      ? records.map((record) => record && record.date).filter((date) => typeof date === "string").sort()
      : [];
    return [
      `作業履歴：${Array.isArray(records) ? records.length : 0}件`,
      `対象期間：${dates.length ? `${dates[0]} ～ ${dates[dates.length - 1]}` : "履歴なし"}`,
      `タイマータブ：${Array.isArray(timerState.timerTabs) ? timerState.timerTabs.length : 0}件`,
      `日別メモ：${memos && typeof memos === "object" && !Array.isArray(memos) ? Object.keys(memos).length : 0}件`,
    ].join("\n");
  }

  function exportBackup() {
    saveState();
    saveRecords();
    saveDailyMemos();
    const backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      storage: Object.fromEntries(BACKUP_STORAGE_KEYS.map((key) => [key, localStorage.getItem(key)])),
    };
    if (!window.confirm(`次の内容をバックアップします。\n\n${getBackupSummary(backup.storage)}\n\nエクスポートしますか？`)) {
      setBackupStatus("エクスポートをキャンセルしました。");
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `simple-timer-backup-${localDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupStatus("バックアップファイルを保存しました。");
  }

  function validateBackup(backup) {
    if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
      throw new Error("Simple Timerのバックアップファイルではないか、対応していない形式です。");
    }
    if (!backup.storage || typeof backup.storage !== "object" || Array.isArray(backup.storage)) {
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
      [STORAGE_KEY, (value) => value && typeof value === "object" && !Array.isArray(value)],
      [RECORDS_KEY, Array.isArray],
      [POPUP_SIZE_KEY, (value) => value && Number.isFinite(value.width) && Number.isFinite(value.height)],
      [MINIMIZED_POPUP_SIZE_KEY, (value) => value && Number.isFinite(value.width) && Number.isFinite(value.height)],
      [DAILY_MEMOS_KEY, (value) => value && typeof value === "object" && !Array.isArray(value)],
    ].forEach(([key, isValid]) => {
      const rawValue = backup.storage[key];
      if (rawValue === null) return;
      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        throw new Error("バックアップ内のJSONデータが破損しています。");
      }
      if (!isValid(parsed)) throw new Error("バックアップ内のデータ形式が正しくありません。");
    });
    if (backup.storage[DEFAULT_MODE_KEY] !== null &&
        !Object.values(MODES).includes(backup.storage[DEFAULT_MODE_KEY])) {
      throw new Error("バックアップ内の初期表示設定が正しくありません。");
    }
    if (backup.storage[AGGREGATION_ENABLED_KEY] !== null &&
        !["true", "false"].includes(backup.storage[AGGREGATION_ENABLED_KEY])) {
      throw new Error("バックアップ内の高度な計測設定が正しくありません。");
    }
    if (backup.storage[THEME_KEY] !== null &&
        !["system", "light", "dark"].includes(backup.storage[THEME_KEY])) {
      throw new Error("バックアップ内のテーマ設定が正しくありません。");
    }
    if (backup.storage[PRIMARY_TIME_DISPLAY_KEY] !== null &&
        !["measurement", "clock"].includes(backup.storage[PRIMARY_TIME_DISPLAY_KEY])) {
      throw new Error("バックアップ内の時間表示設定が正しくありません。");
    }
  }

  async function importBackup(event) {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      validateBackup(backup);
      const shouldImport = window.confirm(
        `バックアップの内容\n\n${getBackupSummary(backup.storage)}\n\n` +
        "現在のタイマー、作業履歴、メモ、設定をこの内容で置き換えます。インポートしてよろしいですか？",
      );
      if (!shouldImport) {
        setBackupStatus("インポートをキャンセルしました。");
        return;
      }
      BACKUP_STORAGE_KEYS.forEach((key) => {
        const value = backup.storage[key];
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      });
      location.reload();
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : "バックアップを読み込めませんでした。", true);
    }
  }

  function schedulePopupSizeSave(view) {
    if (!isPopupContext()) return;
    window.clearTimeout(popupResizeSaveId);
    const remainingSuppressionMs = Math.max(0, suppressPopupSizeSaveUntil - now());
    popupResizeSaveId = window.setTimeout(() => {
      if (!isPopupContext()) return;
      savePopupSize(
        { width: view.innerWidth, height: view.innerHeight },
        state.isMinimized,
      );
      popupResizeSaveId = 0;
    }, Math.max(350, remainingSuppressionMs + 100));
  }

  function cancelPendingPopupSizeSave() {
    window.clearTimeout(popupResizeSaveId);
    popupResizeSaveId = 0;
  }

  function resizePopupWindow(view, size) {
    suppressPopupSizeSaveUntil = now() + 1000;
    const frameWidth = Math.max(0, view.outerWidth - view.innerWidth);
    const frameHeight = Math.max(0, view.outerHeight - view.innerHeight);
    try { view.resizeTo(size.width + frameWidth, size.height + frameHeight); } catch {}
  }

  function applyPopupSize(view, size) {
    cancelPendingPopupSizeSave();
    resizePopupWindow(view, size);
    view.requestAnimationFrame(() => resizePopupWindow(view, size));
  }

  function resetPopupSize() {
    localStorage.removeItem(POPUP_SIZE_KEY);
    preMinimizePopupSize = null;
    updatePopupSizeSettings();
    if (isPopupContext() && !state.isMinimized) {
      const view = elements.app.ownerDocument.defaultView;
      applyPopupSize(view, calculateOptimalPopupSize(view));
    }
    showToast("PiPサイズを自動設定に戻しました");
  }

  function resetMinimizedPopupSize() {
    localStorage.removeItem(MINIMIZED_POPUP_SIZE_KEY);
    updatePopupSizeSettings();
    if (isPopupContext() && state.isMinimized) {
      const view = elements.app.ownerDocument.defaultView;
      applyPopupSize(view, fitPopupSizeToScreen(
        calculateOptimalMinimizedPopupSize(view),
        view,
        MINIMIZED_POPUP_SIZE_LIMITS,
      ));
    }
    showToast("最小化サイズを自動設定に戻しました");
  }

  function timerTabLabel(tab) {
    const name = tab.id === state.activeTimerId ? state.taskName : tab.taskName;
    return name.trim() || `タイマー ${tab.number}`;
  }

  function renderTimerTabs() {
    snapshotActiveTimer();
    const signature = JSON.stringify([
      state.activeTimerId,
      state.timerTabs.map((tab) => [tab.id, tab.taskName, tab.number]),
    ]);
    if (signature === timerTabsSignature) return;
    timerTabsSignature = signature;
    elements.timerTabList.replaceChildren();
    state.timerTabs.forEach((tab) => {
      const item = document.createElement("div");
      item.className = "timer-workspace-tab";
      item.classList.toggle("is-active", tab.id === state.activeTimerId);

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "timer-tab-select";
      selectButton.dataset.timerId = tab.id;
      selectButton.setAttribute("role", "tab");
      selectButton.setAttribute("aria-controls", "timer-panel");
      selectButton.setAttribute("aria-selected", String(tab.id === state.activeTimerId));
      selectButton.textContent = timerTabLabel(tab);
      selectButton.title = timerTabLabel(tab);
      item.append(selectButton);

      if (state.timerTabs.length > 1) {
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "timer-tab-close";
        closeButton.dataset.closeTimerId = tab.id;
        closeButton.setAttribute("aria-label", `${timerTabLabel(tab)}を閉じる`);
        closeButton.textContent = "×";
        item.append(closeButton);
      }
      elements.timerTabList.append(item);
    });
  }

  function performSelectTimerTab(timerId) {
    if (timerId === state.activeTimerId) return;
    const nextTab = state.timerTabs.find((tab) => tab.id === timerId);
    if (!nextTab) return;
    freezeRunningTimer();
    snapshotActiveTimer();
    applyTimerTab(nextTab);
    syncInputsFromDuration();
    timerTabsSignature = "";
    saveState();
    render();
  }

  function performAddTimerTab() {
    freezeRunningTimer();
    snapshotActiveTimer();
    const tab = createTimerTab(state.nextTimerNumber);
    state.nextTimerNumber += 1;
    state.timerTabs.push(tab);
    applyTimerTab(tab);
    syncInputsFromDuration();
    timerTabsSignature = "";
    saveState();
    render();
  }

  function closeTimerNavigationConfirm() {
    pendingTimerNavigation = null;
    elements.timerNavigationConfirmOverlay.hidden = true;
    if (timerNavigationConfirmPreviousFocus && typeof timerNavigationConfirmPreviousFocus.focus === "function") {
      timerNavigationConfirmPreviousFocus.focus();
    }
    timerNavigationConfirmPreviousFocus = null;
  }

  function confirmTimerNavigation() {
    if (!pendingTimerNavigation) return;
    const action = pendingTimerNavigation;
    closeTimerNavigationConfirm();
    if (action.type === "select") performSelectTimerTab(action.timerId);
    else performAddTimerTab();
  }

  function requestTimerNavigation(action) {
    pendingTimerNavigation = action;
    timerNavigationConfirmPreviousFocus = elements.app.ownerDocument.activeElement;
    const isSelect = action.type === "select";
    elements.timerNavigationConfirmMessage.textContent = isSelect
      ? "現在のタイマーを一時停止した上で、別のタブへ移動してもよろしいですか？"
      : "現在のタイマーを一時停止した上で、新しいタブを作成してもよろしいですか？";
    elements.confirmTimerNavigationButton.textContent = isSelect ? "一時停止して移動" : "一時停止して作成";
    elements.timerNavigationConfirmOverlay.hidden = false;
    elements.confirmTimerNavigationButton.focus();
  }

  function selectTimerTab(timerId) {
    if (timerId === state.activeTimerId) return;
    if (state.isRunning) {
      requestTimerNavigation({ type: "select", timerId });
      return;
    }
    performSelectTimerTab(timerId);
  }

  function selectAdjacentTimerTab(direction = 1) {
    if (state.timerTabs.length <= 1) return;
    const currentIndex = state.timerTabs.findIndex((tab) => tab.id === state.activeTimerId);
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + direction + state.timerTabs.length) % state.timerTabs.length;
    selectTimerTab(state.timerTabs[nextIndex].id);
  }

  function selectNextTimerTab() {
    selectAdjacentTimerTab(1);
  }

  function addTimerTab() {
    if (state.isRunning) {
      requestTimerNavigation({ type: "add" });
      return;
    }
    performAddTimerTab();
  }

  function isTimerNavigationConfirmOpen() {
    return !elements.timerNavigationConfirmOverlay.hidden;
  }

  function timerHasActivity(tab) {
    return tab.id === state.activeTimerId
      ? state.hasStarted || state.isRunning
      : tab.hasStarted === true || tab.isRunning === true;
  }

  function removeTimerTab(timerId) {
    const tab = state.timerTabs.find((item) => item.id === timerId);
    if (!tab || state.timerTabs.length <= 1) return;
    snapshotActiveTimer();
    const removedTab = JSON.parse(JSON.stringify(tab));
    const removedIndex = state.timerTabs.indexOf(tab);
    const wasActive = tab.id === state.activeTimerId;
    if (tab.id === state.activeTimerId && state.isRunning) stopTicking();
    const index = removedIndex;
    state.timerTabs.splice(index, 1);
    if (tab.id === state.activeTimerId) {
      applyTimerTab(state.timerTabs[Math.min(index, state.timerTabs.length - 1)]);
      syncInputsFromDuration();
    }
    timerTabsSignature = "";
    saveState();
    render();
    showToast("タイマータブを削除しました", () => {
      state.timerTabs.splice(Math.min(removedIndex, state.timerTabs.length), 0, removedTab);
      if (wasActive) {
        applyTimerTab(removedTab);
        syncInputsFromDuration();
      }
      timerTabsSignature = "";
      saveState();
      render();
      showToast("タイマータブを元に戻しました");
    });
  }

  function closeTimerTabConfirm() {
    pendingCloseTimerId = "";
    elements.timerTabConfirmOverlay.hidden = true;
    if (timerTabConfirmPreviousFocus && typeof timerTabConfirmPreviousFocus.focus === "function") {
      timerTabConfirmPreviousFocus.focus();
    }
    timerTabConfirmPreviousFocus = null;
  }

  function confirmCloseTimerTab() {
    if (!pendingCloseTimerId) return;
    const timerId = pendingCloseTimerId;
    closeTimerTabConfirm();
    removeTimerTab(timerId);
  }

  function closeTimerTab(timerId) {
    const tab = state.timerTabs.find((item) => item.id === timerId);
    if (!tab || state.timerTabs.length <= 1) return;
    snapshotActiveTimer();
    if (!timerHasActivity(tab)) {
      removeTimerTab(timerId);
      return;
    }
    pendingCloseTimerId = timerId;
    timerTabConfirmPreviousFocus = elements.app.ownerDocument.activeElement;
    elements.timerTabConfirmMessage.textContent =
      `「${timerTabLabel(tab)}」は開始済みです。計測内容を破棄して削除してもよろしいですか？`;
    elements.timerTabConfirmOverlay.hidden = false;
    elements.confirmTimerTabDeleteButton.focus();
  }

  function isTimerTabConfirmOpen() {
    return !elements.timerTabConfirmOverlay.hidden;
  }

  function hasStartedTimer() {
    snapshotActiveTimer();
    return state.timerTabs.some(timerHasActivity);
  }

  function updateModeUi() {
    elements.modeTabs.forEach((tab) => {
      const active = tab.dataset.mode === state.mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    elements.countdownSettings.hidden = state.mode !== MODES.COUNTDOWN;
    elements.pomodoroEnabledInput.checked = state.pomodoroEnabled;
    elements.pomodoroBreakSettings.classList.toggle("is-active", state.pomodoroEnabled);
    elements.pomodoroBreakSettings.setAttribute("aria-hidden", String(!state.pomodoroEnabled));
    elements.pomodoroBreakInput.disabled = !state.pomodoroEnabled;
  }

  function updateStatus() {
    if (isAwaitingCountdownStop()) {
      elements.statusText.textContent = "0秒になりました。停止ボタンを押してください";
    }
    else if (isPomodoroActive() && state.isRunning) {
      elements.statusText.textContent = state.pomodoroPhase === "work" ? "ポモドーロ作業中" : "休憩中（作業時間には含まれません）";
    }
    else if (isPomodoroActive() && state.pomodoroPhaseElapsedBeforeStartMs > 0) {
      elements.statusText.textContent = state.pomodoroPhase === "work" ? "作業を一時停止中" : "休憩を一時停止中";
    }
    else if (state.finishedAt) elements.statusText.textContent = "完了";
    else if (state.isRunning) elements.statusText.textContent = state.mode === MODES.COUNTDOWN ? "集中時間を計測中" : "作業時間を計測中";
    else if (state.mode === MODES.COUNTDOWN && state.elapsedBeforeStartMs > 0 && getCountdownSessionElapsedMs() === 0) {
      elements.statusText.textContent = "作業時間を保持して待機中";
    }
    else if (state.elapsedBeforeStartMs > 0) elements.statusText.textContent = "一時停止中";
    else elements.statusText.textContent = "待機中";
  }

  function isFinishedCountdown() {
    return state.mode === MODES.COUNTDOWN && !state.pomodoroEnabled &&
      !state.isRunning && state.finishedAt > 0;
  }

  function isAwaitingCountdownStop() {
    return state.mode === MODES.COUNTDOWN && state.isRunning && state.finishedAt > 0;
  }

  function markCountdownReachedZero() {
    if (state.finishedAt) return;
    state.finishedAt = now();
    state.hasStarted = true;
    saveState();
    startCountdownAlert();
  }

  function fitButtonText(button) {
    button.style.fontSize = "";
    if (!button.isConnected || button.offsetParent === null) return;

    const computedStyle = getComputedStyle(button);
    const maxSize = Number.parseFloat(computedStyle.fontSize) || 16;
    const minSize = Math.max(10, maxSize * 0.68);
    let size = maxSize;

    button.style.fontSize = `${size}px`;
    while (size > minSize && button.scrollWidth > button.clientWidth + 1) {
      size -= 0.5;
      button.style.fontSize = `${size}px`;
    }
  }

  function fitControlButtonText() {
    fitButtonText(elements.startPauseButton);
    fitButtonText(elements.nextTaskButton);
    fitButtonText(elements.compactStartPauseButton);
  }

  function scheduleFitControlButtonText() {
    const view = elements.app.ownerDocument.defaultView || window;
    view.cancelAnimationFrame(fitButtonsFrame);
    fitButtonsFrame = view.requestAnimationFrame(fitControlButtonText);
  }

  function updateDocumentTitle() {
    const title = state.taskName.trim() || "Simple Timer";
    document.title = title;
    const currentDocument = elements.app.ownerDocument;
    if (currentDocument !== document) currentDocument.title = title;
    elements.appTitle.textContent = isPopupContext() && state.isMinimized && state.taskName.trim()
      ? state.taskName.trim()
      : "Simple Timer";
  }

  function render() {
    if (state.mode === MODES.COUNTDOWN && state.isRunning && getDisplayMs() <= 0) {
      markCountdownReachedZero();
    }
    updateDocumentTitle();
    elements.taskNameDisplay.textContent = state.taskName || "タスク名を入力";
    const measurementMs = getDisplayMs();
    const measurementLabel = state.mode === MODES.STOPWATCH
      ? "計測"
      : isPomodoroActive()
        ? state.pomodoroPhase === "work" ? "作業 残り" : "休憩 残り"
        : "残り";
    const measurementText = formatTime(
      measurementMs,
      state.mode === MODES.COUNTDOWN ? "ceil" : "floor",
    );
    const showClockAsPrimary = getPrimaryTimeDisplay() === "clock";
    elements.timeDisplay.textContent = showClockAsPrimary ? currentClockText : measurementText;
    elements.secondaryTimeDisplay.textContent = showClockAsPrimary
      ? `${measurementLabel} ${measurementText}`
      : `現在 ${currentClockText}`;
    elements.cumulativeTimeDisplay.hidden = state.mode !== MODES.COUNTDOWN;
    elements.timeMetaRow.hidden = false;
    elements.cumulativeTimeDisplay.textContent = `作業時間 ${formatTime(getElapsedMs())}`;
    elements.pomodoroPhaseDisplay.hidden = !isPomodoroActive();
    elements.pomodoroPhaseDisplay.textContent = state.pomodoroPhase === "work" ? "作業" : "休憩（作業時間外）";
    elements.pomodoroPhaseDisplay.classList.toggle("is-break", state.pomodoroPhase === "break");
    const canResumeCurrentSession = isPomodoroActive()
      ? state.pomodoroPhaseElapsedBeforeStartMs > 0
      : state.mode === MODES.STOPWATCH
      ? state.elapsedBeforeStartMs > 0
      : getCountdownSessionElapsedMs() > 0;
    const primaryActionLabel = isAwaitingCountdownStop()
      ? "停止"
      : isFinishedCountdown()
        ? "同じタスクで計測"
        : state.isRunning
        ? "一時停止"
        : isPomodoroActive() && state.pomodoroPhase === "break"
          ? state.pomodoroPhaseElapsedBeforeStartMs > 0
            ? "休憩再開"
            : "休憩開始"
        : canResumeCurrentSession
          ? "再開"
          : "開始";
    elements.startPauseButton.textContent = primaryActionLabel;
    elements.compactStartPauseButton.textContent = isAwaitingCountdownStop()
      ? "停止"
      : isFinishedCountdown()
        ? "同じタスク"
        : state.isRunning
        ? "一時停止"
        : isPomodoroActive() && state.pomodoroPhase === "break"
          ? state.pomodoroPhaseElapsedBeforeStartMs > 0
            ? "休憩再開"
            : "休憩開始"
        : canResumeCurrentSession
          ? "再開"
          : "開始";
    elements.resetButton.textContent = isPomodoroActive() &&
      state.pomodoroPhase === "break" &&
      (state.isRunning || state.pomodoroPhaseElapsedBeforeStartMs > 0)
      ? "休憩終了"
      : "リセット";
    elements.panel.classList.toggle("is-finished", state.finishedAt > 0);
    elements.panel.classList.toggle("is-awaiting-stop", isAwaitingCountdownStop());
    elements.timeDisplay.classList.toggle("is-measurement-finished", !showClockAsPrimary && state.finishedAt > 0);
    elements.timeDisplay.classList.toggle("is-measurement-awaiting-stop", !showClockAsPrimary && isAwaitingCountdownStop());
    elements.secondaryTimeDisplay.classList.toggle("is-measurement-finished", showClockAsPrimary && state.finishedAt > 0);
    elements.secondaryTimeDisplay.classList.toggle("is-measurement-awaiting-stop", showClockAsPrimary && isAwaitingCountdownStop());
    elements.panel.classList.toggle(
      "is-overtime-background",
      isAwaitingCountdownStop() && now() - state.finishedAt >= 5000,
    );
    renderTimerTabs();
    getCurrentBody().classList.toggle("is-minimized", state.isMinimized && isPopupContext());
    elements.minimizeButton.querySelector("span").textContent = state.isMinimized ? "□" : "−";
    updateModeUi();
    updateStatus();
    scheduleFitControlButtonText();
    scheduleFitPopupContent();
  }

  function startTimer() {
    stopCountdownAlert();
    state.timerTabs.forEach((tab) => {
      if (tab.id !== state.activeTimerId) {
        tab.isRunning = false;
        tab.startedAt = 0;
      }
    });
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      if (isPomodoroActive()) {
        state.pomodoroBreakDurationMs = Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) * 60000;
        if (state.pomodoroPhaseElapsedBeforeStartMs >= getPomodoroPhaseDurationMs()) {
          state.pomodoroPhaseElapsedBeforeStartMs = 0;
        }
      } else if (state.finishedAt || getCountdownSessionElapsedMs() >= state.countdownDurationMs) {
        state.countdownSessionStartElapsedMs = getElapsedMs();
      }
      syncInputsFromDuration();
    }
    state.finishedAt = 0;
    state.hasStarted = true;
    state.isRunning = true;
    state.startedAt = now();
    if (!state.firstStartedAt) state.firstStartedAt = state.startedAt;
    saveState();
    startTicking();
    render();
  }

  function pauseTimer() {
    if (!state.isRunning) return;
    freezeRunningTimer();
    saveState();
    render();
  }

  function freezeRunningTimer() {
    if (!state.isRunning) return;
    stopCountdownAlert();
    if (isPomodoroActive()) {
      const deltaMs = getRunningDeltaMs();
      if (state.pomodoroPhase === "work") state.elapsedBeforeStartMs += deltaMs;
      state.pomodoroPhaseElapsedBeforeStartMs += deltaMs;
    } else {
      state.elapsedBeforeStartMs = getElapsedMs();
    }
    state.isRunning = false;
    state.startedAt = 0;
    stopTicking();
  }

  function prepareAdditionalCountdown() {
    if (!isFinishedCountdown()) return;
    state.countdownSessionStartElapsedMs = getElapsedMs();
    state.finishedAt = 0;
    saveState();
    render();
    elements.statusText.textContent = "追加する時間を選択して開始してください";
  }

  function toggleTimer() {
    if (state.mode === MODES.COUNTDOWN && state.isRunning && getDisplayMs() <= 0 && !state.finishedAt) {
      markCountdownReachedZero();
    }
    if (isAwaitingCountdownStop()) {
      if (isPomodoroActive()) finishPomodoroPhase();
      else finishCountdown();
      return;
    }
    if (isFinishedCountdown()) {
      prepareAdditionalCountdown();
      return;
    }
    if (state.isRunning) {
      pauseTimer();
      return;
    }
    startTimer();
  }

  function handleTimerPointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    timerPointerHandledAt = now();
    toggleTimer();
  }

  function handleTimerClick() {
    // pointerdownの直後に発生するclickでは同じ操作を二重実行しない。
    if (now() - timerPointerHandledAt < 500) return;
    toggleTimer();
  }

  function resetTimer() {
    stopCountdownAlert();
    state.isRunning = false;
    state.startedAt = 0;
    state.elapsedBeforeStartMs = 0;
    state.countdownSessionStartElapsedMs = 0;
    state.finishedAt = 0;
    state.hasStarted = false;
    state.taskName = "";
    state.taskMemo = "";
    state.firstStartedAt = 0;
    state.pomodoroPhase = "work";
    state.pomodoroPhaseElapsedBeforeStartMs = 0;
    stopTicking();
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      syncInputsFromDuration();
    }
    saveState();
    render();
  }

  function requestResetTimer() {
    const elapsedMs = getElapsedMs();
    if (elapsedMs <= 0) {
      resetTimer();
      return;
    }
    elements.resetConfirmMessage.textContent = `現在の作業時間は ${formatTime(elapsedMs)} です。`;
    elements.resetConfirmOverlay.hidden = false;
    elements.confirmResetButton.focus();
  }

  function closeResetConfirm() {
    elements.resetConfirmOverlay.hidden = true;
    elements.resetButton.focus();
  }

  function confirmResetTimer() {
    elements.resetConfirmOverlay.hidden = true;
    snapshotActiveTimer();
    const timerIndex = state.timerTabs.findIndex((tab) => tab.id === state.activeTimerId);
    const timerSnapshot = timerIndex >= 0
      ? JSON.parse(JSON.stringify(state.timerTabs[timerIndex]))
      : null;
    resetTimer();
    showToast("履歴に追加せずリセットしました", () => {
      if (!timerSnapshot) return;
      const currentIndex = state.timerTabs.findIndex((tab) => tab.id === timerSnapshot.id);
      if (currentIndex >= 0) state.timerTabs[currentIndex] = timerSnapshot;
      else state.timerTabs.splice(Math.min(timerIndex, state.timerTabs.length), 0, timerSnapshot);
      applyTimerTab(timerSnapshot);
      syncInputsFromDuration();
      timerTabsSignature = "";
      saveState();
      render();
      showToast("リセット前の状態に戻しました");
    });
  }

  function requestResetOrFinishBreak() {
    if (isPomodoroActive() &&
        state.pomodoroPhase === "break" &&
        (state.isRunning || state.pomodoroPhaseElapsedBeforeStartMs > 0)) {
      finishPomodoroBreakEarly();
      return;
    }
    requestResetTimer();
  }

  function isResetConfirmOpen() {
    return !elements.resetConfirmOverlay.hidden;
  }

  function finishCountdown() {
    freezeRunningTimer();
    state.hasStarted = true;
    saveState();
    render();
  }

  function finishPomodoroPhase() {
    const completedPhase = state.pomodoroPhase;
    freezeRunningTimer();
    if (completedPhase === "work") {
      state.elapsedBeforeStartMs += Math.max(
        0,
        state.countdownDurationMs - state.pomodoroPhaseElapsedBeforeStartMs,
      );
      state.pomodoroPhase = "break";
    } else {
      state.pomodoroPhase = "work";
    }
    state.pomodoroPhaseElapsedBeforeStartMs = 0;
    state.finishedAt = 0;
    state.hasStarted = state.elapsedBeforeStartMs > 0;
    saveState();
    render();
    showToast(completedPhase === "work" ? "作業終了です。休憩を開始できます" : "休憩終了です。次の作業を開始できます");
  }

  function finishPomodoroBreakEarly() {
    freezeRunningTimer();
    state.pomodoroPhase = "work";
    state.pomodoroPhaseElapsedBeforeStartMs = 0;
    state.finishedAt = 0;
    saveState();
    render();
    showToast("休憩を終了しました。次の作業を開始できます");
  }

  function performModeSwitch(mode) {
    if (state.mode === mode) return;
    freezeRunningTimer();
    state.mode = mode;
    state.countdownSessionStartElapsedMs = state.elapsedBeforeStartMs;
    state.finishedAt = 0;
    state.hasStarted = state.elapsedBeforeStartMs > 0;
    saveState();
    render();
  }

  function closeModeSwitchConfirm() {
    pendingMode = "";
    elements.modeSwitchConfirmOverlay.hidden = true;
    if (modeSwitchConfirmPreviousFocus && typeof modeSwitchConfirmPreviousFocus.focus === "function") {
      modeSwitchConfirmPreviousFocus.focus();
    }
    modeSwitchConfirmPreviousFocus = null;
  }

  function confirmModeSwitch() {
    if (!pendingMode) return;
    const mode = pendingMode;
    closeModeSwitchConfirm();
    performModeSwitch(mode);
  }

  function switchMode(mode) {
    if (state.mode === mode) return;
    if (!state.hasStarted && !state.isRunning) {
      performModeSwitch(mode);
      return;
    }
    pendingMode = mode;
    modeSwitchConfirmPreviousFocus = elements.app.ownerDocument.activeElement;
    const modeName = mode === MODES.COUNTDOWN ? "カウントダウン" : "ストップウォッチ";
    elements.modeSwitchConfirmMessage.textContent =
      state.isRunning
        ? `現在の作業時間を維持し、動作中のタイマーを一時停止して「${modeName}」へ切り替えてもよろしいですか？`
        : `現在の作業時間を維持したまま「${modeName}」へ切り替えてもよろしいですか？`;
    elements.modeSwitchConfirmOverlay.hidden = false;
    elements.confirmModeSwitchButton.focus();
  }

  function isModeSwitchConfirmOpen() {
    return !elements.modeSwitchConfirmOverlay.hidden;
  }

  function setCountdownDuration(seconds) {
    freezeRunningTimer();
    state.countdownDurationMs = seconds * 1000;
    state.countdownSessionStartElapsedMs = state.elapsedBeforeStartMs;
    state.finishedAt = 0;
    state.hasStarted = state.elapsedBeforeStartMs > 0;
    syncInputsFromDuration();
    saveState();
    render();
  }

  function startTicking() { if (!tickId) tickId = window.setInterval(render, TICK_INTERVAL_MS); }
  function stopTicking() { if (tickId) { window.clearInterval(tickId); tickId = 0; } }

  function playFinishSound() {
    try {
      audioContext = audioContext || new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.38);
    } catch { /* 音声が使えなくても完了表示は維持する */ }
  }

  function startCountdownAlert() {
    if (finishSoundIntervalId) return;
    playFinishSound();
    finishSoundIntervalId = window.setInterval(playFinishSound, 900);
  }

  function stopCountdownAlert() {
    if (!finishSoundIntervalId) return;
    window.clearInterval(finishSoundIntervalId);
    finishSoundIntervalId = 0;
  }

  function recentTaskNames() {
    const names = [];
    [...state.records].reverse().forEach((record) => {
      const taskName = normalizeTaskName(record.taskName);
      if (taskName && !names.includes(taskName)) names.push(taskName);
    });
    const currentTaskName = normalizeTaskName(state.taskName);
    if (currentTaskName && !names.includes(currentTaskName)) names.unshift(currentTaskName);
    return names.slice(0, 10);
  }

  function renderRecentTasks(list, input) {
    loadRecords();
    list.replaceChildren();
    const names = recentTaskNames();
    if (!names.length) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "履歴はまだありません";
      list.append(empty);
      return;
    }
    names.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-task-button";
      button.textContent = name;
      button.addEventListener("click", () => { input.value = name; input.focus(); });
      list.append(button);
    });
  }

  function openTaskDialog(recordAfterInput = false) {
    pendingRecordAfterTaskInput = recordAfterInput === true;
    elements.taskInput.value = state.taskName;
    elements.taskMemoInput.value = state.taskMemo;
    renderRecentTasks(elements.recentTaskList, elements.taskInput);
    elements.taskDialog.showModal();
    window.setTimeout(() => elements.taskInput.focus(), 0);
  }

  function setTask(name, memo = "") {
    state.taskName = resolveTaskName(name);
    state.taskMemo = memo.trim().slice(0, 300);
    saveState();
    render();
  }

  function showToast(message, undoAction = null) {
    window.clearTimeout(toastId);
    toastUndoAction = undoAction;
    elements.toastMessage.textContent = message;
    elements.toastUndoButton.hidden = !undoAction;
    elements.toast.classList.add("is-visible");
    toastId = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
      elements.toastUndoButton.hidden = true;
      toastUndoAction = null;
    }, undoAction ? 7000 : 3000);
  }

  function moveToNextTask() {
    const durationMs = getRecordedElapsedMs();
    if (!state.taskName.trim()) {
      elements.statusText.textContent = "記録するタスク名を入力してください";
      openTaskDialog(true);
      return;
    }
    if (durationMs < 1000) {
      elements.statusText.textContent = "1秒以上計測してから記録してください";
      return;
    }
    const addedAt = now();
    state.records.push({
      id: `${addedAt}-${Math.random().toString(16).slice(2)}`,
      date: localDateKey(),
      taskName: state.taskName.trim(),
      memo: state.taskMemo,
      durationMs: Math.round(durationMs),
      mode: state.mode,
      firstStartedAt: new Date(state.firstStartedAt || addedAt - durationMs).toISOString(),
      createdAt: new Date(addedAt).toISOString(),
    });
    saveRecords();
    resetTimer();
    state.taskName = "";
    state.taskMemo = "";
    saveState();
    render();
    elements.statusText.textContent = "今日の作業として記録しました";
    showToast("作業履歴に追加しました");
  }

  function renderHistory() {
    const selectedDate = elements.historyDate.value;
    const keepCurrentDraft = dailyMemoEditingDate === selectedDate && dailyMemoDirty;
    if (dailyMemoEditingDate && dailyMemoEditingDate !== selectedDate && dailyMemoDirty) {
      saveDailyMemoNow(false);
    }
    const records = state.records.filter((record) => record.date === elements.historyDate.value);
    const isViewingToday = elements.historyDate.value === localDateKey();
    elements.historyDialog.classList.toggle("is-viewing-past", !isViewingToday);
    elements.historyDateContext.hidden = isViewingToday;
    elements.addHistoryButton.hidden = !isViewingToday;
    dailyMemoEditingDate = elements.historyDate.value;
    if (!keepCurrentDraft) elements.dailyMemoInput.value = dailyMemos[elements.historyDate.value] || "";
    elements.dailyMemoInput.readOnly = !isViewingToday;
    if (!keepCurrentDraft) {
      dailyMemoDirty = false;
      elements.dailyMemoStatus.textContent =
        isViewingToday ? "入力内容は自動保存されます" : "過去の日別メモは参照のみです";
    }
    elements.unitButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.unit === state.historyUnit));
    renderHistorySummary(records);
    elements.historyList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "この日の記録はありません";
      elements.historyList.append(empty);
      return;
    }
    records.forEach((record) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "history-item";
      const details = document.createElement("span");
      details.className = "history-item-details";
      const task = document.createElement("strong");
      const duration = document.createElement("span");
      task.textContent = record.taskName;
      const metadata = document.createElement("small");
      metadata.className = "history-item-meta";
      const timeRange = formatHistoryTimeRange(record);
      metadata.textContent = [timeRange, record.memo || ""].filter(Boolean).join(" ／ ");
      details.append(task);
      if (metadata.textContent) details.append(metadata);
      duration.textContent = formatRecordDuration(record.durationMs);
      item.append(details, duration);
      item.addEventListener("click", () => openEditHistoryDialog(record));
      elements.historyList.append(item);
    });
  }

  function renderHistorySummary(records) {
    const enabled = isAggregationEnabled();
    elements.historySummary.hidden = !enabled || !records.length;
    elements.historySummary.replaceChildren();
    if (!enabled || !records.length) return;
    const heading = document.createElement("h3");
    heading.textContent = "タスク別集計";
    elements.historySummary.append(heading);
    const totals = new Map();
    records.forEach((record) => {
      const taskName = normalizeTaskName(record.taskName);
      totals.set(taskName, (totals.get(taskName) || 0) + record.durationMs);
    });
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
      .forEach(([taskName, durationMs]) => {
        const row = document.createElement("div");
        row.className = "history-summary-row";
        const name = document.createElement("span");
        const duration = document.createElement("strong");
        name.textContent = taskName;
        duration.textContent = formatRecordDuration(durationMs);
        row.append(name, duration);
        elements.historySummary.append(row);
      });
  }

  function renderHistoryDateOptions(preferredDate = elements.historyDate.value) {
    const today = localDateKey();
    const availableDates = [...new Set([today, ...state.records.map((record) => record.date), ...Object.keys(dailyMemos)])]
      .sort((a, b) => b.localeCompare(a));
    elements.historyDate.replaceChildren();
    availableDates.forEach((date) => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = formatHistoryDateLabel(date);
      elements.historyDate.append(option);
    });
    elements.historyDate.value = availableDates.includes(preferredDate) ? preferredDate : today;
  }

  function saveDailyMemoNow(showFeedback = true) {
    window.clearTimeout(dailyMemoSaveId);
    dailyMemoSaveId = 0;
    const date = dailyMemoEditingDate || elements.historyDate.value;
    if (!date) return;
    const memo = elements.dailyMemoInput.value.trim().slice(0, 1000);
    if (memo) dailyMemos[date] = memo;
    else delete dailyMemos[date];
    saveDailyMemos();
    dailyMemoDirty = false;
    elements.dailyMemoStatus.textContent = memo ? "保存しました" : "空のメモとして保存しました";
    if (showFeedback) {
      window.setTimeout(() => {
        if (!dailyMemoDirty && elements.historyDialog.open && elements.historyDate.value === date) {
          elements.dailyMemoStatus.textContent = "入力内容は自動保存されます";
        }
      }, 1800);
    }
  }

  function scheduleDailyMemoSave() {
    if (elements.dailyMemoInput.readOnly) return;
    dailyMemoDirty = true;
    elements.dailyMemoStatus.textContent = "未保存の変更があります…";
    window.clearTimeout(dailyMemoSaveId);
    dailyMemoSaveId = window.setTimeout(() => saveDailyMemoNow(), 700);
  }

  function canCloseHistoryWithMemo() {
    if (!dailyMemoDirty) return true;
    const shouldSave = window.confirm("日別メモに未保存の変更があります。保存して作業履歴を閉じますか？");
    if (!shouldSave) return false;
    saveDailyMemoNow(false);
    return true;
  }

  function openEditHistoryDialog(record) {
    editingRecord = record;
    elements.resumeHistoryButton.hidden = record.date !== localDateKey();
    const totalSeconds = Math.round(record.durationMs / 1000);
    elements.editHoursInput.value = String(Math.floor(totalSeconds / 3600));
    elements.editMinutesInput.value = String(Math.floor((totalSeconds % 3600) / 60));
    elements.editSecondsInput.value = String(totalSeconds % 60);
    elements.editTaskInput.value = record.taskName;
    elements.editMemoInput.value = record.memo || "";
    elements.editHistoryError.textContent = "";
    elements.editHistoryDialog.showModal();
    window.setTimeout(() => elements.editTaskInput.focus(), 0);
  }

  function updateHistoryRecord(event) {
    event.preventDefault();
    if (!editingRecord) return;
    const taskName = resolveTaskName(elements.editTaskInput.value);
    const durationMs = normalizeDurationInputs(
      [elements.editHoursInput, elements.editMinutesInput, elements.editSecondsInput],
      elements.editHistoryError,
    );
    if (durationMs === null) return;
    if (!taskName) {
      elements.editHistoryError.textContent = "タスク名を入力してください";
      return;
    }
    if (durationMs < 1000) {
      elements.editHistoryError.textContent = "作業時間を1秒以上入力してください";
      return;
    }
    const previousRecord = JSON.parse(JSON.stringify(editingRecord));
    const editedRecord = editingRecord;
    editingRecord.taskName = taskName;
    editingRecord.memo = elements.editMemoInput.value.trim().slice(0, 300);
    editingRecord.updatedAt = new Date().toISOString();
    editingRecord.durationMs = durationMs;
    saveRecords();
    elements.editHistoryDialog.close();
    renderHistory();
    showToast("作業履歴を変更しました", () => {
      const index = state.records.indexOf(editedRecord);
      if (index >= 0) state.records[index] = previousRecord;
      saveRecords();
      renderHistoryDateOptions(previousRecord.date);
      if (elements.historyDialog.open) renderHistory();
      showToast("作業履歴の変更を元に戻しました");
    });
  }

  function resumeFromHistory() {
    if (!editingRecord || editingRecord.date !== localDateKey()) return;
    elements.resumeHistoryConfirmMessage.textContent =
      `「${editingRecord.taskName}（${formatRecordDuration(editingRecord.durationMs)}）」を履歴から削除して計測画面へ復元します。`;
    elements.resumeHistoryConfirmDialog.showModal();
  }

  function confirmResumeFromHistory() {
    if (!editingRecord) return;
    const record = editingRecord;
    freezeRunningTimer();
    snapshotActiveTimer();
    const tab = createTimerTab(state.nextTimerNumber);
    state.nextTimerNumber += 1;
    tab.mode = record.mode === "pomodoro"
      ? MODES.COUNTDOWN
      : Object.values(MODES).includes(record.mode)
        ? record.mode
        : getDefaultMode();
    tab.pomodoroEnabled = record.mode === "pomodoro";
    tab.taskName = record.taskName.slice(0, 80);
    tab.taskMemo = typeof record.memo === "string" ? record.memo.slice(0, 300) : "";
    const recordStartedAt = new Date(record.firstStartedAt).getTime();
    tab.firstStartedAt = record.mode !== "manual" && Number.isFinite(recordStartedAt) ? recordStartedAt : 0;
    tab.elapsedBeforeStartMs = record.durationMs;
    tab.countdownSessionStartElapsedMs = record.durationMs;
    tab.hasStarted = true;
    state.timerTabs.push(tab);
    applyTimerTab(tab);
    const recordIndex = state.records.findIndex((item) => item.id === record.id || item === record);
    if (recordIndex >= 0) state.records.splice(recordIndex, 1);
    syncInputsFromDuration();
    timerTabsSignature = "";
    elements.resumeHistoryConfirmDialog.close();
    elements.editHistoryDialog.close();
    elements.historyDialog.close();
    saveRecords();
    saveState();
    render();
    showToast("履歴を計測画面へ戻しました。開始操作で再開できます");
  }

  function deleteHistoryRecord(record) {
    const duration = formatRecordDuration(record.durationMs);
    pendingDeleteRecordId = record.id || "";
    pendingDeleteRecord = record;
    confirmPreviousFocus = elements.app.ownerDocument.activeElement;
    elements.confirmMessage.textContent = `「${record.taskName}（${duration}）」を削除します。`;
    elements.confirmOverlay.hidden = false;
    elements.confirmDeleteButton.focus();
  }

  function closeDeleteConfirm() {
    pendingDeleteRecordId = "";
    pendingDeleteRecord = null;
    elements.confirmOverlay.hidden = true;
    if (confirmPreviousFocus && typeof confirmPreviousFocus.focus === "function") {
      confirmPreviousFocus.focus();
    }
    confirmPreviousFocus = null;
  }

  function isDeleteConfirmOpen() {
    return !elements.confirmOverlay.hidden;
  }

  function confirmDeleteHistoryRecord() {
    if (!pendingDeleteRecordId && !pendingDeleteRecord) return;
    const recordIndex = state.records.findIndex((item) => item.id === pendingDeleteRecordId || item === pendingDeleteRecord);
    if (recordIndex < 0) {
      closeDeleteConfirm();
      return;
    }
    const removedRecord = state.records[recordIndex];
    state.records.splice(recordIndex, 1);
    closeDeleteConfirm();
    if (elements.editHistoryDialog.open) elements.editHistoryDialog.close();
    saveRecords();
    renderHistoryDateOptions();
    renderHistory();
    showToast("作業履歴を削除しました", () => {
      state.records.splice(Math.min(recordIndex, state.records.length), 0, removedRecord);
      saveRecords();
      renderHistoryDateOptions(removedRecord.date);
      if (elements.historyDialog.open) renderHistory();
      showToast("作業履歴を元に戻しました");
    });
  }

  function openHistoryDialog() {
    loadRecords();
    renderHistoryDateOptions(localDateKey());
    renderHistory();
    elements.historyDialog.showModal();
  }

  function openAddHistoryDialog() {
    elements.manualDate.value = localDateKey();
    elements.manualTaskInput.value = "";
    elements.manualMemoInput.value = "";
    elements.manualHoursInput.value = "0";
    elements.manualMinutesInput.value = "0";
    elements.manualSecondsInput.value = "0";
    elements.manualStartTimeInput.value = "";
    elements.manualEndTimeInput.value = "";
    elements.manualHistoryError.textContent = "";
    renderRecentTasks(elements.manualRecentTaskList, elements.manualTaskInput);
    elements.addHistoryDialog.showModal();
    window.setTimeout(() => elements.manualTaskInput.focus(), 0);
  }

  function readDurationPart(input) {
    const value = input.value.trim();
    if (value === "") return 0;
    if (!/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  function normalizeDurationInputs(inputs, errorElement) {
    const [hoursInput, minutesInput, secondsInput] = inputs;
    const hours = readDurationPart(hoursInput);
    const minutes = readDurationPart(minutesInput);
    const seconds = readDurationPart(secondsInput);
    if ([hours, minutes, seconds].includes(null)) {
      errorElement.textContent = "作業時間は0以上の整数で入力してください";
      return null;
    }
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (!Number.isSafeInteger(totalSeconds) || totalSeconds > Number.MAX_SAFE_INTEGER / 1000) {
      errorElement.textContent = "作業時間の値が大きすぎます";
      return null;
    }
    hoursInput.value = String(Math.floor(totalSeconds / 3600));
    minutesInput.value = String(Math.floor((totalSeconds % 3600) / 60));
    secondsInput.value = String(totalSeconds % 60);
    errorElement.textContent = "";
    return totalSeconds * 1000;
  }

  function normalizeEditDurationInputs() {
    return normalizeDurationInputs(
      [elements.editHoursInput, elements.editMinutesInput, elements.editSecondsInput],
      elements.editHistoryError,
    );
  }

  function normalizeManualDurationInputs() {
    return normalizeDurationInputs(
      [elements.manualHoursInput, elements.manualMinutesInput, elements.manualSecondsInput],
      elements.manualHistoryError,
    );
  }

  function addManualHistory(event) {
    event.preventDefault();
    const taskName = resolveTaskName(elements.manualTaskInput.value);
    const recordDate = localDateKey();
    const startTime = elements.manualStartTimeInput.value;
    const endTime = elements.manualEndTimeInput.value;
    if ((startTime && !endTime) || (!startTime && endTime)) {
      elements.manualHistoryError.textContent = "時刻を指定する場合は開始と終了の両方を入力してください";
      return;
    }
    let durationMs;
    let startDate;
    let addedAt;
    if (startTime && endTime) {
      startDate = new Date(`${recordDate}T${startTime}`);
      const endDate = new Date(`${recordDate}T${endTime}`);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        elements.manualHistoryError.textContent = "開始時刻と終了時刻を正しく入力してください";
        return;
      }
      durationMs = endDate.getTime() - startDate.getTime();
      if (durationMs < 1000) {
        elements.manualHistoryError.textContent = "終了時刻は開始時刻より後にしてください";
        return;
      }
      addedAt = endDate.getTime();
    } else {
      durationMs = normalizeManualDurationInputs();
      if (durationMs === null) return;
      if (durationMs < 1000) {
        elements.manualHistoryError.textContent = "作業時間を1秒以上入力してください";
        return;
      }
      addedAt = now();
    }

    if (!taskName) {
      elements.manualHistoryError.textContent = "タスク名を入力してください";
      return;
    }
    const record = {
      id: `${addedAt}-${Math.random().toString(16).slice(2)}`,
      date: recordDate,
      taskName,
      memo: elements.manualMemoInput.value.trim().slice(0, 300),
      durationMs,
      mode: "manual",
      createdAt: new Date(addedAt).toISOString(),
    };
    if (startDate) record.firstStartedAt = startDate.toISOString();
    state.records.push(record);
    saveRecords();
    renderHistoryDateOptions(recordDate);
    renderHistory();
    elements.addHistoryDialog.close();
    elements.statusText.textContent = "作業履歴を追加しました";
  }

  function updateExportDurationFormatState() {
    const isDisabled = !elements.exportDurationInput.checked;
    elements.exportDurationFormatGroup.disabled = isDisabled;
    elements.exportDurationFormatGroup.classList.toggle("is-disabled", isDisabled);
  }

  function openExportHistoryDialog() {
    elements.exportHistoryError.textContent = "";
    updateExportDurationFormatState();
    elements.exportHistoryDialog.showModal();
  }

  function exportAllHistory(event) {
    event.preventDefault();
    const includeTimeRange = elements.exportTimeRangeInput.checked;
    const includeDuration = elements.exportDurationInput.checked;
    const includeMemo = elements.exportMemoInput.checked;
    if (!includeTimeRange && !includeDuration) {
      elements.exportHistoryError.textContent = "開始・終了時間または作業時間を1つ以上選択してください";
      return;
    }
    const hasExportableMemo = includeMemo && Object.values(dailyMemos).some((memo) => memo.trim());
    if (!state.records.length && !hasExportableMemo) {
      elements.exportHistoryError.textContent = "出力できる履歴または日別メモがありません";
      return;
    }
    const durationFormat = new FormData(elements.exportHistoryForm).get("export-duration-format");
    const recordsByDate = new Map();
    [...state.records]
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
      .forEach((record) => {
        if (!recordsByDate.has(record.date)) recordsByDate.set(record.date, []);
        recordsByDate.get(record.date).push(record);
      });
    const dates = [...new Set([
      ...recordsByDate.keys(),
      ...(includeMemo ? Object.keys(dailyMemos).filter((date) => dailyMemos[date].trim()) : []),
    ])].sort();
    const lines = ["Simple Timer 作業履歴", ""];
    dates.forEach((date) => {
      lines.push(date);
      if (includeMemo && dailyMemos[date]) {
        lines.push(`日別メモ: ${dailyMemos[date].replace(/\n/g, "\n  ")}`);
      }
      const records = recordsByDate.get(date) || [];
      if (records.length) {
        const headings = ["作業名"];
        if (includeTimeRange) headings.push("開始～終了");
        if (includeDuration) headings.push("作業時間");
        lines.push(headings.join("\t"));
        records.forEach((record) => {
          const columns = [record.taskName];
          if (includeTimeRange) columns.push(formatHistoryTimeRange(record) || "～");
          if (includeDuration) {
            columns.push(durationFormat === "clock"
              ? formatTime(record.durationMs)
              : `${Math.round(record.durationMs / 60000)}分`);
          }
          lines.push(columns.join("\t"));
          if (includeMemo && record.memo) lines.push(`  メモ: ${record.memo.replace(/\n/g, "\n    ")}`);
        });
      }
      lines.push("");
    });

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `simple-timer-history-${localDateKey()}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    elements.exportHistoryDialog.close();
    elements.statusText.textContent = "全履歴をTXT出力しました";
    showToast("選択した内容で履歴を出力しました");
  }

  function openPopupWindow() {
    const url = new URL(window.location.href);
    url.searchParams.set("popup", "1");
    const size = getPreferredPopupSize(window);
    const handle = window.open(url.toString(), "simpleTimerPopup", `popup=yes,width=${size.width},height=${size.height},left=120,top=120,resizable=yes,scrollbars=yes`);
    elements.statusText.textContent = handle ? "小窓を開きました" : "ポップアップがブロックされました";
    if (handle) handle.focus();
  }

  function toggleMinimized() {
    if (!isPopupContext()) return;
    const view = elements.app.ownerDocument.defaultView;
    if (!state.isMinimized) {
      preMinimizePopupSize = { width: view.innerWidth, height: view.innerHeight };
      cancelPendingPopupSizeSave();
      savePopupSize(preMinimizePopupSize, false);
      state.isMinimized = true;
      render();
      const minimizedSize = loadSavedMinimizedPopupSize() || calculateOptimalMinimizedPopupSize(view);
      const fittedMinimizedSize = fitPopupSizeToScreen(
        minimizedSize,
        view,
        MINIMIZED_POPUP_SIZE_LIMITS,
      );
      applyPopupSize(view, fittedMinimizedSize);
      view.setTimeout(() => {
        if (state.isMinimized && isPopupContext()) applyPopupSize(view, fittedMinimizedSize);
      }, 250);
      return;
    }
    const currentMinimizedSize = { width: view.innerWidth, height: view.innerHeight };
    cancelPendingPopupSizeSave();
    savePopupSize(currentMinimizedSize, true);
    state.isMinimized = false;
    render();
    const restoreSize = preMinimizePopupSize || loadSavedPopupSize() || calculateOptimalPopupSize(view);
    preMinimizePopupSize = null;
    applyPopupSize(view, fitPopupSizeToScreen(restoreSize, view));
  }

  async function openDocumentPictureInPicture() {
    const pip = window.documentPictureInPicture;
    if (!pip || typeof pip.requestWindow !== "function") return false;
    try {
      const preferredSize = getPreferredPopupSize(window);
      const pipWindow = await pip.requestWindow({
        ...preferredSize,
        preferInitialWindowPlacement: true,
      });
      const styleLink = pipWindow.document.createElement("link");
      styleLink.rel = "stylesheet"; styleLink.href = "./styles.css";
      pipWindow.document.head.append(styleLink);
      pipWindow.document.documentElement.dataset.theme = resolveTheme(getTheme());
      pipWindow.document.body.className = "is-popup";
      pipWindow.document.body.append(elements.app);
      popupFitSignature = "";
      scheduleFitPopupContent();
      pipWindow.document.addEventListener("keydown", handleKeyboard);
      suppressPopupSizeSaveUntil = now() + 1200;
      pipWindow.addEventListener("resize", () => {
        scheduleFitControlButtonText();
        popupFitSignature = "";
        scheduleFitPopupContent();
        schedulePopupSizeSave(pipWindow);
      });
      const applyPreferredSize = () => {
        if (state.isMinimized || elements.app.ownerDocument !== pipWindow.document) return;
        applyPopupSize(pipWindow, fitPopupSizeToScreen(preferredSize, pipWindow));
      };
      styleLink.addEventListener("load", () => pipWindow.requestAnimationFrame(applyPreferredSize), { once: true });
      pipWindow.requestAnimationFrame(() => pipWindow.requestAnimationFrame(applyPreferredSize));
      pipWindow.addEventListener("pagehide", () => {
        state.isMinimized = false;
        preMinimizePopupSize = null;
        elements.app.style.zoom = "";
        elements.app.style.width = "";
        elements.app.style.maxWidth = "";
        popupFitSignature = "";
        document.body.classList.toggle("is-popup", new URLSearchParams(location.search).has("popup"));
        document.body.append(elements.app); render();
      });
      return true;
    } catch { return false; }
  }

  async function openCompactWindow() { if (!(await openDocumentPictureInPicture())) openPopupWindow(); }

  async function cyclePopupDisplay() {
    if (!isPopupContext()) {
      await openCompactWindow();
      return;
    }
    toggleMinimized();
  }

  function handleKeyboard(event) {
    if (pendingNewDateKey) return;
    const key = event.key.toLowerCase();
    const hasOpenDialog = Boolean(elements.app.ownerDocument.querySelector("dialog[open]"));
    const hasOpenConfirmation = isResetConfirmOpen() || isTimerNavigationConfirmOpen() ||
      isModeSwitchConfirmOpen() || isTimerTabConfirmOpen() || isDeleteConfirmOpen();
    if (event.ctrlKey && !event.altKey && !event.shiftKey && key === "enter") {
      const form = event.target.closest?.("#task-dialog-form, #edit-history-form");
      if (form) {
        event.preventDefault();
        form.requestSubmit();
      } else if (!hasOpenDialog && !hasOpenConfirmation) {
        event.preventDefault();
        openTaskDialog(false);
      }
      return;
    }
    const isAddTimerShortcut = !event.metaKey && !event.ctrlKey && event.altKey && event.shiftKey && event.code === "KeyT";
    if (isAddTimerShortcut) {
      if (!hasOpenDialog && !hasOpenConfirmation) {
        event.preventDefault();
        addTimerTab();
      }
      return;
    }
    const isHistoryShortcut = !event.metaKey && !event.ctrlKey && event.altKey && event.shiftKey && event.code === "KeyH";
    if (isHistoryShortcut) {
      if (!hasOpenDialog && !hasOpenConfirmation) {
        event.preventDefault();
        openHistoryDialog();
      }
      return;
    }
    if (isResetConfirmOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeResetConfirm();
      }
      return;
    }
    if (isTimerNavigationConfirmOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTimerNavigationConfirm();
      }
      return;
    }
    if (isModeSwitchConfirmOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModeSwitchConfirm();
      }
      return;
    }
    if (isTimerTabConfirmOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTimerTabConfirm();
      }
      return;
    }
    if (isDeleteConfirmOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDeleteConfirm();
      }
      return;
    }
    if (!hasOpenDialog && !event.ctrlKey && !event.metaKey && event.altKey && event.shiftKey && key === "tab") {
      event.preventDefault();
      selectNextTimerTab();
      return;
    }
    const isMoveTabShortcut = !hasOpenDialog && !event.ctrlKey && !event.metaKey && event.altKey && event.shiftKey &&
      (event.code === "ArrowLeft" || event.code === "ArrowRight");
    if (isMoveTabShortcut) {
      event.preventDefault();
      selectAdjacentTimerTab(event.code === "ArrowLeft" ? -1 : 1);
      return;
    }
    const isDeleteTabShortcut = !hasOpenDialog && !event.ctrlKey && !event.metaKey && event.altKey && event.shiftKey &&
      (key === "delete" || key === "backspace" || event.code === "KeyD");
    if (isDeleteTabShortcut) {
      event.preventDefault();
      closeTimerTab(state.activeTimerId);
      return;
    }
    const isPopupShortcut = !hasOpenDialog && !event.ctrlKey && !event.metaKey && event.altKey && event.shiftKey &&
      event.code === "KeyS";
    if (isPopupShortcut) {
      event.preventDefault();
      cyclePopupDisplay();
      return;
    }
    if (["input", "textarea", "button"].includes(event.target.tagName.toLowerCase()) || elements.app.ownerDocument.querySelector("dialog[open]")) return;
    if (event.code === "Space") {
      event.preventDefault();
      toggleTimer();
    }
    else if (key === "r") requestResetOrFinishBreak();
  }

  function bindEvents() {
    elements.resetPreviousDayButton.addEventListener("click", resetPreviousDayWork);
    elements.recordPreviousDayButton.addEventListener("click", recordPreviousDayWork);
    elements.timerTabList.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-close-timer-id]");
      if (closeButton) {
        closeTimerTab(closeButton.dataset.closeTimerId);
        return;
      }
      const selectButton = event.target.closest("[data-timer-id]");
      if (selectButton) selectTimerTab(selectButton.dataset.timerId);
    });
    elements.addTimerTabButton.addEventListener("click", addTimerTab);
    elements.settingsButton.addEventListener("click", openSettingsDialog);
    elements.defaultModeSelect.addEventListener("change", () => {
      if (!Object.values(MODES).includes(elements.defaultModeSelect.value)) return;
      localStorage.setItem(DEFAULT_MODE_KEY, elements.defaultModeSelect.value);
      if (!state.hasStarted && !state.isRunning && state.elapsedBeforeStartMs === 0) {
        state.mode = elements.defaultModeSelect.value;
        state.countdownSessionStartElapsedMs = 0;
        state.finishedAt = 0;
        saveState();
        render();
      }
      showToast("新しいタイマーの初期モードを変更しました");
    });
    elements.aggregationEnabledInput.addEventListener("change", () => {
      localStorage.setItem(AGGREGATION_ENABLED_KEY, String(elements.aggregationEnabledInput.checked));
      if (elements.historyDialog.open) renderHistory();
      showToast(elements.aggregationEnabledInput.checked ? "高度な計測を有効にしました" : "高度な計測を無効にしました");
    });
    elements.themeSelect.addEventListener("change", () => {
      const theme = elements.themeSelect.value;
      if (!["system", "light", "dark"].includes(theme)) return;
      if (theme === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
      showToast("表示テーマを変更しました");
    });
    elements.primaryTimeDisplaySelect.addEventListener("change", () => {
      const value = elements.primaryTimeDisplaySelect.value;
      if (!["measurement", "clock"].includes(value)) return;
      localStorage.setItem(PRIMARY_TIME_DISPLAY_KEY, value);
      render();
      showToast(value === "measurement" ? "計測時間を大きく表示します" : "現在時刻を大きく表示します");
    });
    elements.timeDisplayArea.addEventListener("click", togglePrimaryTimeDisplay);
    elements.timeDisplay.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePrimaryTimeDisplay();
    });
    elements.timeDisplayArea.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      togglePrimaryTimeDisplay();
    });
    elements.secondaryTimeDisplay.addEventListener("click", togglePrimaryTimeDisplay);
    elements.secondaryTimeDisplay.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      togglePrimaryTimeDisplay();
    });
    elements.cumulativeTimeDisplay.addEventListener("click", togglePrimaryTimeDisplay);
    elements.cumulativeTimeDisplay.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      togglePrimaryTimeDisplay();
    });
    elements.toastUndoButton.addEventListener("click", () => {
      const action = toastUndoAction;
      toastUndoAction = null;
      elements.toastUndoButton.hidden = true;
      if (action) action();
    });
    elements.resetPopupSizeButton.addEventListener("click", resetPopupSize);
    elements.resetMinimizedPopupSizeButton.addEventListener("click", resetMinimizedPopupSize);
    elements.backupExportButton.addEventListener("click", exportBackup);
    elements.backupImportButton.addEventListener("click", () => elements.backupFileInput.click());
    elements.backupFileInput.addEventListener("change", importBackup);
    elements.cancelTimerNavigationButton.addEventListener("click", closeTimerNavigationConfirm);
    elements.confirmTimerNavigationButton.addEventListener("click", confirmTimerNavigation);
    elements.timerNavigationConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.timerNavigationConfirmOverlay) closeTimerNavigationConfirm();
    });
    elements.cancelModeSwitchButton.addEventListener("click", closeModeSwitchConfirm);
    elements.confirmModeSwitchButton.addEventListener("click", confirmModeSwitch);
    elements.modeSwitchConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.modeSwitchConfirmOverlay) closeModeSwitchConfirm();
    });
    elements.cancelTimerTabDeleteButton.addEventListener("click", closeTimerTabConfirm);
    elements.confirmTimerTabDeleteButton.addEventListener("click", confirmCloseTimerTab);
    elements.timerTabConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.timerTabConfirmOverlay) closeTimerTabConfirm();
    });
    elements.modeTabs.forEach((tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode)));
    elements.pomodoroEnabledInput.addEventListener("change", () => {
      const remainingMs = getDisplayMs();
      const wasRunning = state.isRunning;
      freezeRunningTimer();
      state.pomodoroEnabled = elements.pomodoroEnabledInput.checked;
      state.pomodoroBreakDurationMs =
        Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) * 60000;
      if (state.pomodoroEnabled) {
        state.pomodoroPhase = "work";
        state.pomodoroPhaseElapsedBeforeStartMs =
          Math.max(0, state.countdownDurationMs - remainingMs);
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
      showToast(state.pomodoroEnabled
        ? "残り時間を維持してポモドーロを有効にしました"
        : "残り時間を維持してポモドーロを無効にしました");
    });
    elements.pomodoroBreakInput.addEventListener("change", () => {
      state.pomodoroBreakDurationMs =
        Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) * 60000;
      syncInputsFromDuration();
      saveState();
    });
    elements.countdownDurationButton.addEventListener("click", () => {
      syncInputsFromDuration();
      elements.untilTimeStatus.textContent = "指定時刻までの時間を自動計算します。";
      elements.countdownDurationDialog.showModal();
      window.setTimeout(() => elements.hoursInput.focus(), 0);
    });
    elements.countdownDurationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      setCountdownDuration(getDurationFromInputs() / 1000);
      elements.countdownDurationDialog.close();
      showToast("カウントダウン時間を変更しました");
    });
    elements.countdownDurationDialog.addEventListener("close", syncInputsFromDuration);
    elements.applyUntilTimeButton.addEventListener("click", applyUntilTimeToInputs);
    elements.presetButtons.forEach((button) => button.addEventListener("click", () => {
      setCountdownDurationInputs(Number.parseInt(button.dataset.seconds, 10));
    }));
    elements.taskButton.addEventListener("click", () => openTaskDialog(false));
    elements.taskDialogForm.addEventListener("submit", (event) => {
      event.preventDefault();
      setTask(elements.taskInput.value, elements.taskMemoInput.value);
      if (!state.taskName) return;
      const shouldRecord = pendingRecordAfterTaskInput;
      pendingRecordAfterTaskInput = false;
      elements.taskDialog.close();
      if (shouldRecord) moveToNextTask();
    });
    elements.taskDialog.addEventListener("close", () => { pendingRecordAfterTaskInput = false; });
    elements.historyButton.addEventListener("click", openHistoryDialog);
    elements.historyDialog.addEventListener("cancel", (event) => {
      if (!canCloseHistoryWithMemo()) event.preventDefault();
    });
    elements.historyDialog.addEventListener("close", () => {
      if (dailyMemoDirty) saveDailyMemoNow(false);
      if (isDeleteConfirmOpen()) closeDeleteConfirm();
    });
    elements.historyDate.addEventListener("change", renderHistory);
    elements.dailyMemoInput.addEventListener("input", scheduleDailyMemoSave);
    elements.unitButtons.forEach((button) => button.addEventListener("click", () => { state.historyUnit = button.dataset.unit; renderHistory(); }));
    elements.addHistoryButton.addEventListener("click", openAddHistoryDialog);
    elements.addHistoryForm.addEventListener("submit", addManualHistory);
    [elements.manualHoursInput, elements.manualMinutesInput, elements.manualSecondsInput]
      .forEach((input) => input.addEventListener("change", normalizeManualDurationInputs));
    [elements.editHoursInput, elements.editMinutesInput, elements.editSecondsInput]
      .forEach((input) => input.addEventListener("change", normalizeEditDurationInputs));
    elements.editHistoryForm.addEventListener("submit", updateHistoryRecord);
    elements.resumeHistoryButton.addEventListener("click", resumeFromHistory);
    elements.cancelResumeHistoryButton.addEventListener("click", () => elements.resumeHistoryConfirmDialog.close());
    elements.confirmResumeHistoryButton.addEventListener("click", confirmResumeFromHistory);
    elements.editHistoryDialog.addEventListener("close", () => { editingRecord = null; });
    elements.editDeleteButton.addEventListener("click", () => {
      if (!editingRecord) return;
      const record = editingRecord;
      elements.editHistoryDialog.close();
      deleteHistoryRecord(record);
    });
    elements.exportHistoryButton.addEventListener("click", openExportHistoryDialog);
    elements.exportDurationInput.addEventListener("change", updateExportDurationFormatState);
    elements.exportHistoryForm.addEventListener("submit", exportAllHistory);
    elements.cancelDeleteButton.addEventListener("click", closeDeleteConfirm);
    elements.confirmDeleteButton.addEventListener("click", confirmDeleteHistoryRecord);
    elements.confirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.confirmOverlay) closeDeleteConfirm();
    });
    elements.closeDialogButtons.forEach((button) => button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog === elements.historyDialog && !canCloseHistoryWithMemo()) return;
      dialog.close();
    }));
    elements.startPauseButton.addEventListener("pointerdown", handleTimerPointerDown);
    elements.startPauseButton.addEventListener("click", handleTimerClick);
    elements.compactStartPauseButton.addEventListener("pointerdown", handleTimerPointerDown);
    elements.compactStartPauseButton.addEventListener("click", handleTimerClick);
    elements.resetButton.addEventListener("click", requestResetOrFinishBreak);
    elements.cancelResetButton.addEventListener("click", closeResetConfirm);
    elements.confirmResetButton.addEventListener("click", confirmResetTimer);
    elements.resetConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.resetConfirmOverlay) closeResetConfirm();
    });
    elements.nextTaskButton.addEventListener("click", moveToNextTask);
    elements.popupButton.addEventListener("click", openCompactWindow);
    elements.minimizeButton.addEventListener("click", toggleMinimized);
    document.addEventListener("keydown", handleKeyboard);
    window.addEventListener("resize", scheduleFitControlButtonText);
    window.addEventListener("resize", () => {
      popupFitSignature = "";
      scheduleFitPopupContent();
      schedulePopupSizeSave(window);
    });
    window.addEventListener("beforeunload", (event) => {
      if (!hasStartedTimer() && !dailyMemoDirty) return;
      saveState();
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function initialize() {
    applyTheme();
    if (localStorage.getItem(DEFAULT_MODE_KEY) === "pomodoro") {
      localStorage.setItem(DEFAULT_MODE_KEY, MODES.COUNTDOWN);
    }
    loadState();
    loadDailyMemos();
    const isPopup = new URLSearchParams(location.search).has("popup");
    elements.body.classList.toggle("is-popup", isPopup);
    if (isPopup) suppressPopupSizeSaveUntil = now() + 1200;
    syncInputsFromDuration();
    bindEvents();
    updateDateTime();
    startDateTimeUpdates();
    render();
    if (isPopup) {
      window.requestAnimationFrame(() => applyPopupSize(window, getPreferredPopupSize(window)));
    }
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        showToast("オフライン機能を準備できませんでした");
      });
    }
    window.addEventListener("offline", () => showToast("オフラインになりました。保存済みの機能を利用できます"));
    window.addEventListener("online", () => showToast("オンラインに戻りました"));
    window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (getTheme() === "system") applyTheme("system");
    });
  }

  initialize();
})();
