(() => {
  // src/core/constants.js
  var STORAGE_KEY = "simple-timer-state";
  var TODOS_KEY = "simple-timer-todos";
  var RECORDS_KEY = "simple-timer-records";
  var POPUP_SIZE_KEY = "simple-timer-popup-size";
  var MINIMIZED_POPUP_SIZE_KEY = "simple-timer-minimized-popup-size";
  var DEFAULT_MODE_KEY = "simple-timer-default-mode";
  var AGGREGATION_ENABLED_KEY = "simple-timer-aggregation-enabled";
  var DAILY_MEMOS_KEY = "simple-timer-daily-memos";
  var WORKDAY_TIMES_KEY = "simple-timer-workday-times";
  var THEME_KEY = "simple-timer-theme";
  var PRIMARY_TIME_DISPLAY_KEY = "simple-timer-primary-time-display";
  var DEFAULT_TIME_FORMAT_KEY = "simple-timer-default-time-format";
  var FINISH_SOUND_VOLUME_KEY = "simple-timer-finish-sound-volume";
  var BACKUP_FORMAT = "simple-timer-backup";
  var BACKUP_VERSION = 1;
  var BACKUP_STORAGE_KEYS = [
    STORAGE_KEY,
    RECORDS_KEY,
    TODOS_KEY,
    POPUP_SIZE_KEY,
    MINIMIZED_POPUP_SIZE_KEY,
    DEFAULT_MODE_KEY,
    AGGREGATION_ENABLED_KEY,
    DAILY_MEMOS_KEY,
    WORKDAY_TIMES_KEY,
    THEME_KEY,
    PRIMARY_TIME_DISPLAY_KEY,
    DEFAULT_TIME_FORMAT_KEY,
    FINISH_SOUND_VOLUME_KEY
  ];
  var MODES = { COUNTDOWN: "countdown", STOPWATCH: "stopwatch" };
  var DEFAULT_COUNTDOWN_SECONDS = 25 * 60;
  var DEFAULT_POMODORO_BREAK_MS = 5 * 60 * 1e3;
  var TICK_INTERVAL_MS = 250;
  var POPUP_SIZE_LIMITS = {
    minWidth: 320,
    maxWidth: 720,
    minHeight: 120,
    maxHeight: 900
  };
  var MINIMIZED_POPUP_SIZE_LIMITS = {
    minWidth: 160,
    maxWidth: 720,
    minHeight: 72,
    maxHeight: 900
  };
  var OPTIMAL_POPUP_MIN_HEIGHT = 360;

  // src/features/history/state.js
  var historySession = {
    pendingDeleteRecordId: "",
    pendingDeleteRecord: null,
    editingRecord: null,
    pendingDurationConflict: null,
    previousManualTimeRangeDurationMs: null,
    previousEditTimeRangeDurationMs: null,
    editTimingSnapshot: null,
    confirmPreviousFocus: null,
    dailyMemos: {},
    workdayTimes: {},
    workSummaryDateKey: "",
    workSummaryUnit: "minutes",
    dailyMemoSaveId: 0,
    dailyMemoDirty: false,
    dailyMemoEditingDate: "",
    activeTaskMemoName: "",
    activeTaskMemoRecords: [],
    timeInputsPendingPicker: /* @__PURE__ */ new WeakSet()
  };

  // src/features/popup/state.js
  var popupSession = {
    fitButtonsFrame: 0,
    popupResizeSaveId: 0,
    suppressPopupSizeSaveUntil: 0,
    preMinimizePopupSize: null,
    popupFitFrame: 0,
    popupFitSignature: ""
  };

  // src/core/state.js
  var state = {
    mode: MODES.COUNTDOWN,
    isRunning: false,
    startedAt: 0,
    elapsedBeforeStartMs: 0,
    countdownSessionStartElapsedMs: 0,
    countdownDurationMs: DEFAULT_COUNTDOWN_SECONDS * 1e3,
    pomodoroEnabled: false,
    pomodoroPhase: "work",
    pomodoroPhaseElapsedBeforeStartMs: 0,
    pomodoroBreakDurationMs: DEFAULT_POMODORO_BREAK_MS,
    pomodoroPlannedBreakCount: -1,
    pomodoroCompletedBreakCount: 0,
    pomodoroFinalWorkDurationMs: 0,
    taskName: "",
    taskMemo: "",
    firstStartedAt: 0,
    resumedRecordId: "",
    finishedAt: 0,
    hasStarted: false,
    isMinimized: false,
    records: [],
    historyUnit: "minutes",
    timerTabs: [],
    activeTimerId: "",
    nextTimerNumber: 1
  };

  // src/shared/time.js
  function localDateKey(date = /* @__PURE__ */ new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function formatHistoryDateLabel(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const label = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(date);
    return dateKey === localDateKey() ? `${label}\uFF08\u672C\u65E5\uFF09` : label;
  }
  function now() {
    return Date.now();
  }
  function normalizeSeconds(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }
  function formatTime(milliseconds, rounding = "floor") {
    const totalSeconds = Math.max(
      0,
      (rounding === "ceil" ? Math.ceil : Math.floor)(milliseconds / 1e3)
    );
    const parts = [
      Math.floor(totalSeconds / 3600),
      Math.floor(totalSeconds % 3600 / 60),
      totalSeconds % 60
    ];
    return parts.map((part) => String(part).padStart(2, "0")).join(":");
  }
  function formatDurationForUnit(milliseconds, unit = "minutes") {
    if (unit === "minutes") return `${Math.round(milliseconds / 6e4)}\u5206`;
    return formatTime(milliseconds);
  }
  function formatHistoryClock(date) {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }
  function formatHistoryTimeRange(record) {
    const addedAt = new Date(record.createdAt);
    if (Number.isNaN(addedAt.getTime())) return "";
    const storedStartedAt = new Date(record.firstStartedAt);
    return Number.isNaN(storedStartedAt.getTime()) ? `\uFF5E${formatHistoryClock(addedAt)}` : `${formatHistoryClock(storedStartedAt)}\uFF5E${formatHistoryClock(addedAt)}`;
  }
  function calculateWorkDurationMs(clockIn, clockOut) {
    if (!/^\d{2}:\d{2}$/.test(clockIn) || !/^\d{2}:\d{2}$/.test(clockOut))
      return null;
    const [inHours, inMinutes] = clockIn.split(":").map(Number);
    const [outHours, outMinutes] = clockOut.split(":").map(Number);
    let minutes = outHours * 60 + outMinutes - (inHours * 60 + inMinutes);
    if (minutes < 0) minutes += 24 * 60;
    return minutes * 6e4;
  }
  function calculateTimeRangeDuration(recordDate, startTime, endTime) {
    if (!startTime || !endTime) return null;
    const startDate = /* @__PURE__ */ new Date(`${recordDate}T${startTime}`);
    const endDate = /* @__PURE__ */ new Date(`${recordDate}T${endTime}`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
      return null;
    if (startDate.getTime() > endDate.getTime())
      startDate.setDate(startDate.getDate() - 1);
    const durationMs = endDate.getTime() - startDate.getTime();
    return Number.isSafeInteger(durationMs) && durationMs >= 1e3 ? durationMs : null;
  }
  function formatTimeInputValue(date) {
    return [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, "0")).join(":");
  }

  // src/ui/elements.js
  var elements = {
    todoButton: document.querySelector("#todo-button"),
    todoDialog: document.querySelector("#todo-dialog"),
    todoCloseButton: document.querySelector("#close-todo-button"),
    todoForm: document.querySelector("#todo-form"),
    todoText: document.querySelector("#todo-text"),
    todoDue: document.querySelector("#todo-due"),
    todoList: document.querySelector("#todo-list"),
    body: document.body,
    app: document.querySelector(".app"),
    appTitle: document.querySelector("#app-title"),
    panel: document.querySelector(".timer-panel"),
    historyResumeIndicator: document.querySelector("#history-resume-indicator"),
    statusText: document.querySelector("#status-text"),
    recordDate: document.querySelector("#record-date"),
    timeDisplayArea: document.querySelector("#time-display-area"),
    secondaryTimeDisplay: document.querySelector("#secondary-time-display"),
    toast: document.querySelector("#toast"),
    toastMessage: document.querySelector("#toast-message"),
    toastUndoButton: document.querySelector("#toast-undo-button"),
    previousDayConfirmOverlay: document.querySelector(
      "#previous-day-confirm-overlay"
    ),
    previousDayConfirmMessage: document.querySelector(
      "#previous-day-confirm-message"
    ),
    resetPreviousDayButton: document.querySelector("#reset-previous-day-button"),
    recordPreviousDayButton: document.querySelector(
      "#record-previous-day-button"
    ),
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
    minimizedPopupSizeStatus: document.querySelector(
      "#minimized-popup-size-status"
    ),
    resetMinimizedPopupSizeButton: document.querySelector(
      "#reset-minimized-popup-size-button"
    ),
    defaultModeSelect: document.querySelector("#default-mode-select"),
    aggregationEnabledInput: document.querySelector("#aggregation-enabled-input"),
    pastHistoryEditInput: document.querySelector("#past-history-edit-input"),
    pastHistoryEditStatus: document.querySelector("#past-history-edit-status"),
    themeSelect: document.querySelector("#theme-select"),
    primaryTimeDisplaySelect: document.querySelector(
      "#primary-time-display-select"
    ),
    defaultTimeFormatSelect: document.querySelector(
      "#default-time-format-select"
    ),
    finishSoundVolumeInput: document.querySelector("#finish-sound-volume-input"),
    finishSoundVolumeNumberInput: document.querySelector(
      "#finish-sound-volume-number-input"
    ),
    previewFinishSoundButton: document.querySelector(
      "#preview-finish-sound-button"
    ),
    backupExportButton: document.querySelector("#backup-export-button"),
    backupImportButton: document.querySelector("#backup-import-button"),
    backupFileInput: document.querySelector("#backup-file-input"),
    backupStatus: document.querySelector("#backup-status"),
    backupImportModeDialog: document.querySelector("#backup-import-mode-dialog"),
    backupImportSummary: document.querySelector("#backup-import-summary"),
    cancelBackupImportButton: document.querySelector(
      "#cancel-backup-import-button"
    ),
    replaceBackupImportButton: document.querySelector(
      "#replace-backup-import-button"
    ),
    mergeBackupImportButton: document.querySelector(
      "#merge-backup-import-button"
    ),
    timerTabList: document.querySelector("#timer-tab-list"),
    addTimerTabButton: document.querySelector("#add-timer-tab-button"),
    timerTabConfirmOverlay: document.querySelector("#timer-tab-confirm-overlay"),
    timerTabConfirmMessage: document.querySelector("#timer-tab-confirm-message"),
    cancelTimerTabDeleteButton: document.querySelector(
      "#cancel-timer-tab-delete-button"
    ),
    confirmTimerTabDeleteButton: document.querySelector(
      "#confirm-timer-tab-delete-button"
    ),
    modeSwitchConfirmOverlay: document.querySelector(
      "#mode-switch-confirm-overlay"
    ),
    modeSwitchConfirmMessage: document.querySelector(
      "#mode-switch-confirm-message"
    ),
    cancelModeSwitchButton: document.querySelector("#cancel-mode-switch-button"),
    confirmModeSwitchButton: document.querySelector(
      "#confirm-mode-switch-button"
    ),
    timerNavigationConfirmOverlay: document.querySelector(
      "#timer-navigation-confirm-overlay"
    ),
    timerNavigationConfirmMessage: document.querySelector(
      "#timer-navigation-confirm-message"
    ),
    cancelTimerNavigationButton: document.querySelector(
      "#cancel-timer-navigation-button"
    ),
    confirmTimerNavigationButton: document.querySelector(
      "#confirm-timer-navigation-button"
    ),
    modeTabs: Array.from(document.querySelectorAll(".mode-tab")),
    countdownSettings: document.querySelector("#countdown-settings"),
    pomodoroEnabledInput: document.querySelector("#pomodoro-enabled-input"),
    pomodoroBreakSettings: document.querySelector("#pomodoro-break-settings"),
    pomodoroBreakInput: document.querySelector("#pomodoro-break-input"),
    pomodoroPhaseDisplay: document.querySelector("#pomodoro-phase-display"),
    countdownDurationButton: document.querySelector("#countdown-duration-button"),
    countdownDurationDisplay: document.querySelector(
      "#countdown-duration-display"
    ),
    countdownDurationDialog: document.querySelector("#countdown-duration-dialog"),
    countdownDurationForm: document.querySelector("#countdown-duration-form"),
    countdownDialogPomodoroInput: document.querySelector(
      "#countdown-dialog-pomodoro-input"
    ),
    untilTimeInput: document.querySelector("#until-time-input"),
    applyUntilTimeButton: document.querySelector("#apply-until-time-button"),
    untilTimeStatus: document.querySelector("#until-time-status"),
    untilTimePomodoroHelp: document.querySelector("#until-time-pomodoro-help"),
    untilTimePomodoroSettings: document.querySelector(
      "#until-time-pomodoro-settings"
    ),
    untilTimeBreakInput: document.querySelector("#until-time-break-input"),
    hoursInput: document.querySelector("#hours-input"),
    minutesInput: document.querySelector("#minutes-input"),
    secondsInput: document.querySelector("#seconds-input"),
    countdownWorkDurationLegend: document.querySelector(
      "#countdown-work-duration-legend"
    ),
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
    historyDateInput: document.querySelector("#history-date-input"),
    historyDatePickerField: document.querySelector("#history-date-picker-field"),
    historyDateContext: document.querySelector("#history-date-context"),
    historyHelp: document.querySelector("#history-help"),
    historyList: document.querySelector("#history-list"),
    historySummary: document.querySelector("#history-summary"),
    taskMemoDialog: document.querySelector("#task-memo-dialog"),
    taskMemoTitle: document.querySelector("#task-memo-title"),
    taskMemoCount: document.querySelector("#task-memo-count"),
    taskMemoTotal: document.querySelector("#task-memo-total"),
    taskMemoList: document.querySelector("#task-memo-list"),
    workSummaryDialog: document.querySelector("#work-summary-dialog"),
    workSummaryDate: document.querySelector("#work-summary-date"),
    workSummaryUnitButtons: Array.from(
      document.querySelectorAll(".work-summary-unit-button")
    ),
    clockInInput: document.querySelector("#clock-in-input"),
    clockOutInput: document.querySelector("#clock-out-input"),
    breakTimeInput: document.querySelector("#break-time-input"),
    workSummaryEditStatus: document.querySelector("#work-summary-edit-status"),
    workDurationValue: document.querySelector("#work-duration-value"),
    measuredDurationValue: document.querySelector("#measured-duration-value"),
    workDifferenceValue: document.querySelector("#work-difference-value"),
    workSummaryTaskTable: document.querySelector("#work-summary-task-table"),
    dailyMemoInput: document.querySelector("#daily-memo-input"),
    dailyMemoStatus: document.querySelector("#daily-memo-status"),
    addHistoryButton: document.querySelector("#add-history-button"),
    exportHistoryButton: document.querySelector("#export-history-button"),
    exportHistoryDialog: document.querySelector("#export-history-dialog"),
    exportHistoryForm: document.querySelector("#export-history-form"),
    exportDurationFormatGroup: document.querySelector(
      "#export-duration-format-group"
    ),
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
    editHistoryTitle: document.querySelector("#edit-history-title"),
    editTaskInput: document.querySelector("#edit-task-input"),
    editMemoInput: document.querySelector("#edit-memo-input"),
    editStartTimeInput: document.querySelector("#edit-start-time-input"),
    editEndTimeInput: document.querySelector("#edit-end-time-input"),
    editHoursInput: document.querySelector("#edit-hours-input"),
    editMinutesInput: document.querySelector("#edit-minutes-input"),
    editSecondsInput: document.querySelector("#edit-seconds-input"),
    editHistoryError: document.querySelector("#edit-history-error"),
    editDeleteButton: document.querySelector("#edit-delete-button"),
    editHistorySubmitButton: document.querySelector(
      "#edit-history-submit-button"
    ),
    confirmOverlay: document.querySelector("#confirm-overlay"),
    confirmMessage: document.querySelector("#confirm-message"),
    cancelDeleteButton: document.querySelector("#cancel-delete-button"),
    confirmDeleteButton: document.querySelector("#confirm-delete-button"),
    unitButtons: Array.from(document.querySelectorAll(".unit-button")),
    closeDialogButtons: Array.from(document.querySelectorAll(".close-dialog")),
    startPauseButton: document.querySelector("#start-pause-button"),
    compactStartPauseButton: document.querySelector(
      "#compact-start-pause-button"
    ),
    resetButton: document.querySelector("#reset-button"),
    resetConfirmOverlay: document.querySelector("#reset-confirm-overlay"),
    resetConfirmMessage: document.querySelector("#reset-confirm-message"),
    cancelResetButton: document.querySelector("#cancel-reset-button"),
    confirmResetButton: document.querySelector("#confirm-reset-button"),
    nextTaskButton: document.querySelector("#next-task-button"),
    resumeHistoryButton: document.querySelector("#resume-history-button"),
    resumeHistoryConfirmDialog: document.querySelector(
      "#resume-history-confirm-dialog"
    ),
    resumeHistoryConfirmMessage: document.querySelector(
      "#resume-history-confirm-message"
    ),
    cancelResumeHistoryButton: document.querySelector(
      "#cancel-resume-history-button"
    ),
    confirmResumeHistoryButton: document.querySelector(
      "#confirm-resume-history-button"
    ),
    durationConflictDialog: document.querySelector("#duration-conflict-dialog"),
    durationConflictMessage: document.querySelector("#duration-conflict-message"),
    cancelDurationConflictButton: document.querySelector(
      "#cancel-duration-conflict-button"
    ),
    useEnteredDurationButton: document.querySelector(
      "#use-entered-duration-button"
    ),
    useTimeRangeDurationButton: document.querySelector(
      "#use-time-range-duration-button"
    )
  };

  // src/features/history/duration.js
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
      errorElement.textContent = "\u4F5C\u696D\u6642\u9593\u306F0\u4EE5\u4E0A\u306E\u6574\u6570\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      return null;
    }
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (!Number.isSafeInteger(totalSeconds) || totalSeconds > Number.MAX_SAFE_INTEGER / 1e3) {
      errorElement.textContent = "\u4F5C\u696D\u6642\u9593\u306E\u5024\u304C\u5927\u304D\u3059\u304E\u307E\u3059";
      return null;
    }
    setDurationInputValues(inputs, totalSeconds * 1e3);
    errorElement.textContent = "";
    return totalSeconds * 1e3;
  }
  function normalizeEditDurationInputs() {
    return normalizeDurationInputs(
      [
        elements.editHoursInput,
        elements.editMinutesInput,
        elements.editSecondsInput
      ],
      elements.editHistoryError
    );
  }
  function normalizeManualDurationInputs() {
    return normalizeDurationInputs(
      [
        elements.manualHoursInput,
        elements.manualMinutesInput,
        elements.manualSecondsInput
      ],
      elements.manualHistoryError
    );
  }
  function setDurationInputValues(inputs, durationMs) {
    const totalSeconds = Math.floor(durationMs / 1e3);
    inputs[0].value = String(Math.floor(totalSeconds / 3600));
    inputs[1].value = String(Math.floor(totalSeconds % 3600 / 60));
    inputs[2].value = String(totalSeconds % 60);
  }
  function readDurationInputValues(inputs) {
    const parts = inputs.map(readDurationPart);
    if (parts.includes(null)) return null;
    const totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    return Number.isSafeInteger(totalSeconds) ? totalSeconds * 1e3 : null;
  }
  function syncDurationAfterTimeRangeChange(kind) {
    const isManual = kind === "manual";
    const timeInputs = isManual ? [elements.manualStartTimeInput, elements.manualEndTimeInput] : [elements.editStartTimeInput, elements.editEndTimeInput];
    const durationInputs = isManual ? [
      elements.manualHoursInput,
      elements.manualMinutesInput,
      elements.manualSecondsInput
    ] : [
      elements.editHoursInput,
      elements.editMinutesInput,
      elements.editSecondsInput
    ];
    const recordDate = isManual ? elements.manualDate.value : historySession.editingRecord?.date;
    const nextDurationMs = calculateTimeRangeDuration(
      recordDate,
      timeInputs[0].value,
      timeInputs[1].value
    );
    if (nextDurationMs === null) return;
    const enteredDurationMs = readDurationInputValues(durationInputs);
    const previousDurationMs = isManual ? historySession.previousManualTimeRangeDurationMs : historySession.previousEditTimeRangeDurationMs;
    if (enteredDurationMs === 0 || enteredDurationMs === previousDurationMs) {
      setDurationInputValues(durationInputs, nextDurationMs);
    }
    if (isManual)
      historySession.previousManualTimeRangeDurationMs = nextDurationMs;
    else historySession.previousEditTimeRangeDurationMs = nextDurationMs;
  }
  function fillCurrentTimeIfEmpty(input) {
    if (input.disabled || input.readOnly || input.value) return;
    input.value = formatTimeInputValue(/* @__PURE__ */ new Date());
    const view = input.ownerDocument.defaultView || window;
    input.dispatchEvent(new view.Event("input", { bubbles: true }));
  }
  function openTimePicker(input) {
    if (input.disabled || input.readOnly) return;
    input.focus({ preventScroll: true });
    if (typeof input.showPicker !== "function") return;
    try {
      input.showPicker();
    } catch {
    }
  }
  function parseHistoryTimeRange(recordDate, startTime, endTime, errorElement) {
    if (!startTime && !endTime) return false;
    if (!startTime || !endTime) {
      errorElement.textContent = "\u6642\u523B\u3092\u6307\u5B9A\u3059\u308B\u5834\u5408\u306F\u958B\u59CB\u3068\u7D42\u4E86\u306E\u4E21\u65B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      return null;
    }
    const startDate = /* @__PURE__ */ new Date(`${recordDate}T${startTime}`);
    const endDate = /* @__PURE__ */ new Date(`${recordDate}T${endTime}`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      errorElement.textContent = "\u958B\u59CB\u6642\u523B\u3068\u7D42\u4E86\u6642\u523B\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      return null;
    }
    if (startDate.getTime() > endDate.getTime())
      startDate.setDate(startDate.getDate() - 1);
    const durationMs = endDate.getTime() - startDate.getTime();
    if (!Number.isSafeInteger(durationMs) || durationMs < 1e3) {
      errorElement.textContent = "\u7D42\u4E86\u6642\u523B\u306F\u958B\u59CB\u6642\u523B\u3088\u308A\u5F8C\u306B\u3057\u3066\u304F\u3060\u3055\u3044";
      return null;
    }
    errorElement.textContent = "";
    return { startDate, endDate, durationMs };
  }
  function resolveDurationConflict(enteredDurationMs, timeRange, save) {
    if (!timeRange || enteredDurationMs < 1e3 || enteredDurationMs === timeRange.durationMs) {
      save(
        timeRange && enteredDurationMs < 1e3 ? timeRange.durationMs : enteredDurationMs
      );
      return;
    }
    historySession.pendingDurationConflict = {
      enteredDurationMs,
      timeRangeDurationMs: timeRange.durationMs,
      save
    };
    elements.durationConflictMessage.textContent = `\u5165\u529B\u3057\u305F\u4F5C\u696D\u6642\u9593\u306F ${formatTime(enteredDurationMs)}\u3001\u958B\u59CB\u30FB\u7D42\u4E86\u304B\u3089\u8A08\u7B97\u3057\u305F\u6642\u9593\u306F ${formatTime(timeRange.durationMs)} \u3067\u3059\u3002`;
    elements.durationConflictDialog.showModal();
    window.setTimeout(() => elements.useTimeRangeDurationButton.focus(), 0);
  }
  function finishDurationConflict(useTimeRange) {
    if (!historySession.pendingDurationConflict) return;
    const resolution = historySession.pendingDurationConflict;
    historySession.pendingDurationConflict = null;
    elements.durationConflictDialog.close();
    resolution.save(
      useTimeRange ? resolution.timeRangeDurationMs : resolution.enteredDurationMs
    );
  }

  // src/features/timer/clock.js
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
    return state.isRunning ? state.elapsedBeforeStartMs + getRunningDeltaMs() : state.elapsedBeforeStartMs;
  }
  function getCountdownSessionElapsedMs() {
    return Math.max(0, getElapsedMs() - state.countdownSessionStartElapsedMs);
  }
  function getPomodoroPhaseElapsedMs() {
    return state.pomodoroPhaseElapsedBeforeStartMs + (isPomodoroActive() ? getRunningDeltaMs() : 0);
  }
  function getPomodoroPhaseDurationMs() {
    return state.pomodoroPhase === "break" ? state.pomodoroBreakDurationMs : state.countdownDurationMs;
  }
  function getDisplayMs() {
    if (state.mode === MODES.STOPWATCH) return getElapsedMs();
    if (isPomodoroActive()) {
      return Math.max(
        0,
        getPomodoroPhaseDurationMs() - getPomodoroPhaseElapsedMs()
      );
    }
    return Math.max(
      0,
      state.countdownDurationMs - getCountdownSessionElapsedMs()
    );
  }
  function getCountdownOvertimeMs() {
    if (isPomodoroActive()) {
      return Math.max(
        0,
        getPomodoroPhaseElapsedMs() - getPomodoroPhaseDurationMs()
      );
    }
    return Math.max(
      0,
      getCountdownSessionElapsedMs() - state.countdownDurationMs
    );
  }

  // src/features/timer/audio-state.js
  var audioSession = {
    audioContext: null,
    finishSoundIntervalId: 0
  };

  // src/features/timer/audio.js
  function playFinishSound() {
    try {
      const volume = getFinishSoundVolume();
      if (volume <= 0) return;
      audioSession.audioContext = audioSession.audioContext || new AudioContext();
      const oscillator = audioSession.audioContext.createOscillator();
      const gain = audioSession.audioContext.createGain();
      const relativeVolume = volume <= 50 ? volume / 50 : 1 + (volume - 50) / 50 * 9;
      const peakGain = 0.08 * relativeVolume;
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(1e-4, audioSession.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        peakGain,
        audioSession.audioContext.currentTime + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        1e-4,
        audioSession.audioContext.currentTime + 0.35
      );
      oscillator.connect(gain);
      gain.connect(audioSession.audioContext.destination);
      oscillator.start();
      oscillator.stop(audioSession.audioContext.currentTime + 0.38);
    } catch {
    }
  }
  function startCountdownAlert() {
    if (audioSession.finishSoundIntervalId) return;
    playFinishSound();
    audioSession.finishSoundIntervalId = window.setInterval(playFinishSound, 900);
  }
  function stopCountdownAlert() {
    if (!audioSession.finishSoundIntervalId) return;
    window.clearInterval(audioSession.finishSoundIntervalId);
    audioSession.finishSoundIntervalId = 0;
  }

  // src/features/timer/state.js
  var timerSession = {
    tickId: 0,
    timerPointerHandledAt: 0,
    timerTabsSignature: "",
    pendingCloseTimerId: "",
    timerTabConfirmPreviousFocus: null,
    pendingMode: "",
    modeSwitchConfirmPreviousFocus: null,
    pendingTimerNavigation: null,
    timerNavigationConfirmPreviousFocus: null,
    displayedClockSecond: -1,
    activeStateDate: localDateKey(),
    pendingNewDateKey: "",
    dateTimeIntervalId: 0,
    currentClockText: "00:00:00",
    pendingUntilPomodoroPlan: null
  };

  // src/features/timer/model.js
  function createTimerTab(number = state.nextTimerNumber) {
    return {
      id: `${now()}-${Math.random().toString(16).slice(2)}`,
      number,
      mode: getDefaultMode(),
      isRunning: false,
      startedAt: 0,
      elapsedBeforeStartMs: 0,
      countdownSessionStartElapsedMs: 0,
      countdownDurationMs: DEFAULT_COUNTDOWN_SECONDS * 1e3,
      pomodoroEnabled: false,
      pomodoroPhase: "work",
      pomodoroPhaseElapsedBeforeStartMs: 0,
      pomodoroBreakDurationMs: DEFAULT_POMODORO_BREAK_MS,
      pomodoroPlannedBreakCount: -1,
      pomodoroCompletedBreakCount: 0,
      pomodoroFinalWorkDurationMs: 0,
      taskName: "",
      taskMemo: "",
      firstStartedAt: 0,
      resumedRecordId: "",
      finishedAt: 0,
      hasStarted: false
    };
  }
  function isValidTimerTab(tab) {
    return tab && typeof tab.id === "string" && Number.isFinite(tab.number) && (Object.values(MODES).includes(tab.mode) || tab.mode === "pomodoro") && Number.isFinite(tab.elapsedBeforeStartMs) && tab.elapsedBeforeStartMs >= 0 && Number.isFinite(tab.countdownDurationMs) && tab.countdownDurationMs > 0 && typeof tab.taskName === "string";
  }
  function snapshotActiveTimer() {
    const tab = state.timerTabs.find((item) => item.id === state.activeTimerId);
    if (!tab) return;
    tab.mode = state.mode;
    const snapshotAt = now();
    tab.isRunning = state.isRunning;
    tab.elapsedBeforeStartMs = getElapsedMs();
    tab.startedAt = state.isRunning ? snapshotAt : 0;
    tab.countdownSessionStartElapsedMs = state.countdownSessionStartElapsedMs;
    tab.countdownDurationMs = state.countdownDurationMs;
    tab.pomodoroEnabled = state.pomodoroEnabled;
    tab.pomodoroPhase = state.pomodoroPhase;
    tab.pomodoroPhaseElapsedBeforeStartMs = getPomodoroPhaseElapsedMs();
    tab.pomodoroBreakDurationMs = state.pomodoroBreakDurationMs;
    tab.pomodoroPlannedBreakCount = state.pomodoroPlannedBreakCount;
    tab.pomodoroCompletedBreakCount = state.pomodoroCompletedBreakCount;
    tab.pomodoroFinalWorkDurationMs = state.pomodoroFinalWorkDurationMs;
    tab.taskName = state.taskName;
    tab.taskMemo = state.taskMemo;
    tab.firstStartedAt = state.firstStartedAt;
    tab.resumedRecordId = state.resumedRecordId;
    tab.finishedAt = state.finishedAt;
    tab.hasStarted = state.hasStarted;
    if (state.isRunning) {
      state.elapsedBeforeStartMs = tab.elapsedBeforeStartMs;
      state.pomodoroPhaseElapsedBeforeStartMs = tab.pomodoroPhaseElapsedBeforeStartMs;
      state.startedAt = snapshotAt;
    }
  }
  function snapshotBackgroundTimers() {
    const snapshotAt = now();
    state.timerTabs.forEach((tab) => {
      if (tab.id === state.activeTimerId || !tab.isRunning || !Number.isFinite(tab.startedAt))
        return;
      const deltaMs = Math.max(0, snapshotAt - tab.startedAt);
      if (tab.pomodoroEnabled) {
        if (tab.pomodoroPhase === "work") tab.elapsedBeforeStartMs += deltaMs;
        tab.pomodoroPhaseElapsedBeforeStartMs += deltaMs;
      } else {
        tab.elapsedBeforeStartMs += deltaMs;
      }
      tab.startedAt = snapshotAt;
    });
  }
  function applyTimerTab(tab) {
    stopCountdownAlert();
    state.activeTimerId = tab.id;
    state.mode = tab.mode === "pomodoro" ? MODES.COUNTDOWN : tab.mode;
    state.isRunning = tab.isRunning === true && Number.isFinite(tab.startedAt) && tab.startedAt > 0;
    state.startedAt = state.isRunning ? tab.startedAt : 0;
    state.elapsedBeforeStartMs = tab.elapsedBeforeStartMs;
    state.countdownSessionStartElapsedMs = Number.isFinite(
      tab.countdownSessionStartElapsedMs
    ) ? Math.min(tab.countdownSessionStartElapsedMs, tab.elapsedBeforeStartMs) : 0;
    state.countdownDurationMs = tab.countdownDurationMs;
    state.pomodoroEnabled = tab.pomodoroEnabled === true || tab.mode === "pomodoro";
    state.pomodoroPhase = ["work", "break"].includes(tab.pomodoroPhase) ? tab.pomodoroPhase : "work";
    state.pomodoroPhaseElapsedBeforeStartMs = Number.isFinite(
      tab.pomodoroPhaseElapsedBeforeStartMs
    ) ? Math.max(0, tab.pomodoroPhaseElapsedBeforeStartMs) : 0;
    if (tab.mode === "pomodoro" && Number.isFinite(tab.pomodoroWorkDurationMs) && tab.pomodoroWorkDurationMs > 0) {
      state.countdownDurationMs = tab.pomodoroWorkDurationMs;
    }
    state.pomodoroBreakDurationMs = Number.isFinite(tab.pomodoroBreakDurationMs) && tab.pomodoroBreakDurationMs > 0 ? tab.pomodoroBreakDurationMs : DEFAULT_POMODORO_BREAK_MS;
    state.pomodoroPlannedBreakCount = Number.isInteger(
      tab.pomodoroPlannedBreakCount
    ) ? Math.max(-1, tab.pomodoroPlannedBreakCount) : -1;
    state.pomodoroCompletedBreakCount = Number.isInteger(
      tab.pomodoroCompletedBreakCount
    ) ? Math.max(0, tab.pomodoroCompletedBreakCount) : 0;
    state.pomodoroFinalWorkDurationMs = Number.isFinite(
      tab.pomodoroFinalWorkDurationMs
    ) ? Math.max(0, tab.pomodoroFinalWorkDurationMs) : 0;
    state.taskName = tab.taskName;
    state.taskMemo = typeof tab.taskMemo === "string" ? tab.taskMemo : "";
    state.firstStartedAt = Number.isFinite(tab.firstStartedAt) ? tab.firstStartedAt : 0;
    state.resumedRecordId = typeof tab.resumedRecordId === "string" ? tab.resumedRecordId : "";
    state.finishedAt = tab.finishedAt || 0;
    state.hasStarted = tab.hasStarted === true;
    if (state.timerTabs.some((item) => item.isRunning)) startTicking();
  }

  // src/ui/toast-state.js
  var toastSession = {
    toastId: 0,
    toastUndoAction: null
  };

  // src/ui/toast.js
  function showToast(message, undoAction = null) {
    window.clearTimeout(toastSession.toastId);
    toastSession.toastUndoAction = undoAction;
    elements.toastMessage.textContent = message;
    elements.toastUndoButton.hidden = !undoAction;
    elements.toast.classList.add("is-visible");
    toastSession.toastId = window.setTimeout(
      () => {
        elements.toast.classList.remove("is-visible");
        elements.toastUndoButton.hidden = true;
        toastSession.toastUndoAction = null;
      },
      undoAction ? 7e3 : 3e3
    );
  }

  // src/features/timer/tabs.js
  function timerTabLabel(tab) {
    const name = tab.id === state.activeTimerId ? state.taskName : tab.taskName;
    return name.trim() || `\u30BF\u30A4\u30DE\u30FC ${tab.number}`;
  }
  function isTimerTabOvertime(tab) {
    if (!tab || tab.mode !== MODES.COUNTDOWN || !tab.isRunning) return false;
    const runningDeltaMs = Number.isFinite(tab.startedAt) ? Math.max(0, now() - tab.startedAt) : 0;
    if (tab.pomodoroEnabled) {
      const phaseElapsedMs = Math.max(0, tab.pomodoroPhaseElapsedBeforeStartMs || 0) + runningDeltaMs;
      const phaseDurationMs = tab.pomodoroPhase === "break" ? tab.pomodoroBreakDurationMs : tab.countdownDurationMs;
      return Number.isFinite(phaseDurationMs) && phaseElapsedMs >= phaseDurationMs;
    }
    const elapsedMs = Math.max(0, tab.elapsedBeforeStartMs || 0) + runningDeltaMs;
    const sessionElapsedMs = elapsedMs - Math.max(0, tab.countdownSessionStartElapsedMs || 0);
    return sessionElapsedMs >= tab.countdownDurationMs;
  }
  function renderTimerTabs() {
    snapshotActiveTimer();
    const signature = JSON.stringify([
      state.activeTimerId,
      state.timerTabs.map((tab) => [
        tab.id,
        tab.taskName,
        tab.number,
        tab.resumedRecordId,
        tab.isRunning,
        isTimerTabOvertime(tab)
      ])
    ]);
    if (signature === timerSession.timerTabsSignature) return;
    timerSession.timerTabsSignature = signature;
    elements.timerTabList.replaceChildren();
    state.timerTabs.forEach((tab) => {
      const item = document.createElement("div");
      item.className = "timer-workspace-tab";
      item.classList.toggle("is-active", tab.id === state.activeTimerId);
      item.classList.toggle("is-history-resumed", Boolean(tab.resumedRecordId));
      item.classList.toggle(
        "is-running-background",
        tab.isRunning && tab.id !== state.activeTimerId
      );
      item.classList.toggle("is-countdown-overtime", isTimerTabOvertime(tab));
      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "timer-tab-select";
      selectButton.dataset.timerId = tab.id;
      selectButton.setAttribute("role", "tab");
      selectButton.setAttribute("aria-controls", "timer-panel");
      selectButton.setAttribute(
        "aria-selected",
        String(tab.id === state.activeTimerId)
      );
      selectButton.textContent = timerTabLabel(tab);
      selectButton.title = timerTabLabel(tab);
      item.append(selectButton);
      if (state.timerTabs.length > 1) {
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "timer-tab-close";
        closeButton.dataset.closeTimerId = tab.id;
        closeButton.setAttribute("aria-label", `${timerTabLabel(tab)}\u3092\u9589\u3058\u308B`);
        closeButton.textContent = "\xD7";
        item.append(closeButton);
      }
      elements.timerTabList.append(item);
    });
  }
  function performSelectTimerTab(timerId) {
    if (timerId === state.activeTimerId) return;
    const nextTab = state.timerTabs.find((tab) => tab.id === timerId);
    if (!nextTab) return;
    snapshotActiveTimer();
    applyTimerTab(nextTab);
    syncInputsFromDuration();
    timerSession.timerTabsSignature = "";
    saveState();
    render();
  }
  function performAddTimerTab() {
    snapshotActiveTimer();
    const tab = createTimerTab(state.nextTimerNumber);
    state.nextTimerNumber += 1;
    state.timerTabs.push(tab);
    applyTimerTab(tab);
    syncInputsFromDuration();
    timerSession.timerTabsSignature = "";
    saveState();
    render();
  }
  function closeTimerNavigationConfirm() {
    timerSession.pendingTimerNavigation = null;
    elements.timerNavigationConfirmOverlay.hidden = true;
    if (timerSession.timerNavigationConfirmPreviousFocus && typeof timerSession.timerNavigationConfirmPreviousFocus.focus === "function") {
      timerSession.timerNavigationConfirmPreviousFocus.focus();
    }
    timerSession.timerNavigationConfirmPreviousFocus = null;
  }
  function confirmTimerNavigation() {
    if (!timerSession.pendingTimerNavigation) return;
    const action = timerSession.pendingTimerNavigation;
    closeTimerNavigationConfirm();
    if (action.type === "start") {
      const runningTab = state.timerTabs.find(
        (tab) => tab.id === action.runningTimerId
      );
      freezeTimerTab(runningTab);
      startTimer();
    } else if (action.type === "select") performSelectTimerTab(action.timerId);
    else performAddTimerTab();
  }
  function requestTimerNavigation(action) {
    timerSession.pendingTimerNavigation = action;
    timerSession.timerNavigationConfirmPreviousFocus = elements.app.ownerDocument.activeElement;
    const isStart = action.type === "start";
    const isSelect = action.type === "select";
    const runningTab = isStart ? state.timerTabs.find((tab) => tab.id === action.runningTimerId) : null;
    elements.timerNavigationConfirmMessage.textContent = isStart ? `\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u3067\u52D5\u4F5C\u4E2D\u306E\u300C${timerTabLabel(runningTab)}\u300D\u3092\u4E00\u6642\u505C\u6B62\u3057\u3066\u3001\u3053\u306E\u30BF\u30A4\u30DE\u30FC\u3092\u958B\u59CB\u3057\u307E\u3059\u304B\uFF1F` : isSelect ? "\u5225\u306E\u30BF\u30A4\u30DE\u30FC\u30BF\u30D6\u3078\u79FB\u52D5\u3057\u307E\u3059\u3002\u8A08\u6E2C\u4E2D\u306E\u30BF\u30A4\u30DE\u30FC\u306F\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u3067\u7D99\u7D9A\u3057\u307E\u3059\u3002" : "\u65B0\u3057\u3044\u30BF\u30A4\u30DE\u30FC\u30BF\u30D6\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002\u8A08\u6E2C\u4E2D\u306E\u30BF\u30A4\u30DE\u30FC\u306F\u30D0\u30C3\u30AF\u30B0\u30E9\u30A6\u30F3\u30C9\u3067\u7D99\u7D9A\u3057\u307E\u3059\u3002";
    elements.confirmTimerNavigationButton.textContent = isStart ? "\u4E00\u6642\u505C\u6B62\u3057\u3066\u958B\u59CB" : isSelect ? "\u79FB\u52D5" : "\u4F5C\u6210";
    elements.timerNavigationConfirmOverlay.hidden = false;
    elements.confirmTimerNavigationButton.focus();
  }
  function selectTimerTab(timerId) {
    if (timerId === state.activeTimerId) return;
    performSelectTimerTab(timerId);
  }
  function selectAdjacentTimerTab(direction = 1) {
    if (state.timerTabs.length <= 1) return;
    const currentIndex = state.timerTabs.findIndex(
      (tab) => tab.id === state.activeTimerId
    );
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + state.timerTabs.length) % state.timerTabs.length;
    selectTimerTab(state.timerTabs[nextIndex].id);
  }
  function selectNextTimerTab() {
    selectAdjacentTimerTab(1);
  }
  function addTimerTab() {
    performAddTimerTab();
  }
  function isTimerNavigationConfirmOpen() {
    return !elements.timerNavigationConfirmOverlay.hidden;
  }
  function timerHasActivity(tab) {
    return tab.id === state.activeTimerId ? state.hasStarted || state.isRunning : tab.hasStarted === true || tab.isRunning === true;
  }
  function removeRecordedTimerTab(timerId) {
    const tabIndex = state.timerTabs.findIndex((tab) => tab.id === timerId);
    if (tabIndex < 0) return;
    stopCountdownAlert();
    stopTicking();
    state.timerTabs.splice(tabIndex, 1);
    if (!state.timerTabs.length) {
      const freshTab = createTimerTab(state.nextTimerNumber);
      state.nextTimerNumber += 1;
      state.timerTabs.push(freshTab);
    }
    const nextTab = state.timerTabs[Math.min(tabIndex, state.timerTabs.length - 1)];
    applyTimerTab(nextTab);
    syncInputsFromDuration();
    timerSession.timerTabsSignature = "";
    saveState();
    render();
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
    timerSession.timerTabsSignature = "";
    saveState();
    render();
    showToast("\u30BF\u30A4\u30DE\u30FC\u30BF\u30D6\u3092\u524A\u9664\u3057\u307E\u3057\u305F", () => {
      state.timerTabs.splice(
        Math.min(removedIndex, state.timerTabs.length),
        0,
        removedTab
      );
      if (wasActive) {
        applyTimerTab(removedTab);
        syncInputsFromDuration();
      }
      timerSession.timerTabsSignature = "";
      saveState();
      render();
      showToast("\u30BF\u30A4\u30DE\u30FC\u30BF\u30D6\u3092\u5143\u306B\u623B\u3057\u307E\u3057\u305F");
    });
  }
  function closeTimerTabConfirm() {
    timerSession.pendingCloseTimerId = "";
    elements.timerTabConfirmOverlay.hidden = true;
    if (timerSession.timerTabConfirmPreviousFocus && typeof timerSession.timerTabConfirmPreviousFocus.focus === "function") {
      timerSession.timerTabConfirmPreviousFocus.focus();
    }
    timerSession.timerTabConfirmPreviousFocus = null;
  }
  function confirmCloseTimerTab() {
    if (!timerSession.pendingCloseTimerId) return;
    const timerId = timerSession.pendingCloseTimerId;
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
    timerSession.pendingCloseTimerId = timerId;
    timerSession.timerTabConfirmPreviousFocus = elements.app.ownerDocument.activeElement;
    elements.timerTabConfirmMessage.textContent = `\u300C${timerTabLabel(tab)}\u300D\u306F\u958B\u59CB\u6E08\u307F\u3067\u3059\u3002\u8A08\u6E2C\u5185\u5BB9\u3092\u7834\u68C4\u3057\u3066\u524A\u9664\u3057\u3066\u3082\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`;
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

  // src/features/timer/view.js
  function updateModeUi() {
    elements.modeTabs.forEach((tab) => {
      const active = tab.dataset.mode === state.mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    elements.countdownSettings.hidden = state.mode !== MODES.COUNTDOWN;
    elements.pomodoroEnabledInput.checked = state.pomodoroEnabled;
    elements.pomodoroBreakSettings.classList.toggle(
      "is-active",
      state.pomodoroEnabled
    );
    elements.pomodoroBreakSettings.setAttribute(
      "aria-hidden",
      String(!state.pomodoroEnabled)
    );
    elements.pomodoroBreakInput.disabled = !state.pomodoroEnabled;
    elements.countdownDurationButton.querySelector("span").textContent = state.pomodoroEnabled ? "\u4F5C\u696D\u6642\u9593\uFF081\u56DE\uFF09" : "\u4F5C\u696D\u6642\u9593";
    elements.countdownWorkDurationLegend.textContent = state.pomodoroEnabled ? "\u4F5C\u696D\u6642\u9593\uFF081\u56DE\uFF09" : "\u4F5C\u696D\u6642\u9593";
    elements.untilTimePomodoroSettings.hidden = !state.pomodoroEnabled;
    elements.untilTimePomodoroHelp.hidden = !state.pomodoroEnabled;
    elements.countdownDialogPomodoroInput.checked = state.pomodoroEnabled;
  }
  function updateStatus() {
    const isCountdownWaiting = state.mode === MODES.COUNTDOWN && state.elapsedBeforeStartMs > 0 && getCountdownSessionElapsedMs() === 0;
    if (isAwaitingCountdownStop()) {
      elements.statusText.textContent = "0\u79D2\u306B\u306A\u308A\u307E\u3057\u305F\u3002\u505C\u6B62\u30DC\u30BF\u30F3\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044";
    } else if (isPomodoroActive() && state.isRunning) {
      elements.statusText.textContent = state.pomodoroPhase === "work" ? "\u4F5C\u696D\u4E2D" : "\u4F11\u61A9\u4E2D";
    } else if (isPomodoroActive() && state.pomodoroPhaseElapsedBeforeStartMs > 0) {
      elements.statusText.textContent = state.pomodoroPhase === "work" ? "\u4F5C\u696D\u3092\u4E00\u6642\u505C\u6B62\u4E2D" : "\u4F11\u61A9\u3092\u4E00\u6642\u505C\u6B62\u4E2D";
    } else if (state.finishedAt) elements.statusText.textContent = "\u5B8C\u4E86";
    else if (state.isRunning) elements.statusText.textContent = "\u8A08\u6E2C\u4E2D";
    else if (state.elapsedBeforeStartMs > 0 && !isCountdownWaiting)
      elements.statusText.textContent = "\u4E00\u6642\u505C\u6B62\u4E2D";
    else elements.statusText.textContent = "\u5F85\u6A5F\u4E2D";
  }
  function isFinishedCountdown() {
    return state.mode === MODES.COUNTDOWN && !state.pomodoroEnabled && !state.isRunning && state.finishedAt > 0;
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
    view.cancelAnimationFrame(popupSession.fitButtonsFrame);
    popupSession.fitButtonsFrame = view.requestAnimationFrame(fitControlButtonText);
  }
  function updateDocumentTitle() {
    const title = state.taskName.trim() || "Simple Timer";
    document.title = title;
    const currentDocument = elements.app.ownerDocument;
    if (currentDocument !== document) currentDocument.title = title;
    elements.appTitle.textContent = isPopupContext() && state.isMinimized && state.taskName.trim() ? state.taskName.trim() : "Simple Timer";
  }
  function render() {
    if (state.mode === MODES.COUNTDOWN && state.isRunning && getDisplayMs() <= 0) {
      markCountdownReachedZero();
    }
    updateDocumentTitle();
    elements.taskNameDisplay.textContent = state.taskName || "\u30BF\u30B9\u30AF\u540D\u3092\u5165\u529B";
    const measurementMs = getDisplayMs();
    const measurementLabel = isAwaitingCountdownStop() ? "\u8D85\u904E" : state.mode === MODES.STOPWATCH ? "\u8A08\u6E2C" : isPomodoroActive() ? state.pomodoroPhase === "work" ? "\u4F5C\u696D \u6B8B\u308A" : "\u4F11\u61A9 \u6B8B\u308A" : "\u6B8B\u308A";
    const measurementText = isAwaitingCountdownStop() ? `+${formatTime(getCountdownOvertimeMs())}` : formatTime(
      measurementMs,
      state.mode === MODES.COUNTDOWN ? "ceil" : "floor"
    );
    const showClockAsPrimary = getPrimaryTimeDisplay() === "clock";
    elements.timeDisplay.textContent = showClockAsPrimary ? timerSession.currentClockText : measurementText;
    elements.secondaryTimeDisplay.textContent = showClockAsPrimary ? `${measurementLabel} ${measurementText}` : `\u73FE\u5728 ${timerSession.currentClockText}`;
    elements.cumulativeTimeDisplay.hidden = state.mode !== MODES.COUNTDOWN;
    elements.timeMetaRow.hidden = false;
    elements.cumulativeTimeDisplay.textContent = `\u4F5C\u696D\u6642\u9593 ${formatTime(getElapsedMs())}`;
    elements.pomodoroPhaseDisplay.hidden = !isPomodoroActive();
    const plannedWorkCount = state.pomodoroPlannedBreakCount >= 0 ? state.pomodoroPlannedBreakCount + 1 : 0;
    const currentWorkNumber = Math.min(
      state.pomodoroCompletedBreakCount + 1,
      plannedWorkCount || Infinity
    );
    elements.pomodoroPhaseDisplay.textContent = state.pomodoroPhase === "work" ? plannedWorkCount ? `\u4F5C\u696D ${currentWorkNumber}/${plannedWorkCount}` : "\u4F5C\u696D" : plannedWorkCount ? `\u4F11\u61A9 ${state.pomodoroCompletedBreakCount + 1}/${state.pomodoroPlannedBreakCount}` : "\u4F11\u61A9\uFF08\u4F5C\u696D\u6642\u9593\u5916\uFF09";
    elements.pomodoroPhaseDisplay.classList.toggle(
      "is-break",
      state.pomodoroPhase === "break"
    );
    const canResumeCurrentSession = isPomodoroActive() ? state.pomodoroPhaseElapsedBeforeStartMs > 0 : state.mode === MODES.STOPWATCH ? state.elapsedBeforeStartMs > 0 : getCountdownSessionElapsedMs() > 0;
    const primaryActionLabel = isAwaitingCountdownStop() ? "\u505C\u6B62" : isFinishedCountdown() ? "\u540C\u3058\u30BF\u30B9\u30AF\u3067\u8A08\u6E2C" : state.isRunning ? "\u4E00\u6642\u505C\u6B62" : isPomodoroActive() && state.pomodoroPhase === "break" ? state.pomodoroPhaseElapsedBeforeStartMs > 0 ? "\u4F11\u61A9\u518D\u958B" : "\u4F11\u61A9\u958B\u59CB" : canResumeCurrentSession ? "\u518D\u958B" : "\u958B\u59CB";
    elements.startPauseButton.textContent = primaryActionLabel;
    elements.compactStartPauseButton.textContent = isAwaitingCountdownStop() ? "\u505C\u6B62" : isFinishedCountdown() ? "\u540C\u3058\u30BF\u30B9\u30AF" : state.isRunning ? "\u4E00\u6642\u505C\u6B62" : isPomodoroActive() && state.pomodoroPhase === "break" ? state.pomodoroPhaseElapsedBeforeStartMs > 0 ? "\u4F11\u61A9\u518D\u958B" : "\u4F11\u61A9\u958B\u59CB" : canResumeCurrentSession ? "\u518D\u958B" : "\u958B\u59CB";
    elements.resetButton.textContent = isPomodoroActive() && state.pomodoroPhase === "break" && (state.isRunning || state.pomodoroPhaseElapsedBeforeStartMs > 0) ? "\u4F11\u61A9\u7D42\u4E86" : "\u30EA\u30BB\u30C3\u30C8";
    elements.panel.classList.toggle("is-finished", state.finishedAt > 0);
    elements.panel.classList.toggle(
      "is-history-resumed",
      Boolean(state.resumedRecordId)
    );
    elements.historyResumeIndicator.hidden = !state.resumedRecordId;
    elements.panel.classList.toggle(
      "is-awaiting-stop",
      isAwaitingCountdownStop()
    );
    elements.timeDisplay.classList.toggle(
      "is-measurement-finished",
      !showClockAsPrimary && state.finishedAt > 0
    );
    elements.timeDisplay.classList.toggle(
      "is-measurement-awaiting-stop",
      !showClockAsPrimary && isAwaitingCountdownStop()
    );
    elements.secondaryTimeDisplay.classList.toggle(
      "is-measurement-finished",
      showClockAsPrimary && state.finishedAt > 0
    );
    elements.secondaryTimeDisplay.classList.toggle(
      "is-measurement-awaiting-stop",
      showClockAsPrimary && isAwaitingCountdownStop()
    );
    elements.panel.classList.toggle(
      "is-overtime-background",
      isAwaitingCountdownStop() && now() - state.finishedAt >= 5e3
    );
    renderTimerTabs();
    getCurrentBody().classList.toggle(
      "is-minimized",
      state.isMinimized && isPopupContext()
    );
    getCurrentBody().classList.toggle(
      "is-minimized-countdown-overtime",
      state.isMinimized && isPopupContext() && isAwaitingCountdownStop()
    );
    elements.minimizeButton.querySelector("span").textContent = state.isMinimized ? "\u25A1" : "\u2212";
    updateModeUi();
    updateStatus();
    scheduleFitControlButtonText();
    scheduleFitPopupContent();
  }

  // src/features/timer/countdown.js
  function getDurationFromInputs() {
    const hours = Math.min(99, normalizeSeconds(elements.hoursInput.value, 0));
    const minutes = Math.min(
      59,
      normalizeSeconds(elements.minutesInput.value, 0)
    );
    const seconds = Math.min(
      59,
      normalizeSeconds(elements.secondsInput.value, 0)
    );
    return Math.max(1, hours * 3600 + minutes * 60 + seconds) * 1e3;
  }
  function setCountdownDurationInputs(totalSeconds) {
    const normalizedSeconds = Math.max(1, Math.round(totalSeconds));
    setDurationInputValues(
      [elements.hoursInput, elements.minutesInput, elements.secondsInput],
      normalizedSeconds * 1e3
    );
  }
  function applyUntilTimeToInputs() {
    if (!elements.untilTimeInput.value) {
      elements.untilTimeStatus.textContent = "\u7D42\u4E86\u6642\u523B\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      return;
    }
    const [hours, minutes] = elements.untilTimeInput.value.split(":").map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
      elements.untilTimeStatus.textContent = "\u7D42\u4E86\u6642\u523B\u3092\u6B63\u3057\u304F\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      return;
    }
    const current = /* @__PURE__ */ new Date();
    const target = new Date(current);
    target.setHours(hours, minutes, 0, 0);
    let dayLabel = "\u672C\u65E5";
    if (target.getTime() <= current.getTime()) {
      target.setDate(target.getDate() + 1);
      dayLabel = "\u7FCC\u65E5";
    }
    const durationSeconds = Math.max(
      1,
      Math.ceil((target.getTime() - current.getTime()) / 1e3)
    );
    if (state.pomodoroEnabled) {
      const workUnitSeconds = Math.max(
        1,
        Math.round(getDurationFromInputs() / 1e3)
      );
      const breakMinutes = Math.min(
        60,
        Math.max(1, normalizeSeconds(elements.untilTimeBreakInput.value, 5))
      );
      const breakSeconds = breakMinutes * 60;
      const breakCount = Math.floor(
        Math.max(0, durationSeconds - 1) / (workUnitSeconds + breakSeconds)
      );
      const finalWorkSeconds = durationSeconds - breakCount * (workUnitSeconds + breakSeconds);
      const firstWorkSeconds = breakCount > 0 ? workUnitSeconds : finalWorkSeconds;
      timerSession.pendingUntilPomodoroPlan = {
        breakMinutes,
        breakCount,
        finalWorkSeconds,
        firstWorkSeconds
      };
      elements.untilTimeStatus.textContent = `\u2192 \u4F5C\u696D ${formatTime(workUnitSeconds * 1e3)}\u5358\u4F4D
  \u4F11\u61A9 ${breakMinutes}\u5206 \xD7 ${breakCount}\u56DE
  \u6700\u7D42\u4F5C\u696D ${formatTime(finalWorkSeconds * 1e3)}`;
      return;
    }
    timerSession.pendingUntilPomodoroPlan = null;
    setCountdownDurationInputs(durationSeconds);
    elements.untilTimeStatus.textContent = `${dayLabel} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}\u307E\u3067\uFF08\u6B8B\u308A ${formatTime(durationSeconds * 1e3)}\uFF09`;
  }
  function syncInputsFromDuration() {
    const totalSeconds = Math.round(state.countdownDurationMs / 1e3);
    setCountdownDurationInputs(totalSeconds);
    elements.countdownDurationDisplay.textContent = formatTime(
      state.countdownDurationMs
    );
    elements.pomodoroEnabledInput.checked = state.pomodoroEnabled;
    elements.pomodoroBreakInput.value = String(
      Math.round(state.pomodoroBreakDurationMs / 6e4)
    );
    elements.untilTimeBreakInput.value = String(
      Math.round(state.pomodoroBreakDurationMs / 6e4)
    );
  }
  function bindCountdownEvents() {
    elements.pomodoroEnabledInput.addEventListener("change", () => {
      const remainingMs = getDisplayMs();
      const wasRunning = state.isRunning;
      freezeRunningTimer();
      state.pomodoroEnabled = elements.pomodoroEnabledInput.checked;
      state.pomodoroPlannedBreakCount = -1;
      state.pomodoroCompletedBreakCount = 0;
      state.pomodoroFinalWorkDurationMs = 0;
      state.pomodoroBreakDurationMs = Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) * 6e4;
      if (state.pomodoroEnabled) {
        state.pomodoroPhase = "work";
        state.pomodoroPhaseElapsedBeforeStartMs = Math.max(
          0,
          state.countdownDurationMs - remainingMs
        );
      } else {
        state.pomodoroPhase = "work";
        state.pomodoroPhaseElapsedBeforeStartMs = 0;
        state.countdownDurationMs = Math.max(1e3, remainingMs);
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
        state.pomodoroEnabled ? "\u6B8B\u308A\u6642\u9593\u3092\u7DAD\u6301\u3057\u3066\u30DD\u30E2\u30C9\u30FC\u30ED\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F" : "\u6B8B\u308A\u6642\u9593\u3092\u7DAD\u6301\u3057\u3066\u30DD\u30E2\u30C9\u30FC\u30ED\u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F"
      );
    });
    elements.countdownDialogPomodoroInput.addEventListener("change", () => {
      elements.pomodoroEnabledInput.checked = elements.countdownDialogPomodoroInput.checked;
      const view = elements.app.ownerDocument.defaultView || window;
      elements.pomodoroEnabledInput.dispatchEvent(new view.Event("change"));
    });
    elements.pomodoroBreakInput.addEventListener("change", () => {
      state.pomodoroBreakDurationMs = Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) * 6e4;
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
        state.pomodoroBreakDurationMs = timerSession.pendingUntilPomodoroPlan.breakMinutes * 6e4;
        state.pomodoroPlannedBreakCount = timerSession.pendingUntilPomodoroPlan.breakCount;
        state.pomodoroCompletedBreakCount = 0;
        state.pomodoroFinalWorkDurationMs = timerSession.pendingUntilPomodoroPlan.finalWorkSeconds * 1e3;
        elements.pomodoroBreakInput.value = String(
          timerSession.pendingUntilPomodoroPlan.breakMinutes
        );
      } else {
        state.pomodoroPlannedBreakCount = -1;
        state.pomodoroCompletedBreakCount = 0;
        state.pomodoroFinalWorkDurationMs = 0;
      }
      const durationSeconds = timerSession.pendingUntilPomodoroPlan ? timerSession.pendingUntilPomodoroPlan.firstWorkSeconds : getDurationFromInputs() / 1e3;
      setCountdownDuration(durationSeconds);
      timerSession.pendingUntilPomodoroPlan = null;
      elements.countdownDurationDialog.close();
      showToast(
        state.pomodoroEnabled && state.pomodoroPlannedBreakCount >= 0 ? "\u6307\u5B9A\u6642\u523B\u307E\u3067\u306E\u30DD\u30E2\u30C9\u30FC\u30ED\u3092\u8A2D\u5B9A\u3057\u307E\u3057\u305F" : "\u30AB\u30A6\u30F3\u30C8\u30C0\u30A6\u30F3\u6642\u9593\u3092\u5909\u66F4\u3057\u307E\u3057\u305F"
      );
    });
    elements.countdownDurationDialog.addEventListener(
      "close",
      syncInputsFromDuration
    );
    elements.applyUntilTimeButton.addEventListener(
      "click",
      applyUntilTimeToInputs
    );
    elements.presetButtons.forEach(
      (button) => button.addEventListener("click", () => {
        setCountdownDurationInputs(Number.parseInt(button.dataset.seconds, 10));
      })
    );
  }

  // src/features/timer/pomodoro.js
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
        state.countdownDurationMs - state.pomodoroPhaseElapsedBeforeStartMs
      );
      if (state.pomodoroPlannedBreakCount >= 0 && state.pomodoroCompletedBreakCount >= state.pomodoroPlannedBreakCount) {
        state.pomodoroEnabled = false;
        state.pomodoroPhase = "work";
        state.pomodoroPhaseElapsedBeforeStartMs = 0;
        state.countdownSessionStartElapsedMs = Math.max(
          0,
          state.elapsedBeforeStartMs - state.countdownDurationMs
        );
        state.finishedAt = now();
        saveState();
        render();
        showToast("\u6307\u5B9A\u6642\u523B\u307E\u3067\u306E\u30DD\u30E2\u30C9\u30FC\u30ED\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F");
        return;
      }
      state.pomodoroPhase = "break";
    } else {
      state.pomodoroCompletedBreakCount += 1;
      state.pomodoroPhase = "work";
      if (state.pomodoroPlannedBreakCount >= 0 && state.pomodoroCompletedBreakCount >= state.pomodoroPlannedBreakCount && state.pomodoroFinalWorkDurationMs > 0) {
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
      completedPhase === "work" ? "\u4F5C\u696D\u7D42\u4E86\u3067\u3059\u3002\u4F11\u61A9\u3092\u958B\u59CB\u3067\u304D\u307E\u3059" : "\u4F11\u61A9\u7D42\u4E86\u3067\u3059\u3002\u6B21\u306E\u4F5C\u696D\u3092\u958B\u59CB\u3067\u304D\u307E\u3059"
    );
  }
  function finishPomodoroBreakEarly() {
    freezeRunningTimer();
    if (state.pomodoroPlannedBreakCount >= 0) {
      state.pomodoroCompletedBreakCount += 1;
      if (state.pomodoroCompletedBreakCount >= state.pomodoroPlannedBreakCount && state.pomodoroFinalWorkDurationMs > 0) {
        state.countdownDurationMs = state.pomodoroFinalWorkDurationMs;
        syncInputsFromDuration();
      }
    }
    state.pomodoroPhase = "work";
    state.pomodoroPhaseElapsedBeforeStartMs = 0;
    state.finishedAt = 0;
    saveState();
    render();
    showToast("\u4F11\u61A9\u3092\u7D42\u4E86\u3057\u307E\u3057\u305F\u3002\u6B21\u306E\u4F5C\u696D\u3092\u958B\u59CB\u3067\u304D\u307E\u3059");
  }

  // src/features/timer/controls.js
  function startTimer() {
    stopCountdownAlert();
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      if (isPomodoroActive()) {
        state.pomodoroBreakDurationMs = Math.max(1, normalizeSeconds(elements.pomodoroBreakInput.value, 5)) * 6e4;
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
    const activeTab = state.timerTabs.find(
      (tab) => tab.id === state.activeTimerId
    );
    if (activeTab) {
      activeTab.isRunning = false;
      activeTab.startedAt = 0;
      activeTab.elapsedBeforeStartMs = state.elapsedBeforeStartMs;
      activeTab.pomodoroPhaseElapsedBeforeStartMs = state.pomodoroPhaseElapsedBeforeStartMs;
    }
    if (!state.timerTabs.some((tab) => tab.isRunning)) stopTicking();
  }
  function freezeTimerTab(tab) {
    if (!tab || !tab.isRunning) return;
    const deltaMs = Math.max(0, now() - tab.startedAt);
    if (tab.pomodoroEnabled) {
      if (tab.pomodoroPhase === "work") tab.elapsedBeforeStartMs += deltaMs;
      tab.pomodoroPhaseElapsedBeforeStartMs += deltaMs;
    } else {
      tab.elapsedBeforeStartMs += deltaMs;
    }
    tab.isRunning = false;
    tab.startedAt = 0;
    timerSession.timerTabsSignature = "";
  }
  function prepareAdditionalCountdown() {
    if (!isFinishedCountdown()) return;
    state.countdownSessionStartElapsedMs = getElapsedMs();
    state.finishedAt = 0;
    saveState();
    render();
    elements.statusText.textContent = "\u8FFD\u52A0\u3059\u308B\u6642\u9593\u3092\u9078\u629E\u3057\u3066\u958B\u59CB\u3057\u3066\u304F\u3060\u3055\u3044";
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
    snapshotActiveTimer();
    const runningTab = state.timerTabs.find(
      (tab) => tab.id !== state.activeTimerId && tab.isRunning
    );
    if (runningTab) {
      requestTimerNavigation({ type: "start", runningTimerId: runningTab.id });
      return;
    }
    startTimer();
  }
  function handleTimerPointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    timerSession.timerPointerHandledAt = now();
    toggleTimer();
  }
  function handleTimerClick() {
    if (now() - timerSession.timerPointerHandledAt < 500) return;
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
    state.resumedRecordId = "";
    state.pomodoroPhase = "work";
    state.pomodoroPhaseElapsedBeforeStartMs = 0;
    state.pomodoroPlannedBreakCount = -1;
    state.pomodoroCompletedBreakCount = 0;
    state.pomodoroFinalWorkDurationMs = 0;
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
    elements.resetConfirmMessage.textContent = `\u73FE\u5728\u306E\u4F5C\u696D\u6642\u9593\u306F ${formatTime(elapsedMs)} \u3067\u3059\u3002`;
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
    const timerIndex = state.timerTabs.findIndex(
      (tab) => tab.id === state.activeTimerId
    );
    const timerSnapshot = timerIndex >= 0 ? JSON.parse(JSON.stringify(state.timerTabs[timerIndex])) : null;
    resetTimer();
    showToast("\u5C65\u6B74\u306B\u8FFD\u52A0\u305B\u305A\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F", () => {
      if (!timerSnapshot) return;
      const currentIndex = state.timerTabs.findIndex(
        (tab) => tab.id === timerSnapshot.id
      );
      if (currentIndex >= 0) state.timerTabs[currentIndex] = timerSnapshot;
      else
        state.timerTabs.splice(
          Math.min(timerIndex, state.timerTabs.length),
          0,
          timerSnapshot
        );
      applyTimerTab(timerSnapshot);
      syncInputsFromDuration();
      timerSession.timerTabsSignature = "";
      saveState();
      render();
      showToast("\u30EA\u30BB\u30C3\u30C8\u524D\u306E\u72B6\u614B\u306B\u623B\u3057\u307E\u3057\u305F");
    });
  }
  function requestResetOrFinishBreak() {
    if (isPomodoroActive() && state.pomodoroPhase === "break" && (state.isRunning || state.pomodoroPhaseElapsedBeforeStartMs > 0)) {
      finishPomodoroBreakEarly();
      return;
    }
    requestResetTimer();
  }
  function isResetConfirmOpen() {
    return !elements.resetConfirmOverlay.hidden;
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
    timerSession.pendingMode = "";
    elements.modeSwitchConfirmOverlay.hidden = true;
    if (timerSession.modeSwitchConfirmPreviousFocus && typeof timerSession.modeSwitchConfirmPreviousFocus.focus === "function") {
      timerSession.modeSwitchConfirmPreviousFocus.focus();
    }
    timerSession.modeSwitchConfirmPreviousFocus = null;
  }
  function confirmModeSwitch() {
    if (!timerSession.pendingMode) return;
    const mode = timerSession.pendingMode;
    closeModeSwitchConfirm();
    performModeSwitch(mode);
  }
  function switchMode(mode) {
    if (state.mode === mode) return;
    if (!state.hasStarted && !state.isRunning) {
      performModeSwitch(mode);
      return;
    }
    timerSession.pendingMode = mode;
    timerSession.modeSwitchConfirmPreviousFocus = elements.app.ownerDocument.activeElement;
    const modeName = mode === MODES.COUNTDOWN ? "\u30AB\u30A6\u30F3\u30C8\u30C0\u30A6\u30F3" : "\u30B9\u30C8\u30C3\u30D7\u30A6\u30A9\u30C3\u30C1";
    elements.modeSwitchConfirmMessage.textContent = state.isRunning ? `\u73FE\u5728\u306E\u4F5C\u696D\u6642\u9593\u3092\u7DAD\u6301\u3057\u3001\u52D5\u4F5C\u4E2D\u306E\u30BF\u30A4\u30DE\u30FC\u3092\u4E00\u6642\u505C\u6B62\u3057\u3066\u300C${modeName}\u300D\u3078\u5207\u308A\u66FF\u3048\u3066\u3082\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F` : `\u73FE\u5728\u306E\u4F5C\u696D\u6642\u9593\u3092\u7DAD\u6301\u3057\u305F\u307E\u307E\u300C${modeName}\u300D\u3078\u5207\u308A\u66FF\u3048\u3066\u3082\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`;
    elements.modeSwitchConfirmOverlay.hidden = false;
    elements.confirmModeSwitchButton.focus();
  }
  function isModeSwitchConfirmOpen() {
    return !elements.modeSwitchConfirmOverlay.hidden;
  }
  function setCountdownDuration(seconds) {
    freezeRunningTimer();
    state.countdownDurationMs = seconds * 1e3;
    state.countdownSessionStartElapsedMs = state.elapsedBeforeStartMs;
    state.finishedAt = 0;
    state.hasStarted = state.elapsedBeforeStartMs > 0;
    syncInputsFromDuration();
    saveState();
    render();
  }
  function startTicking() {
    if (!timerSession.tickId)
      timerSession.tickId = window.setInterval(render, TICK_INTERVAL_MS);
  }
  function stopTicking() {
    if (timerSession.tickId) {
      window.clearInterval(timerSession.tickId);
      timerSession.tickId = 0;
    }
  }

  // src/features/history/recording.js
  function moveToNextTask() {
    const durationMs = getElapsedMs();
    if (!state.taskName.trim()) {
      elements.statusText.textContent = "\u8A18\u9332\u3059\u308B\u30BF\u30B9\u30AF\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      openTaskDialog(true);
      return;
    }
    if (durationMs < 1e3) {
      elements.statusText.textContent = "1\u79D2\u4EE5\u4E0A\u8A08\u6E2C\u3057\u3066\u304B\u3089\u8A18\u9332\u3057\u3066\u304F\u3060\u3055\u3044";
      return;
    }
    const addedAt = now();
    const resumedRecordId = state.resumedRecordId;
    const isResumedHistory = Boolean(resumedRecordId);
    const resumedRecordIndex = resumedRecordId ? state.records.findIndex((record) => record.id === resumedRecordId) : -1;
    const nextRecord = {
      id: resumedRecordId || String(addedAt) + "-" + Math.random().toString(16).slice(2),
      date: localDateKey(),
      taskName: state.taskName.trim(),
      memo: state.taskMemo,
      durationMs: Math.round(durationMs),
      mode: state.mode,
      firstStartedAt: new Date(
        state.firstStartedAt || addedAt - durationMs
      ).toISOString(),
      createdAt: new Date(addedAt).toISOString()
    };
    if (resumedRecordIndex >= 0) {
      state.records[resumedRecordIndex] = {
        ...state.records[resumedRecordIndex],
        ...nextRecord
      };
    } else {
      state.records.push(nextRecord);
    }
    saveRecords();
    if (isResumedHistory) {
      removeRecordedTimerTab(state.activeTimerId);
      elements.statusText.textContent = "\u518D\u958B\u5143\u306E\u4F5C\u696D\u5C65\u6B74\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F";
      showToast("\u518D\u958B\u5143\u306E\u4F5C\u696D\u5C65\u6B74\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F");
      return;
    }
    resetTimer();
    state.taskName = "";
    state.taskMemo = "";
    saveState();
    render();
    elements.statusText.textContent = "\u4ECA\u65E5\u306E\u4F5C\u696D\u3068\u3057\u3066\u8A18\u9332\u3057\u307E\u3057\u305F";
    showToast("\u4F5C\u696D\u5C65\u6B74\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F");
  }
  function getResumedRecordIds() {
    const resumedIds = new Set(
      state.timerTabs.map((tab) => tab.resumedRecordId).filter((recordId) => typeof recordId === "string" && recordId)
    );
    if (state.resumedRecordId) resumedIds.add(state.resumedRecordId);
    return resumedIds;
  }
  function isRecordBeingResumed(record) {
    return Boolean(record && record.id && getResumedRecordIds().has(record.id));
  }

  // src/features/tasks/state.js
  var tasksSession = {
    pendingRecordAfterTaskInput: false
  };

  // src/features/tasks/tasks.js
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
        current.push(
          Math.min(
            current[column] + 1,
            previous[column + 1] + 1,
            previous[column] + (a[row] === b[column] ? 0 : 1)
          )
        );
      }
      previous.splice(0, previous.length, ...current);
    }
    return previous[b.length];
  }
  function existingTaskNames() {
    const names = [];
    [
      ...state.records.map((record) => record.taskName),
      ...state.timerTabs.map((tab) => tab.taskName)
    ].map(normalizeTaskName).filter(Boolean).forEach((name) => {
      if (!names.some(
        (existing) => existing.toLocaleLowerCase("ja") === name.toLocaleLowerCase("ja")
      ))
        names.push(name);
    });
    return names;
  }
  function resolveTaskName(name) {
    const normalizedName = normalizeTaskName(name);
    if (!normalizedName || !isAggregationEnabled()) return normalizedName;
    const comparableName = normalizedName.toLocaleLowerCase("ja");
    const names = existingTaskNames();
    const exactMatch = names.find(
      (existing) => existing.toLocaleLowerCase("ja") === comparableName
    );
    if (exactMatch) return exactMatch;
    const similarName = names.map((existing) => {
      const comparableExisting = existing.toLocaleLowerCase("ja");
      const maximumLength = Math.max(
        Array.from(comparableName).length,
        Array.from(comparableExisting).length
      );
      const distance = taskNameDistance(comparableName, comparableExisting);
      const contains = Math.min(
        Array.from(comparableName).length,
        Array.from(comparableExisting).length
      ) >= 3 && (comparableName.includes(comparableExisting) || comparableExisting.includes(comparableName));
      return { existing, distance, maximumLength, contains };
    }).filter(
      (candidate) => candidate.contains || candidate.distance <= Math.max(1, Math.floor(candidate.maximumLength * 0.25))
    ).sort((a, b) => a.distance - b.distance)[0];
    if (!similarName) return normalizedName;
    const shouldUnify = elements.app.ownerDocument.defaultView.confirm(
      `\u5165\u529B\u3057\u305F\u300C${normalizedName}\u300D\u306F\u3001\u65E2\u5B58\u306E\u300C${similarName.existing}\u300D\u3068\u4F3C\u3066\u3044\u307E\u3059\u3002

\u540C\u3058\u30BF\u30B9\u30AF\u3068\u3057\u3066\u65E2\u5B58\u540D\u306B\u7D71\u4E00\u3057\u307E\u3059\u304B\uFF1F
OK\uFF1A\u65E2\u5B58\u540D\u306B\u7D71\u4E00 \uFF0F \u30AD\u30E3\u30F3\u30BB\u30EB\uFF1A\u5225\u30BF\u30B9\u30AF\u3068\u3057\u3066\u4F7F\u7528`
    );
    return shouldUnify ? similarName.existing : normalizedName;
  }
  function recentTaskNames() {
    const names = [];
    [...state.records].reverse().forEach((record) => {
      const taskName = normalizeTaskName(record.taskName);
      if (taskName && !names.includes(taskName)) names.push(taskName);
    });
    const currentTaskName = normalizeTaskName(state.taskName);
    if (currentTaskName && !names.includes(currentTaskName))
      names.unshift(currentTaskName);
    return names.slice(0, 10);
  }
  function renderRecentTasks(list, input) {
    loadRecords();
    list.replaceChildren();
    const names = recentTaskNames();
    if (!names.length) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "\u5C65\u6B74\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093";
      list.append(empty);
      return;
    }
    names.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-task-button";
      button.textContent = name;
      button.addEventListener("click", () => {
        input.value = name;
        input.focus();
      });
      list.append(button);
    });
  }
  function openTaskDialog(recordAfterInput = false) {
    tasksSession.pendingRecordAfterTaskInput = recordAfterInput === true;
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
  function bindTasksEvents() {
    elements.taskButton.addEventListener("click", () => openTaskDialog(false));
    elements.taskDialogForm.addEventListener("submit", (event) => {
      event.preventDefault();
      setTask(elements.taskInput.value, elements.taskMemoInput.value);
      if (!state.taskName) return;
      const shouldRecord = tasksSession.pendingRecordAfterTaskInput;
      tasksSession.pendingRecordAfterTaskInput = false;
      elements.taskDialog.close();
      if (shouldRecord) moveToNextTask();
    });
    elements.taskDialog.addEventListener("close", () => {
      tasksSession.pendingRecordAfterTaskInput = false;
    });
  }

  // src/storage/shared-storage.js
  function createTimerStorage(storage2, session) {
    const arrays = /* @__PURE__ */ new Set([RECORDS_KEY, TODOS_KEY]);
    const shared = /* @__PURE__ */ new Set([...arrays, DAILY_MEMOS_KEY, WORKDAY_TIMES_KEY]);
    const baseline = /* @__PURE__ */ new Map();
    const timerKey = STORAGE_KEY;
    const prefix = (key) => `${key}:item:`;
    const parse = (value, fallback) => {
      try {
        return JSON.parse(value) ?? fallback;
      } catch {
        return fallback;
      }
    };
    const toMap = (key, value) => arrays.has(key) ? Object.fromEntries(
      (Array.isArray(value) ? value : []).map((item) => [
        String(item.id ?? JSON.stringify(item)),
        item
      ])
    ) : value;
    function read(key) {
      const result = toMap(
        key,
        parse(storage2.getItem(key), arrays.has(key) ? [] : {})
      );
      for (let i = 0; i < storage2.length; i++) {
        const name = storage2.key(i);
        if (!name?.startsWith(prefix(key))) continue;
        const id = decodeURIComponent(name.slice(prefix(key).length));
        const value = parse(storage2.getItem(name), null);
        if (value === null) delete result[id];
        else result[id] = value;
      }
      return result;
    }
    return {
      getItem(key) {
        if (key === timerKey) return session.getItem(key) || storage2.getItem(key);
        if (!shared.has(key)) return storage2.getItem(key);
        const value = read(key);
        baseline.set(key, structuredClone(value));
        return JSON.stringify(arrays.has(key) ? Object.values(value) : value);
      },
      setItem(key, raw) {
        if (key === timerKey) session.setItem(key, raw);
        if (!shared.has(key)) {
          storage2.setItem(key, raw);
          return;
        }
        const next = toMap(key, JSON.parse(raw));
        const before = baseline.get(key) || read(key);
        for (const id of /* @__PURE__ */ new Set([
          ...Object.keys(before),
          ...Object.keys(next)
        ])) {
          if (JSON.stringify(before[id]) === JSON.stringify(next[id])) continue;
          storage2.setItem(
            prefix(key) + encodeURIComponent(id),
            JSON.stringify(next[id] ?? null)
          );
        }
        baseline.set(key, structuredClone(next));
      },
      removeItem(key) {
        if (key === timerKey) session.removeItem(key);
        if (shared.has(key)) {
          const names = [];
          for (let i = 0; i < storage2.length; i++)
            if (storage2.key(i)?.startsWith(prefix(key)))
              names.push(storage2.key(i));
          names.forEach((name) => storage2.removeItem(name));
          baseline.delete(key);
        }
        storage2.removeItem(key);
      }
    };
  }

  // src/storage/client.js
  var storage = createTimerStorage(
    window.localStorage,
    window.sessionStorage
  );

  // src/storage/repository.js
  function loadState() {
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
      const isFromToday = typeof saved.savedDate !== "string" || saved.savedDate === localDateKey();
      if (typeof saved.savedDate === "string")
        timerSession.activeStateDate = saved.savedDate;
      const savedTabs = Array.isArray(saved.timerTabs) ? saved.timerTabs.filter(isValidTimerTab) : [];
      if (savedTabs.length) {
        state.timerTabs = savedTabs.map((tab) => ({
          ...tab,
          mode: tab.mode === "pomodoro" ? MODES.COUNTDOWN : tab.mode,
          pomodoroEnabled: tab.pomodoroEnabled === true || tab.mode === "pomodoro",
          countdownDurationMs: tab.mode === "pomodoro" && Number.isFinite(tab.pomodoroWorkDurationMs) ? tab.pomodoroWorkDurationMs : tab.countdownDurationMs,
          taskName: tab.taskName.slice(0, 80),
          resumedRecordId: typeof tab.resumedRecordId === "string" ? tab.resumedRecordId : "",
          isRunning: false,
          startedAt: 0,
          countdownSessionStartElapsedMs: Number.isFinite(
            tab.countdownSessionStartElapsedMs
          ) ? Math.min(
            tab.countdownSessionStartElapsedMs,
            tab.elapsedBeforeStartMs
          ) : 0,
          hasStarted: tab.hasStarted === true || tab.elapsedBeforeStartMs > 0 || tab.finishedAt > 0
        }));
        state.nextTimerNumber = Math.max(...state.timerTabs.map((tab) => tab.number)) + 1;
        const activeTab = state.timerTabs.find((tab) => tab.id === saved.activeTimerId) || state.timerTabs[0];
        applyTimerTab(activeTab);
      } else {
        const firstTab = createTimerTab(1);
        if (isFromToday) {
          if (Object.values(MODES).includes(saved.mode))
            firstTab.mode = saved.mode;
          if (Number.isFinite(saved.countdownDurationMs) && saved.countdownDurationMs > 0) {
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
  function saveState() {
    snapshotActiveTimer();
    snapshotBackgroundTimers();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        savedDate: timerSession.activeStateDate,
        activeTimerId: state.activeTimerId,
        nextTimerNumber: state.nextTimerNumber,
        timerTabs: state.timerTabs
      })
    );
  }
  function saveRecords() {
    storage.setItem(RECORDS_KEY, JSON.stringify(state.records));
    loadRecords();
  }
  function loadDailyMemos() {
    try {
      const savedMemos = JSON.parse(storage.getItem(DAILY_MEMOS_KEY) || "{}");
      historySession.dailyMemos = savedMemos && typeof savedMemos === "object" && !Array.isArray(savedMemos) ? Object.fromEntries(
        Object.entries(savedMemos).filter(
          ([date, memo]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof memo === "string"
        ).map(([date, memo]) => [date, memo.slice(0, 1e3)])
      ) : {};
    } catch {
      storage.removeItem(DAILY_MEMOS_KEY);
      historySession.dailyMemos = {};
    }
  }
  function saveDailyMemos() {
    storage.setItem(DAILY_MEMOS_KEY, JSON.stringify(historySession.dailyMemos));
    loadDailyMemos();
  }
  function loadWorkdayTimes() {
    try {
      const saved = JSON.parse(storage.getItem(WORKDAY_TIMES_KEY) || "{}");
      historySession.workdayTimes = saved && typeof saved === "object" && !Array.isArray(saved) ? Object.fromEntries(
        Object.entries(saved).filter(
          ([date, value]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && value && typeof value.clockIn === "string" && typeof value.clockOut === "string"
        ).map(([date, value]) => [
          date,
          {
            clockIn: value.clockIn,
            clockOut: value.clockOut,
            breakDurationMs: Number.isFinite(value.breakDurationMs) && value.breakDurationMs >= 0 ? value.breakDurationMs : 0,
            breakDurationSet: value.breakDurationSet === true
          }
        ])
      ) : {};
    } catch {
      storage.removeItem(WORKDAY_TIMES_KEY);
      historySession.workdayTimes = {};
    }
  }
  function saveWorkdayTimes() {
    storage.setItem(
      WORKDAY_TIMES_KEY,
      JSON.stringify(historySession.workdayTimes)
    );
    loadWorkdayTimes();
  }
  function loadRecords() {
    try {
      const records = JSON.parse(storage.getItem(RECORDS_KEY) || "[]");
      if (!Array.isArray(records)) return;
      state.records = records.filter(
        (record) => record && typeof record.taskName === "string" && typeof record.date === "string" && Number.isFinite(record.durationMs) && record.durationMs > 0
      ).map((record) => ({
        ...record,
        taskName: normalizeTaskName(record.taskName),
        memo: typeof record.memo === "string" ? record.memo.slice(0, 300) : ""
      }));
    } catch {
      storage.removeItem(RECORDS_KEY);
      state.records = [];
    }
  }

  // src/features/history/memos.js
  function renderHistoryDateOptions(preferredDate = elements.historyDate.value) {
    const today = localDateKey();
    const storedDates = /* @__PURE__ */ new Set([
      ...state.records.map((record) => record.date),
      ...Object.keys(historySession.dailyMemos),
      ...Object.keys(historySession.workdayTimes)
    ]);
    const canSelectPreferredDate = isPastHistoryEditUnlocked() && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate) && preferredDate <= today;
    const availableDates = [
      .../* @__PURE__ */ new Set([
        today,
        ...canSelectPreferredDate ? [preferredDate] : [],
        ...state.records.map((record) => record.date),
        ...Object.keys(historySession.dailyMemos),
        ...Object.keys(historySession.workdayTimes)
      ])
    ].sort((a, b) => b.localeCompare(a));
    elements.historyDate.replaceChildren();
    availableDates.forEach((date) => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = !storedDates.has(date) && date !== today ? `${formatHistoryDateLabel(date)}\uFF08\u672A\u767B\u9332\uFF09` : formatHistoryDateLabel(date);
      elements.historyDate.append(option);
    });
    elements.historyDate.value = availableDates.includes(preferredDate) ? preferredDate : today;
    elements.historyDateInput.max = today;
    elements.historyDateInput.value = elements.historyDate.value;
    elements.historyDatePickerField.hidden = !isPastHistoryEditUnlocked();
    elements.historyDatePickerField.parentElement.classList.toggle(
      "is-calendar-enabled",
      isPastHistoryEditUnlocked()
    );
  }
  function saveDailyMemoNow(showFeedback = true) {
    window.clearTimeout(historySession.dailyMemoSaveId);
    historySession.dailyMemoSaveId = 0;
    const date = historySession.dailyMemoEditingDate || elements.historyDate.value;
    if (!date) return;
    if (!canEditHistoryDate(date)) {
      historySession.dailyMemoDirty = false;
      elements.dailyMemoStatus.textContent = "\u904E\u53BB\u306E\u65E5\u5225\u30E1\u30E2\u306F\u53C2\u7167\u306E\u307F\u3067\u3059";
      return;
    }
    const memo = elements.dailyMemoInput.value.trim().slice(0, 1e3);
    if (memo) historySession.dailyMemos[date] = memo;
    else delete historySession.dailyMemos[date];
    saveDailyMemos();
    historySession.dailyMemoDirty = false;
    elements.dailyMemoStatus.textContent = memo ? "\u4FDD\u5B58\u3057\u307E\u3057\u305F" : "\u7A7A\u306E\u30E1\u30E2\u3068\u3057\u3066\u4FDD\u5B58\u3057\u307E\u3057\u305F";
    if (showFeedback) {
      window.setTimeout(() => {
        if (!historySession.dailyMemoDirty && elements.historyDialog.open && elements.historyDate.value === date) {
          elements.dailyMemoStatus.textContent = "\u5165\u529B\u5185\u5BB9\u306F\u81EA\u52D5\u4FDD\u5B58\u3055\u308C\u307E\u3059";
        }
      }, 1800);
    }
  }
  function scheduleDailyMemoSave() {
    if (elements.dailyMemoInput.readOnly) return;
    historySession.dailyMemoDirty = true;
    elements.dailyMemoStatus.textContent = "\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u2026";
    window.clearTimeout(historySession.dailyMemoSaveId);
    historySession.dailyMemoSaveId = window.setTimeout(
      () => saveDailyMemoNow(),
      700
    );
  }
  function canCloseHistoryWithMemo() {
    if (!historySession.dailyMemoDirty) return true;
    const shouldSave = window.confirm(
      "\u65E5\u5225\u30E1\u30E2\u306B\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u4FDD\u5B58\u3057\u3066\u4F5C\u696D\u5C65\u6B74\u3092\u9589\u3058\u307E\u3059\u304B\uFF1F"
    );
    if (!shouldSave) return false;
    saveDailyMemoNow(false);
    return true;
  }

  // src/features/history/format.js
  function formatRecordDuration(milliseconds) {
    return formatDurationForUnit(milliseconds, state.historyUnit);
  }

  // src/features/history/editor.js
  function openEditHistoryDialog(record) {
    const canEdit = canEditHistoryDate(record.date);
    historySession.editingRecord = record;
    const isResuming = isRecordBeingResumed(record);
    elements.editHistoryDialog.classList.toggle("is-read-only", !canEdit);
    elements.editHistoryTitle.textContent = canEdit ? "\u4F5C\u696D\u5C65\u6B74\u3092\u7DE8\u96C6" : "\u4F5C\u696D\u5C65\u6B74\u306E\u8A73\u7D30";
    elements.resumeHistoryButton.hidden = !canEdit || record.date !== localDateKey() || isResuming;
    elements.editDeleteButton.hidden = !canEdit || isResuming;
    elements.editHistorySubmitButton.hidden = !canEdit;
    const startedAt = new Date(record.firstStartedAt);
    const endedAt = new Date(record.createdAt);
    const hasTimeRange = !Number.isNaN(startedAt.getTime()) && !Number.isNaN(endedAt.getTime());
    elements.editStartTimeInput.value = hasTimeRange ? formatTimeInputValue(startedAt) : "";
    elements.editEndTimeInput.value = hasTimeRange ? formatTimeInputValue(endedAt) : "";
    historySession.previousEditTimeRangeDurationMs = hasTimeRange ? calculateTimeRangeDuration(
      record.date,
      elements.editStartTimeInput.value,
      elements.editEndTimeInput.value
    ) : null;
    const totalSeconds = Math.round(record.durationMs / 1e3);
    elements.editHoursInput.value = String(Math.floor(totalSeconds / 3600));
    elements.editMinutesInput.value = String(
      Math.floor(totalSeconds % 3600 / 60)
    );
    elements.editSecondsInput.value = String(totalSeconds % 60);
    historySession.editTimingSnapshot = {
      startTime: elements.editStartTimeInput.value,
      endTime: elements.editEndTimeInput.value,
      durationMs: totalSeconds * 1e3
    };
    elements.editTaskInput.value = record.taskName;
    elements.editMemoInput.value = record.memo || "";
    [
      elements.editStartTimeInput,
      elements.editEndTimeInput,
      elements.editHoursInput,
      elements.editMinutesInput,
      elements.editSecondsInput,
      elements.editTaskInput,
      elements.editMemoInput
    ].forEach((input) => {
      input.readOnly = !canEdit;
    });
    elements.editHistoryError.textContent = canEdit ? "" : "\u53C2\u7167\u5C02\u7528\u3067\u3059\u3002\u5185\u5BB9\u306E\u5909\u66F4\u30FB\u524A\u9664\u306F\u3067\u304D\u307E\u305B\u3093\u3002";
    elements.editHistoryDialog.showModal();
    window.setTimeout(() => {
      if (canEdit) elements.editTaskInput.focus();
      else elements.editHistoryDialog.querySelector(".close-dialog")?.focus();
    }, 0);
  }
  function updateHistoryRecord(event) {
    event.preventDefault();
    if (!historySession.editingRecord) return;
    if (!canEditHistoryDate(historySession.editingRecord.date)) {
      elements.editHistoryDialog.close();
      showToast("\u7DE8\u96C6\u8A31\u53EF\u306E5\u5206\u9593\u304C\u7D42\u4E86\u3057\u307E\u3057\u305F");
      return;
    }
    const taskName = resolveTaskName(elements.editTaskInput.value);
    const durationMs = normalizeDurationInputs(
      [
        elements.editHoursInput,
        elements.editMinutesInput,
        elements.editSecondsInput
      ],
      elements.editHistoryError
    );
    if (durationMs === null) return;
    if (!taskName) {
      elements.editHistoryError.textContent = "\u30BF\u30B9\u30AF\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      return;
    }
    const timeRange = parseHistoryTimeRange(
      historySession.editingRecord.date,
      elements.editStartTimeInput.value,
      elements.editEndTimeInput.value,
      elements.editHistoryError
    );
    if (timeRange === null) return;
    if (!timeRange && durationMs < 1e3) {
      elements.editHistoryError.textContent = "\u4F5C\u696D\u6642\u9593\u30921\u79D2\u4EE5\u4E0A\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      return;
    }
    const timingChanged = !historySession.editTimingSnapshot || elements.editStartTimeInput.value !== historySession.editTimingSnapshot.startTime || elements.editEndTimeInput.value !== historySession.editTimingSnapshot.endTime || durationMs !== historySession.editTimingSnapshot.durationMs;
    const save = (selectedDurationMs) => {
      const previousRecord = JSON.parse(
        JSON.stringify(historySession.editingRecord)
      );
      const editedRecord = historySession.editingRecord;
      historySession.editingRecord.taskName = taskName;
      historySession.editingRecord.memo = elements.editMemoInput.value.trim().slice(0, 300);
      historySession.editingRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (timingChanged) {
        historySession.editingRecord.durationMs = selectedDurationMs;
        if (timeRange) {
          historySession.editingRecord.firstStartedAt = timeRange.startDate.toISOString();
          historySession.editingRecord.createdAt = timeRange.endDate.toISOString();
        } else {
          delete historySession.editingRecord.firstStartedAt;
        }
      }
      saveRecords();
      elements.editHistoryDialog.close();
      renderHistory();
      showToast("\u4F5C\u696D\u5C65\u6B74\u3092\u5909\u66F4\u3057\u307E\u3057\u305F", () => {
        const index = state.records.indexOf(editedRecord);
        if (index >= 0) state.records[index] = previousRecord;
        saveRecords();
        renderHistoryDateOptions(previousRecord.date);
        if (elements.historyDialog.open) renderHistory();
        showToast("\u4F5C\u696D\u5C65\u6B74\u306E\u5909\u66F4\u3092\u5143\u306B\u623B\u3057\u307E\u3057\u305F");
      });
    };
    if (timingChanged) {
      resolveDurationConflict(durationMs, timeRange, save);
    } else {
      save(historySession.editingRecord.durationMs);
    }
  }
  function resumeFromHistory() {
    if (!historySession.editingRecord || historySession.editingRecord.date !== localDateKey())
      return;
    elements.resumeHistoryConfirmMessage.textContent = `\u300C${historySession.editingRecord.taskName}\uFF08${formatRecordDuration(historySession.editingRecord.durationMs)}\uFF09\u300D\u306E\u8A08\u6E2C\u3092\u518D\u958B\u3057\u307E\u3059\u3002\u5C65\u6B74\u3078\u8FFD\u52A0\u3057\u305F\u3068\u304D\u306B\u5C65\u6B74\u3092\u66F4\u65B0\u3057\u307E\u3059\u3002`;
    elements.resumeHistoryConfirmDialog.showModal();
  }
  function confirmResumeFromHistory() {
    if (!historySession.editingRecord) return;
    const record = historySession.editingRecord;
    if (isRecordBeingResumed(record)) {
      elements.resumeHistoryConfirmDialog.close();
      showToast("\u3053\u306E\u5C65\u6B74\u306F\u3059\u3067\u306B\u8A08\u6E2C\u518D\u958B\u4E2D\u3067\u3059");
      return;
    }
    if (!record.id) {
      record.id = String(now()) + "-" + Math.random().toString(16).slice(2);
      saveRecords();
    }
    freezeRunningTimer();
    snapshotActiveTimer();
    const tab = createTimerTab(state.nextTimerNumber);
    state.nextTimerNumber += 1;
    tab.mode = record.mode === "pomodoro" ? MODES.COUNTDOWN : Object.values(MODES).includes(record.mode) ? record.mode : getDefaultMode();
    tab.pomodoroEnabled = record.mode === "pomodoro";
    tab.taskName = record.taskName.slice(0, 80);
    tab.taskMemo = typeof record.memo === "string" ? record.memo.slice(0, 300) : "";
    const recordStartedAt = new Date(record.firstStartedAt).getTime();
    tab.firstStartedAt = Number.isFinite(recordStartedAt) ? recordStartedAt : 0;
    tab.elapsedBeforeStartMs = record.durationMs;
    tab.countdownSessionStartElapsedMs = record.durationMs;
    tab.hasStarted = true;
    tab.resumedRecordId = record.id;
    state.timerTabs.push(tab);
    applyTimerTab(tab);
    syncInputsFromDuration();
    timerSession.timerTabsSignature = "";
    elements.resumeHistoryConfirmDialog.close();
    elements.editHistoryDialog.close();
    elements.historyDialog.close();
    saveRecords();
    saveState();
    render();
    showToast("\u958B\u59CB\u64CD\u4F5C\u3067\u518D\u958B\u3067\u304D\u307E\u3059");
  }
  function deleteHistoryRecord(record) {
    if (!canEditHistoryDate(record.date)) {
      showToast("\u904E\u53BB\u306E\u5C65\u6B74\u306F\u53C2\u7167\u306E\u307F\u3067\u3059");
      return;
    }
    const duration = formatRecordDuration(record.durationMs);
    historySession.pendingDeleteRecordId = record.id || "";
    historySession.pendingDeleteRecord = record;
    historySession.confirmPreviousFocus = elements.app.ownerDocument.activeElement;
    elements.confirmMessage.textContent = `\u300C${record.taskName}\uFF08${duration}\uFF09\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u3002`;
    elements.confirmOverlay.hidden = false;
    elements.confirmDeleteButton.focus();
  }
  function closeDeleteConfirm() {
    historySession.pendingDeleteRecordId = "";
    historySession.pendingDeleteRecord = null;
    elements.confirmOverlay.hidden = true;
    if (historySession.confirmPreviousFocus && typeof historySession.confirmPreviousFocus.focus === "function") {
      historySession.confirmPreviousFocus.focus();
    }
    historySession.confirmPreviousFocus = null;
  }
  function isDeleteConfirmOpen() {
    return !elements.confirmOverlay.hidden;
  }
  function confirmDeleteHistoryRecord() {
    if (!historySession.pendingDeleteRecordId && !historySession.pendingDeleteRecord)
      return;
    if (historySession.pendingDeleteRecord && !canEditHistoryDate(historySession.pendingDeleteRecord.date)) {
      closeDeleteConfirm();
      showToast("\u7DE8\u96C6\u8A31\u53EF\u306E5\u5206\u9593\u304C\u7D42\u4E86\u3057\u307E\u3057\u305F");
      return;
    }
    const recordIndex = state.records.findIndex(
      (item) => item.id === historySession.pendingDeleteRecordId || item === historySession.pendingDeleteRecord
    );
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
    showToast("\u4F5C\u696D\u5C65\u6B74\u3092\u524A\u9664\u3057\u307E\u3057\u305F", () => {
      state.records.splice(
        Math.min(recordIndex, state.records.length),
        0,
        removedRecord
      );
      saveRecords();
      renderHistoryDateOptions(removedRecord.date);
      if (elements.historyDialog.open) renderHistory();
      showToast("\u4F5C\u696D\u5C65\u6B74\u3092\u5143\u306B\u623B\u3057\u307E\u3057\u305F");
    });
  }
  function openHistoryDialog() {
    loadRecords();
    renderHistoryDateOptions(localDateKey());
    renderHistory();
    elements.historyDialog.showModal();
  }
  function openAddHistoryDialog() {
    const selectedDate = elements.historyDialog.open ? elements.historyDate.value : localDateKey();
    elements.manualDate.value = canEditHistoryDate(selectedDate) ? selectedDate : localDateKey();
    elements.manualTaskInput.value = "";
    elements.manualMemoInput.value = "";
    elements.manualHoursInput.value = "0";
    elements.manualMinutesInput.value = "0";
    elements.manualSecondsInput.value = "0";
    elements.manualStartTimeInput.value = "";
    elements.manualEndTimeInput.value = "";
    historySession.previousManualTimeRangeDurationMs = null;
    elements.manualHistoryError.textContent = "";
    renderRecentTasks(elements.manualRecentTaskList, elements.manualTaskInput);
    elements.addHistoryDialog.showModal();
    window.setTimeout(() => elements.manualTaskInput.focus(), 0);
  }
  function addManualHistory(event) {
    event.preventDefault();
    const taskName = resolveTaskName(elements.manualTaskInput.value);
    const recordDate = elements.manualDate.value;
    if (!canEditHistoryDate(recordDate)) {
      elements.manualHistoryError.textContent = "\u3053\u306E\u65E5\u4ED8\u306E\u5C65\u6B74\u7DE8\u96C6\u306F\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093";
      return;
    }
    const timeRange = parseHistoryTimeRange(
      recordDate,
      elements.manualStartTimeInput.value,
      elements.manualEndTimeInput.value,
      elements.manualHistoryError
    );
    if (timeRange === null) return;
    const enteredDurationMs = normalizeManualDurationInputs();
    if (enteredDurationMs === null) return;
    if (!timeRange && enteredDurationMs < 1e3) {
      elements.manualHistoryError.textContent = "\u4F5C\u696D\u6642\u9593\u30921\u79D2\u4EE5\u4E0A\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      return;
    }
    if (!taskName) {
      elements.manualHistoryError.textContent = "\u30BF\u30B9\u30AF\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044";
      return;
    }
    const save = (durationMs) => {
      const selectedDateCurrentTime = (/* @__PURE__ */ new Date(
        `${recordDate}T${formatTimeInputValue(/* @__PURE__ */ new Date())}`
      )).getTime();
      const addedAt = timeRange ? timeRange.endDate.getTime() : Number.isFinite(selectedDateCurrentTime) ? selectedDateCurrentTime : now();
      const record = {
        id: `${addedAt}-${Math.random().toString(16).slice(2)}`,
        date: recordDate,
        taskName,
        memo: elements.manualMemoInput.value.trim().slice(0, 300),
        durationMs,
        mode: "manual",
        createdAt: new Date(addedAt).toISOString()
      };
      if (timeRange) record.firstStartedAt = timeRange.startDate.toISOString();
      state.records.push(record);
      saveRecords();
      renderHistoryDateOptions(recordDate);
      renderHistory();
      elements.addHistoryDialog.close();
      elements.statusText.textContent = "\u4F5C\u696D\u5C65\u6B74\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F";
    };
    resolveDurationConflict(enteredDurationMs, timeRange, save);
  }
  function bindEditorEvents() {
    elements.addHistoryButton.addEventListener("click", openAddHistoryDialog);
    elements.addHistoryForm.addEventListener("submit", addManualHistory);
    [
      elements.manualStartTimeInput,
      elements.manualEndTimeInput,
      elements.editStartTimeInput,
      elements.editEndTimeInput
    ].forEach((input) => {
      input.addEventListener("pointerdown", () => {
        historySession.timeInputsPendingPicker.delete(input);
        if (!input.disabled && !input.readOnly && !input.value) {
          historySession.timeInputsPendingPicker.add(input);
          fillCurrentTimeIfEmpty(input);
        }
      });
      input.addEventListener("focus", () => fillCurrentTimeIfEmpty(input));
      input.addEventListener("click", () => {
        if (historySession.timeInputsPendingPicker.delete(input))
          openTimePicker(input);
      });
    });
    [elements.manualStartTimeInput, elements.manualEndTimeInput].forEach(
      (input) => input.addEventListener(
        "input",
        () => syncDurationAfterTimeRangeChange("manual")
      )
    );
    [elements.editStartTimeInput, elements.editEndTimeInput].forEach(
      (input) => input.addEventListener(
        "input",
        () => syncDurationAfterTimeRangeChange("edit")
      )
    );
    [
      elements.manualHoursInput,
      elements.manualMinutesInput,
      elements.manualSecondsInput
    ].forEach(
      (input) => input.addEventListener("change", normalizeManualDurationInputs)
    );
    [
      elements.editHoursInput,
      elements.editMinutesInput,
      elements.editSecondsInput
    ].forEach(
      (input) => input.addEventListener("change", normalizeEditDurationInputs)
    );
    elements.editHistoryForm.addEventListener("submit", updateHistoryRecord);
    elements.resumeHistoryButton.addEventListener("click", resumeFromHistory);
    elements.cancelResumeHistoryButton.addEventListener(
      "click",
      () => elements.resumeHistoryConfirmDialog.close()
    );
    elements.confirmResumeHistoryButton.addEventListener(
      "click",
      confirmResumeFromHistory
    );
    elements.cancelDurationConflictButton.addEventListener(
      "click",
      () => elements.durationConflictDialog.close()
    );
    elements.useEnteredDurationButton.addEventListener(
      "click",
      () => finishDurationConflict(false)
    );
    elements.useTimeRangeDurationButton.addEventListener(
      "click",
      () => finishDurationConflict(true)
    );
    elements.durationConflictDialog.addEventListener("close", () => {
      historySession.pendingDurationConflict = null;
    });
    elements.editHistoryDialog.addEventListener("close", () => {
      historySession.editingRecord = null;
      historySession.editTimingSnapshot = null;
    });
    elements.editDeleteButton.addEventListener("click", () => {
      if (!historySession.editingRecord) return;
      const record = historySession.editingRecord;
      elements.editHistoryDialog.close();
      deleteHistoryRecord(record);
    });
    elements.cancelDeleteButton.addEventListener("click", closeDeleteConfirm);
    elements.confirmDeleteButton.addEventListener(
      "click",
      confirmDeleteHistoryRecord
    );
    elements.confirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.confirmOverlay) closeDeleteConfirm();
    });
  }

  // src/features/history/summary.js
  function groupTaskRecords(records) {
    const totals = /* @__PURE__ */ new Map();
    records.forEach((record) => {
      const taskName = normalizeTaskName(record.taskName);
      const group = totals.get(taskName) || {
        taskName,
        durationMs: 0,
        records: []
      };
      group.durationMs += record.durationMs;
      group.records.push(record);
      totals.set(taskName, group);
    });
    return [...totals.values()].sort(
      (a, b) => b.durationMs - a.durationMs || a.taskName.localeCompare(b.taskName, "ja")
    );
  }
  function createTaskSummaryTable(records, unit = state.historyUnit) {
    const table = document.createElement("table");
    table.className = "history-summary-table";
    const thead = document.createElement("thead");
    thead.innerHTML = '<tr><th scope="col">\u30BF\u30B9\u30AF\u540D</th><th scope="col">\u4EF6\u6570</th><th scope="col">\u5408\u8A08</th></tr>';
    const tbody = document.createElement("tbody");
    groupTaskRecords(records).forEach((group) => {
      const row = document.createElement("tr");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `${group.taskName}\u306E\u30E1\u30E2\u3092\u8868\u793A`);
      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = group.taskName;
      const count = document.createElement("td");
      count.textContent = `${group.records.length}\u4EF6`;
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
  function renderTaskMemoDialog() {
    elements.taskMemoTitle.textContent = `${historySession.activeTaskMemoName}\u306E\u30E1\u30E2`;
    elements.taskMemoCount.textContent = `${historySession.activeTaskMemoRecords.length}\u4EF6`;
    const totalDurationMs = historySession.activeTaskMemoRecords.reduce(
      (total, record) => total + record.durationMs,
      0
    );
    const totalText = formatDurationForUnit(
      totalDurationMs,
      historySession.workSummaryUnit
    );
    elements.taskMemoTotal.textContent = `\u5408\u8A08 ${totalText}`;
    elements.taskMemoTotal.setAttribute(
      "aria-label",
      `\u5408\u8A08 ${totalText}\u3002\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u6642\u9593\u8868\u8A18\u3092\u5207\u308A\u66FF\u3048`
    );
    elements.taskMemoList.replaceChildren();
    historySession.activeTaskMemoRecords.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).forEach((record) => {
      const item = document.createElement("article");
      item.className = "task-memo-item";
      const meta = document.createElement("strong");
      meta.textContent = `${formatHistoryTimeRange(record) || record.date} \uFF0F ${formatDurationForUnit(record.durationMs, historySession.workSummaryUnit)}`;
      const memo = document.createElement("p");
      memo.textContent = record.memo || "\u30E1\u30E2\u306F\u3042\u308A\u307E\u305B\u3093";
      memo.classList.toggle("is-empty", !record.memo);
      item.append(meta, memo);
      elements.taskMemoList.append(item);
    });
  }
  function openTaskMemoDialog(taskName, records, unit = state.historyUnit) {
    historySession.activeTaskMemoName = taskName;
    historySession.activeTaskMemoRecords = records.slice();
    historySession.workSummaryUnit = unit === "clock" ? "clock" : "minutes";
    state.historyUnit = historySession.workSummaryUnit;
    renderTaskMemoDialog();
    elements.taskMemoDialog.showModal();
  }
  function formatSignedDuration(milliseconds, unit = historySession.workSummaryUnit) {
    const displayedMs = unit === "minutes" ? Math.round(milliseconds / 6e4) * 6e4 : Math.trunc(milliseconds / 1e3) * 1e3;
    const sign = displayedMs > 0 ? "+" : displayedMs < 0 ? "\u2212" : "\xB1";
    return `${sign}${formatDurationForUnit(Math.abs(displayedMs), unit)}`;
  }
  function openWorkSummaryDialog(dateKey) {
    historySession.workSummaryDateKey = dateKey;
    renderWorkSummary();
    elements.workSummaryDialog.showModal();
  }
  function renderWorkSummary() {
    if (!historySession.workSummaryDateKey) return;
    const values = historySession.workdayTimes[historySession.workSummaryDateKey] || { clockIn: "", clockOut: "", breakDurationMs: 0 };
    const records = state.records.filter(
      (record) => record.date === historySession.workSummaryDateKey
    );
    const measuredMs = records.reduce(
      (total, record) => total + record.durationMs,
      0
    );
    const grossWorkMs = calculateWorkDurationMs(values.clockIn, values.clockOut);
    const breakDurationMs = Number.isFinite(values.breakDurationMs) ? Math.max(0, values.breakDurationMs) : 0;
    const breakExceedsWork = grossWorkMs !== null && breakDurationMs > grossWorkMs;
    const workMs = grossWorkMs === null ? null : Math.max(0, grossWorkMs - breakDurationMs);
    const canEdit = canEditHistoryDate(historySession.workSummaryDateKey);
    elements.workSummaryDate.textContent = formatHistoryDateLabel(
      historySession.workSummaryDateKey
    );
    elements.clockInInput.value = values.clockIn;
    elements.clockOutInput.value = values.clockOut;
    const totalBreakMinutes = Math.round(breakDurationMs / 6e4);
    const breakInputMinutes = Math.min(totalBreakMinutes, 23 * 60 + 59);
    elements.breakTimeInput.value = [
      Math.floor(breakInputMinutes / 60),
      breakInputMinutes % 60
    ].map((part) => String(part).padStart(2, "0")).join(":");
    [
      elements.clockInInput,
      elements.clockOutInput,
      elements.breakTimeInput
    ].forEach((input) => {
      input.disabled = !canEdit;
    });
    elements.workSummaryUnitButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.workSummaryUnit === historySession.workSummaryUnit
      );
    });
    elements.workSummaryEditStatus.textContent = breakExceedsWork ? "\u4F11\u61A9\u6642\u9593\u304C\u62D8\u675F\u6642\u9593\u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002\u52E4\u52D9\u6642\u9593\u306F0\u3068\u3057\u3066\u8868\u793A\u3057\u307E\u3059\u3002" : canEdit ? "\u51FA\u9000\u52E4\u6642\u9593\u3068\u4F11\u61A9\u6642\u9593\u306F\u3053\u306E\u7AEF\u672B\u306B\u4FDD\u5B58\u3055\u308C\u307E\u3059" : "\u904E\u53BB\u306E\u51FA\u9000\u52E4\u6642\u9593\u30FB\u4F11\u61A9\u6642\u9593\u306F\u53C2\u7167\u306E\u307F\u3067\u3059";
    elements.workSummaryEditStatus.classList.toggle("is-error", breakExceedsWork);
    const emptyDuration = historySession.workSummaryUnit === "minutes" ? "--\u5206" : "--:--:--";
    elements.workDurationValue.textContent = workMs === null ? emptyDuration : formatDurationForUnit(workMs, historySession.workSummaryUnit);
    elements.measuredDurationValue.textContent = formatDurationForUnit(
      measuredMs,
      historySession.workSummaryUnit
    );
    elements.workDifferenceValue.textContent = workMs === null ? emptyDuration : formatSignedDuration(
      workMs - measuredMs,
      historySession.workSummaryUnit
    );
    const differenceMs = workMs === null ? null : workMs - measuredMs;
    const displayedDifferenceMs = differenceMs === null ? null : historySession.workSummaryUnit === "minutes" ? Math.round(differenceMs / 6e4) * 6e4 : Math.trunc(differenceMs / 1e3) * 1e3;
    elements.workDifferenceValue.classList.toggle(
      "is-positive",
      displayedDifferenceMs !== null && displayedDifferenceMs > 0
    );
    elements.workDifferenceValue.classList.toggle(
      "is-negative",
      displayedDifferenceMs !== null && displayedDifferenceMs < 0
    );
    elements.workSummaryTaskTable.replaceChildren();
    if (records.length)
      elements.workSummaryTaskTable.append(
        createTaskSummaryTable(records, historySession.workSummaryUnit)
      );
    else {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "\u3053\u306E\u65E5\u306E\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093";
      elements.workSummaryTaskTable.append(empty);
    }
  }
  function saveWorkSummaryTimes({
    applyDefaultBreak = false,
    breakEdited = false
  } = {}) {
    if (!historySession.workSummaryDateKey || !canEditHistoryDate(historySession.workSummaryDateKey)) {
      renderWorkSummary();
      showToast("\u904E\u53BB\u306E\u51FA\u9000\u52E4\u6642\u9593\u306F\u53C2\u7167\u306E\u307F\u3067\u3059");
      return;
    }
    const clockIn = elements.clockInInput.value;
    const clockOut = elements.clockOutInput.value;
    const [breakHours, breakMinutes] = (elements.breakTimeInput.value || "00:00").split(":").map(Number);
    let breakDurationMs = (Math.max(0, breakHours || 0) * 60 + Math.max(0, breakMinutes || 0)) * 6e4;
    const existingValues = historySession.workdayTimes[historySession.workSummaryDateKey];
    const breakDurationSet = breakEdited || existingValues?.breakDurationSet === true;
    if (applyDefaultBreak && clockIn && clockOut && !breakDurationSet && breakDurationMs === 0) {
      breakDurationMs = 60 * 6e4;
      elements.breakTimeInput.value = "01:00";
    }
    if (clockIn || clockOut || breakDurationMs > 0) {
      historySession.workdayTimes[historySession.workSummaryDateKey] = {
        clockIn,
        clockOut,
        breakDurationMs,
        breakDurationSet
      };
    } else delete historySession.workdayTimes[historySession.workSummaryDateKey];
    saveWorkdayTimes();
    renderWorkSummary();
    if (elements.historyDialog.open) renderHistory();
  }
  function bindSummaryEvents() {
    elements.clockInInput.addEventListener(
      "change",
      () => saveWorkSummaryTimes({ applyDefaultBreak: true })
    );
    elements.clockOutInput.addEventListener(
      "change",
      () => saveWorkSummaryTimes({ applyDefaultBreak: true })
    );
    elements.breakTimeInput.addEventListener(
      "change",
      () => saveWorkSummaryTimes({ breakEdited: true })
    );
    elements.workSummaryUnitButtons.forEach(
      (button) => button.addEventListener("click", () => {
        setSharedTimeFormat(button.dataset.workSummaryUnit);
      })
    );
    elements.unitButtons.forEach(
      (button) => button.addEventListener("click", () => {
        setSharedTimeFormat(button.dataset.unit);
      })
    );
    elements.taskMemoTotal.addEventListener("click", () => {
      setSharedTimeFormat(
        historySession.workSummaryUnit === "minutes" ? "clock" : "minutes"
      );
    });
    elements.taskMemoDialog.addEventListener("close", () => {
      historySession.activeTaskMemoName = "";
      historySession.activeTaskMemoRecords = [];
    });
  }

  // src/features/history/list.js
  function renderHistory() {
    const selectedDate = elements.historyDate.value;
    elements.historyDatePickerField.hidden = !isPastHistoryEditUnlocked();
    elements.historyDatePickerField.parentElement.classList.toggle(
      "is-calendar-enabled",
      isPastHistoryEditUnlocked()
    );
    elements.historyDateInput.max = localDateKey();
    elements.historyDateInput.value = selectedDate;
    const isViewingToday = selectedDate === localDateKey();
    const canEdit = canEditHistoryDate(selectedDate);
    const keepCurrentDraft = historySession.dailyMemoEditingDate === selectedDate && historySession.dailyMemoDirty;
    if (historySession.dailyMemoEditingDate && historySession.dailyMemoEditingDate !== selectedDate && historySession.dailyMemoDirty) {
      saveDailyMemoNow(false);
    }
    const records = state.records.filter(
      (record) => record.date === selectedDate
    );
    elements.historyDialog.classList.toggle("is-viewing-past", !isViewingToday);
    elements.historyDialog.classList.toggle(
      "is-editing-past",
      !isViewingToday && canEdit
    );
    elements.historyDateContext.hidden = isViewingToday;
    elements.historyDateContext.textContent = canEdit ? "\u904E\u53BB\u306E\u5C65\u6B74\uFF08\u7DE8\u96C6\u8A31\u53EF\u4E2D\uFF09" : "\u904E\u53BB\u306E\u5C65\u6B74\uFF08\u53C2\u7167\u306E\u307F\uFF09";
    elements.historyHelp.textContent = canEdit ? "\u5404\u8A18\u9332\u3092\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3068\u5185\u5BB9\u306E\u5909\u66F4\u30FB\u524A\u9664\u304C\u3067\u304D\u307E\u3059\u3002" : "\u5404\u8A18\u9332\u3092\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3068\u8A73\u7D30\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002\u5909\u66F4\u30FB\u524A\u9664\u306F\u8A2D\u5B9A\u304B\u30895\u5206\u9593\u3060\u3051\u8A31\u53EF\u3067\u304D\u307E\u3059\u3002";
    elements.addHistoryButton.hidden = !canEdit;
    historySession.dailyMemoEditingDate = elements.historyDate.value;
    if (!keepCurrentDraft)
      elements.dailyMemoInput.value = historySession.dailyMemos[elements.historyDate.value] || "";
    elements.dailyMemoInput.readOnly = !canEdit;
    if (!keepCurrentDraft) {
      historySession.dailyMemoDirty = false;
      elements.dailyMemoStatus.textContent = canEdit ? "\u5165\u529B\u5185\u5BB9\u306F\u81EA\u52D5\u4FDD\u5B58\u3055\u308C\u307E\u3059" : "\u904E\u53BB\u306E\u65E5\u5225\u30E1\u30E2\u306F\u53C2\u7167\u306E\u307F\u3067\u3059";
    }
    elements.unitButtons.forEach(
      (button) => button.classList.toggle(
        "is-active",
        button.dataset.unit === state.historyUnit
      )
    );
    renderHistorySummary(records);
    elements.historyList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "\u3053\u306E\u65E5\u306E\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093";
      elements.historyList.append(empty);
      return;
    }
    records.forEach((record) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "history-item";
      item.classList.toggle("is-read-only", !canEdit);
      const isResuming = isRecordBeingResumed(record);
      item.classList.toggle("is-resuming", isResuming);
      const details = document.createElement("span");
      details.className = "history-item-details";
      const task = document.createElement("strong");
      const duration = document.createElement("span");
      task.textContent = record.taskName;
      const metadata = document.createElement("small");
      metadata.className = "history-item-meta";
      const timeRange = formatHistoryTimeRange(record);
      metadata.textContent = [timeRange, record.memo || ""].filter(Boolean).join(" \uFF0F ");
      details.append(task);
      if (isResuming) {
        const resumingLabel = document.createElement("small");
        resumingLabel.className = "history-resuming-label";
        resumingLabel.textContent = "\u8A08\u6E2C\u518D\u958B\u4E2D\uFF08\u5C65\u6B74\u8FFD\u52A0\u6642\u306B\u66F4\u65B0\uFF09";
        details.append(resumingLabel);
      }
      if (metadata.textContent) details.append(metadata);
      duration.textContent = formatRecordDuration(record.durationMs);
      item.append(details, duration);
      item.addEventListener("click", () => openEditHistoryDialog(record));
      elements.historyList.append(item);
    });
  }
  function renderHistorySummary(records) {
    elements.historySummary.hidden = false;
    elements.historySummary.replaceChildren();
    elements.historySummary.tabIndex = 0;
    elements.historySummary.setAttribute("role", "button");
    elements.historySummary.setAttribute("aria-label", "\u3053\u306E\u65E5\u306E\u52E4\u52D9\u96C6\u8A08\u3092\u958B\u304F");
    elements.historySummary.onclick = () => openWorkSummaryDialog(elements.historyDate.value);
    elements.historySummary.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openWorkSummaryDialog(elements.historyDate.value);
    };
    const header = document.createElement("div");
    header.className = "history-summary-header";
    const heading = document.createElement("h3");
    heading.textContent = "\u3053\u306E\u65E5\u306E\u96C6\u8A08";
    const workSummaryIndicator = document.createElement("span");
    workSummaryIndicator.className = "work-summary-open-button";
    workSummaryIndicator.setAttribute("aria-hidden", "true");
    workSummaryIndicator.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 20V10h4v10H4Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z"/></svg><span>\u52E4\u52D9\u96C6\u8A08</span>';
    header.append(heading, workSummaryIndicator);
    elements.historySummary.append(header);
    const totalDurationMs = records.reduce(
      (total2, record) => total2 + record.durationMs,
      0
    );
    const stats = document.createElement("dl");
    stats.className = "history-summary-stats";
    const count = document.createElement("div");
    count.innerHTML = "<dt>\u4EF6\u6570</dt>";
    const countValue = document.createElement("dd");
    countValue.textContent = `${records.length}\u4EF6`;
    count.append(countValue);
    const total = document.createElement("div");
    total.innerHTML = "<dt>\u5408\u8A08\u6642\u9593</dt>";
    const totalValue = document.createElement("dd");
    totalValue.textContent = formatRecordDuration(totalDurationMs);
    total.append(totalValue);
    stats.append(count, total);
    const workday = historySession.workdayTimes[elements.historyDate.value];
    const grossWorkMs = workday ? calculateWorkDurationMs(workday.clockIn, workday.clockOut) : null;
    if (workday && grossWorkMs !== null) {
      const breakDurationMs = Number.isFinite(workday.breakDurationMs) ? Math.max(0, workday.breakDurationMs) : 0;
      const netWorkMs = Math.max(0, grossWorkMs - breakDurationMs);
      const timeRange = document.createElement("div");
      timeRange.innerHTML = "<dt>\u51FA\u9000\u52E4\u6642\u9593</dt>";
      const timeRangeValue = document.createElement("dd");
      timeRangeValue.textContent = `${workday.clockIn}\uFF5E${workday.clockOut}`;
      timeRange.append(timeRangeValue);
      const workDuration = document.createElement("div");
      workDuration.innerHTML = "<dt>\u52E4\u52D9\u6642\u9593</dt>";
      const workDurationValue = document.createElement("dd");
      workDurationValue.textContent = formatRecordDuration(netWorkMs);
      workDuration.append(workDurationValue);
      stats.append(timeRange, workDuration);
    }
    elements.historySummary.append(stats);
  }
  function bindHistoryEvents() {
    elements.historyButton.addEventListener("click", openHistoryDialog);
    elements.historyDialog.addEventListener("cancel", (event) => {
      if (!canCloseHistoryWithMemo()) event.preventDefault();
    });
    elements.historyDialog.addEventListener("close", () => {
      if (historySession.dailyMemoDirty) saveDailyMemoNow(false);
      if (isDeleteConfirmOpen()) closeDeleteConfirm();
    });
    elements.historyDate.addEventListener("change", renderHistory);
    elements.historyDateInput.addEventListener("change", () => {
      const selectedDate = elements.historyDateInput.value;
      if (!isPastHistoryEditUnlocked() || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate))
        return;
      renderHistoryDateOptions(selectedDate);
      renderHistory();
    });
    elements.dailyMemoInput.addEventListener("input", scheduleDailyMemoSave);
  }

  // src/features/settings/state.js
  var settingsSession = {
    pastHistoryEditUnlockedUntil: 0,
    pastHistoryEditTimeoutId: 0
  };

  // src/features/settings/settings.js
  function getDefaultMode() {
    const savedMode = storage.getItem(DEFAULT_MODE_KEY);
    if (savedMode === "pomodoro") return MODES.COUNTDOWN;
    return Object.values(MODES).includes(savedMode) ? savedMode : MODES.COUNTDOWN;
  }
  function getDefaultTimeFormat() {
    return storage.getItem(DEFAULT_TIME_FORMAT_KEY) === "clock" ? "clock" : "minutes";
  }
  function setSharedTimeFormat(unit, { saveDefault = false, notify = false } = {}) {
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
        normalizedUnit === "clock" ? "\u6642\u9593\u8868\u8A18\u306E\u30C7\u30D5\u30A9\u30EB\u30C8\u3092hh:mm:ss\u306B\u5909\u66F4\u3057\u307E\u3057\u305F" : "\u6642\u9593\u8868\u8A18\u306E\u30C7\u30D5\u30A9\u30EB\u30C8\u3092\u5206\u306B\u5909\u66F4\u3057\u307E\u3057\u305F"
      );
  }
  function isAggregationEnabled() {
    return storage.getItem(AGGREGATION_ENABLED_KEY) === "true";
  }
  function isPastHistoryEditUnlocked() {
    return settingsSession.pastHistoryEditUnlockedUntil > now();
  }
  function canEditHistoryDate(dateKey) {
    return dateKey === localDateKey() || isPastHistoryEditUnlocked();
  }
  function updatePastHistoryEditSetting() {
    const unlocked = isPastHistoryEditUnlocked();
    elements.pastHistoryEditInput.checked = unlocked;
    if (!unlocked) {
      elements.pastHistoryEditStatus.textContent = "OFF\uFF08\u904E\u53BB\u306E\u5C65\u6B74\u306F\u53C2\u7167\u306E\u307F\uFF09";
      return;
    }
    const remainingSeconds = Math.max(
      0,
      Math.ceil((settingsSession.pastHistoryEditUnlockedUntil - now()) / 1e3)
    );
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    elements.pastHistoryEditStatus.textContent = "ON\uFF08\u6B8B\u308A " + minutes + ":" + seconds + "\uFF09";
  }
  function disablePastHistoryEditing(notify = false) {
    const selectedDate = elements.historyDate.value;
    settingsSession.pastHistoryEditUnlockedUntil = 0;
    window.clearTimeout(settingsSession.pastHistoryEditTimeoutId);
    settingsSession.pastHistoryEditTimeoutId = 0;
    updatePastHistoryEditSetting();
    if (historySession.editingRecord && historySession.editingRecord.date !== localDateKey() && elements.editHistoryDialog.open) {
      elements.editHistoryDialog.close();
    }
    if (elements.addHistoryDialog.open && elements.manualDate.value !== localDateKey()) {
      elements.addHistoryDialog.close();
    }
    if (elements.historyDialog.open) {
      renderHistoryDateOptions(selectedDate);
      renderHistory();
    }
    if (elements.workSummaryDialog.open) renderWorkSummary();
    if (notify) showToast("\u904E\u53BB\u306E\u5C65\u6B74\u7DE8\u96C6\u3092OFF\u306B\u3057\u307E\u3057\u305F");
  }
  function enablePastHistoryEditing() {
    settingsSession.pastHistoryEditUnlockedUntil = now() + 5 * 60 * 1e3;
    window.clearTimeout(settingsSession.pastHistoryEditTimeoutId);
    settingsSession.pastHistoryEditTimeoutId = window.setTimeout(
      () => disablePastHistoryEditing(true),
      5 * 60 * 1e3
    );
    updatePastHistoryEditSetting();
    if (elements.historyDialog.open) {
      renderHistoryDateOptions(elements.historyDate.value);
      renderHistory();
    }
    if (elements.workSummaryDialog.open) renderWorkSummary();
    showToast("\u904E\u53BB\u306E\u5C65\u6B74\u7DE8\u96C6\u30925\u5206\u9593\u8A31\u53EF\u3057\u307E\u3057\u305F");
  }
  function openSettingsDialog() {
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
  function getTheme() {
    const theme = storage.getItem(THEME_KEY);
    return ["light", "dark"].includes(theme) ? theme : "system";
  }
  function getPrimaryTimeDisplay() {
    return storage.getItem(PRIMARY_TIME_DISPLAY_KEY) === "clock" ? "clock" : "measurement";
  }
  function getFinishSoundVolume() {
    const savedVolume = Number.parseInt(
      storage.getItem(FINISH_SOUND_VOLUME_KEY) || "50",
      10
    );
    return Number.isSafeInteger(savedVolume) ? Math.max(0, savedVolume) : 50;
  }
  function updateFinishSoundVolumeSetting() {
    const volume = getFinishSoundVolume();
    elements.finishSoundVolumeInput.value = String(Math.min(100, volume));
    elements.finishSoundVolumeNumberInput.value = String(volume);
  }
  function saveFinishSoundVolume(value) {
    const parsedVolume = Number(value);
    if (!Number.isSafeInteger(parsedVolume)) return false;
    const volume = Math.max(0, parsedVolume);
    storage.setItem(FINISH_SOUND_VOLUME_KEY, String(volume));
    elements.finishSoundVolumeInput.value = String(Math.min(100, volume));
    elements.finishSoundVolumeNumberInput.value = String(volume);
    return true;
  }
  function togglePrimaryTimeDisplay() {
    const value = getPrimaryTimeDisplay() === "measurement" ? "clock" : "measurement";
    storage.setItem(PRIMARY_TIME_DISPLAY_KEY, value);
    elements.primaryTimeDisplaySelect.value = value;
    render();
    showToast(
      value === "measurement" ? "\u8A08\u6E2C\u6642\u9593\u3092\u5927\u304D\u304F\u8868\u793A\u3057\u307E\u3059" : "\u73FE\u5728\u6642\u523B\u3092\u5927\u304D\u304F\u8868\u793A\u3057\u307E\u3059"
    );
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

  // src/ui/keyboard.js
  function handleKeyboard(event) {
    if (timerSession.pendingNewDateKey) return;
    const key = event.key.toLowerCase();
    const hasOpenDialog = Boolean(
      elements.app.ownerDocument.querySelector("dialog[open]")
    );
    const hasOpenConfirmation = isResetConfirmOpen() || isTimerNavigationConfirmOpen() || isModeSwitchConfirmOpen() || isTimerTabConfirmOpen() || isDeleteConfirmOpen();
    if (event.ctrlKey && !event.altKey && !event.shiftKey && key === "enter") {
      const form = event.target.closest?.(
        "#task-dialog-form, #add-history-form, #edit-history-form"
      );
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
    const isResetShortcut = !event.metaKey && !event.ctrlKey && event.altKey && event.shiftKey && event.code === "KeyR";
    if (isResetShortcut) {
      if (!hasOpenDialog && !hasOpenConfirmation) {
        event.preventDefault();
        requestResetOrFinishBreak();
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
    const isMoveTabShortcut = !hasOpenDialog && !event.ctrlKey && !event.metaKey && event.altKey && event.shiftKey && (event.code === "ArrowLeft" || event.code === "ArrowRight");
    if (isMoveTabShortcut) {
      event.preventDefault();
      selectAdjacentTimerTab(event.code === "ArrowLeft" ? -1 : 1);
      return;
    }
    const isDeleteTabShortcut = !hasOpenDialog && !event.ctrlKey && !event.metaKey && event.altKey && event.shiftKey && (key === "delete" || key === "backspace" || event.code === "KeyD");
    if (isDeleteTabShortcut) {
      event.preventDefault();
      closeTimerTab(state.activeTimerId);
      return;
    }
    const isPopupShortcut = !hasOpenDialog && !event.ctrlKey && !event.metaKey && event.altKey && event.shiftKey && event.code === "KeyS";
    if (isPopupShortcut) {
      event.preventDefault();
      cyclePopupDisplay();
      return;
    }
    if (["input", "textarea", "button"].includes(
      event.target.tagName.toLowerCase()
    ) || elements.app.ownerDocument.querySelector("dialog[open]"))
      return;
    if (event.code === "Space") {
      event.preventDefault();
      toggleTimer();
    }
  }

  // src/features/popup/window.js
  function getCurrentBody() {
    return elements.app.ownerDocument.body;
  }
  function isPopupContext() {
    return getCurrentBody().classList.contains("is-popup");
  }
  function fitPopupContentToWindow() {
    if (!isPopupContext()) {
      elements.app.style.zoom = "";
      elements.app.style.width = "";
      elements.app.style.maxWidth = "";
      popupSession.popupFitSignature = "";
      return;
    }
    const view = elements.app.ownerDocument.defaultView;
    const signature = JSON.stringify([
      view.innerWidth,
      state.isMinimized,
      state.mode,
      state.finishedAt > 0,
      state.timerTabs.length,
      elements.app.ownerDocument.querySelectorAll("dialog[open]").length
    ]);
    if (signature === popupSession.popupFitSignature) return;
    popupSession.popupFitSignature = signature;
    elements.app.style.zoom = "1";
    elements.app.style.width = "100%";
    elements.app.style.maxWidth = "none";
    const baseWidth = state.isMinimized ? 320 : 430;
    const widthScale = (view.innerWidth - 2) / baseWidth;
    const scale = clamp(Math.min(1, widthScale), 0.25, 1);
    elements.app.style.width = scale < 0.995 ? `${baseWidth}px` : "100%";
    elements.app.style.zoom = scale < 0.995 ? scale.toFixed(3) : "1";
    getCurrentBody().classList.toggle("is-content-scaled", scale < 0.995);
  }
  function scheduleFitPopupContent() {
    if (!isPopupContext()) return;
    const view = elements.app.ownerDocument.defaultView;
    view.cancelAnimationFrame(popupSession.popupFitFrame);
    popupSession.popupFitFrame = view.requestAnimationFrame(
      fitPopupContentToWindow
    );
  }
  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }
  function normalizePopupSize(size, limits = POPUP_SIZE_LIMITS) {
    if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height))
      return null;
    return {
      width: Math.round(clamp(size.width, limits.minWidth, limits.maxWidth)),
      height: Math.round(clamp(size.height, limits.minHeight, limits.maxHeight))
    };
  }
  function loadStoredPopupSize(key) {
    try {
      const limits = key === MINIMIZED_POPUP_SIZE_KEY ? MINIMIZED_POPUP_SIZE_LIMITS : POPUP_SIZE_LIMITS;
      return normalizePopupSize(
        JSON.parse(storage.getItem(key) || "null"),
        limits
      );
    } catch {
      storage.removeItem(key);
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
    const configuredMaxWidth = Number.parseFloat(
      view.getComputedStyle(elements.app).maxWidth
    );
    const contentWidth = Math.ceil(
      Math.max(
        elements.app.scrollWidth,
        elements.app.getBoundingClientRect().width,
        Number.isFinite(configuredMaxWidth) ? configuredMaxWidth : 0
      )
    );
    const contentHeight = Math.ceil(
      Math.max(
        elements.app.scrollHeight,
        elements.app.getBoundingClientRect().height
      )
    );
    return {
      width: Math.round(
        clamp(
          contentWidth,
          POPUP_SIZE_LIMITS.minWidth,
          Math.min(POPUP_SIZE_LIMITS.maxWidth, availableWidth)
        )
      ),
      height: Math.round(
        clamp(
          contentHeight + 8,
          OPTIMAL_POPUP_MIN_HEIGHT,
          Math.min(POPUP_SIZE_LIMITS.maxHeight, availableHeight)
        )
      )
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
    const timerHeight = isCurrentlyMinimized ? Math.ceil(elements.panel.getBoundingClientRect().height) : 96;
    const contentHeight = headerHeight + timerHeight + verticalPadding + 2;
    const contentWidth = isCurrentlyMinimized ? Math.max(header.scrollWidth, elements.panel.scrollWidth) + horizontalPadding : 360;
    const size = {
      width: Math.round(
        clamp(
          contentWidth,
          MINIMIZED_POPUP_SIZE_LIMITS.minWidth,
          Math.min(MINIMIZED_POPUP_SIZE_LIMITS.maxWidth, availableWidth)
        )
      ),
      height: Math.round(
        clamp(
          contentHeight,
          MINIMIZED_POPUP_SIZE_LIMITS.minHeight,
          Math.min(MINIMIZED_POPUP_SIZE_LIMITS.maxHeight, availableHeight)
        )
      )
    };
    elements.app.style.zoom = previousZoom;
    return size;
  }
  function fitPopupSizeToScreen(size, view = window, limits = POPUP_SIZE_LIMITS) {
    const screen = view.screen || window.screen;
    const maximumWidth = Math.min(
      limits.maxWidth,
      Math.max(limits.minWidth, screen.availWidth - 32)
    );
    const maximumHeight = Math.min(
      limits.maxHeight,
      Math.max(limits.minHeight, screen.availHeight - 48)
    );
    return {
      width: Math.round(clamp(size.width, limits.minWidth, maximumWidth)),
      height: Math.round(clamp(size.height, limits.minHeight, maximumHeight))
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
    storage.setItem(key, JSON.stringify(normalized));
    updatePopupSizeSettings();
  }
  function updatePopupSizeSettings() {
    const savedSize = loadSavedPopupSize();
    const savedMinimizedSize = loadSavedMinimizedPopupSize();
    const automaticSize = calculateOptimalPopupSize(
      elements.app.ownerDocument.defaultView || window
    );
    const automaticMinimizedSize = calculateOptimalMinimizedPopupSize(
      elements.app.ownerDocument.defaultView || window
    );
    const minimizedSize = savedMinimizedSize || automaticMinimizedSize;
    elements.popupSizeStatus.textContent = savedSize ? `${savedSize.width} \xD7 ${savedSize.height}px\uFF08\u4FDD\u5B58\u6E08\u307F\uFF09` : `${automaticSize.width} \xD7 ${automaticSize.height}px\uFF08\u81EA\u52D5\uFF09`;
    elements.minimizedPopupSizeStatus.textContent = savedMinimizedSize ? `${minimizedSize.width} \xD7 ${minimizedSize.height}px\uFF08\u4FDD\u5B58\u6E08\u307F\uFF09` : `${minimizedSize.width} \xD7 ${minimizedSize.height}px\uFF08\u81EA\u52D5\uFF09`;
    elements.resetPopupSizeButton.disabled = !savedSize;
    elements.resetMinimizedPopupSizeButton.disabled = !savedMinimizedSize;
    if (elements.settingsDialog.open && isPastHistoryEditUnlocked())
      updatePastHistoryEditSetting();
  }
  function schedulePopupSizeSave(view) {
    if (!isPopupContext()) return;
    window.clearTimeout(popupSession.popupResizeSaveId);
    const remainingSuppressionMs = Math.max(
      0,
      popupSession.suppressPopupSizeSaveUntil - now()
    );
    popupSession.popupResizeSaveId = window.setTimeout(
      () => {
        if (!isPopupContext()) return;
        savePopupSize(
          { width: view.innerWidth, height: view.innerHeight },
          state.isMinimized
        );
        popupSession.popupResizeSaveId = 0;
      },
      Math.max(350, remainingSuppressionMs + 100)
    );
  }
  function cancelPendingPopupSizeSave() {
    window.clearTimeout(popupSession.popupResizeSaveId);
    popupSession.popupResizeSaveId = 0;
  }
  function resizePopupWindow(view, size) {
    popupSession.suppressPopupSizeSaveUntil = now() + 1e3;
    const frameWidth = Math.max(0, view.outerWidth - view.innerWidth);
    const frameHeight = Math.max(0, view.outerHeight - view.innerHeight);
    try {
      view.resizeTo(size.width + frameWidth, size.height + frameHeight);
    } catch {
    }
  }
  function applyPopupSize(view, size) {
    cancelPendingPopupSizeSave();
    resizePopupWindow(view, size);
    view.requestAnimationFrame(() => resizePopupWindow(view, size));
  }
  function resetPopupSize() {
    storage.removeItem(POPUP_SIZE_KEY);
    popupSession.preMinimizePopupSize = null;
    updatePopupSizeSettings();
    if (isPopupContext() && !state.isMinimized) {
      const view = elements.app.ownerDocument.defaultView;
      applyPopupSize(view, calculateOptimalPopupSize(view));
    }
    showToast("PiP\u30B5\u30A4\u30BA\u3092\u81EA\u52D5\u8A2D\u5B9A\u306B\u623B\u3057\u307E\u3057\u305F");
  }
  function resetMinimizedPopupSize() {
    storage.removeItem(MINIMIZED_POPUP_SIZE_KEY);
    updatePopupSizeSettings();
    if (isPopupContext() && state.isMinimized) {
      const view = elements.app.ownerDocument.defaultView;
      applyPopupSize(
        view,
        fitPopupSizeToScreen(
          calculateOptimalMinimizedPopupSize(view),
          view,
          MINIMIZED_POPUP_SIZE_LIMITS
        )
      );
    }
    showToast("\u6700\u5C0F\u5316\u30B5\u30A4\u30BA\u3092\u81EA\u52D5\u8A2D\u5B9A\u306B\u623B\u3057\u307E\u3057\u305F");
  }
  function openPopupWindow() {
    const url = new URL(window.location.href);
    url.searchParams.set("popup", "1");
    const size = getPreferredPopupSize(window);
    const handle = window.open(
      url.toString(),
      "simpleTimerPopup",
      `popup=yes,width=${size.width},height=${size.height},left=120,top=120,resizable=yes,scrollbars=yes`
    );
    elements.statusText.textContent = handle ? "\u5C0F\u7A93\u3092\u958B\u304D\u307E\u3057\u305F" : "\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u307E\u3057\u305F";
    if (handle) handle.focus();
  }
  function toggleMinimized() {
    if (!isPopupContext()) return;
    const view = elements.app.ownerDocument.defaultView;
    if (!state.isMinimized) {
      popupSession.preMinimizePopupSize = {
        width: view.innerWidth,
        height: view.innerHeight
      };
      cancelPendingPopupSizeSave();
      savePopupSize(popupSession.preMinimizePopupSize, false);
      state.isMinimized = true;
      render();
      const minimizedSize = loadSavedMinimizedPopupSize() || calculateOptimalMinimizedPopupSize(view);
      const fittedMinimizedSize = fitPopupSizeToScreen(
        minimizedSize,
        view,
        MINIMIZED_POPUP_SIZE_LIMITS
      );
      applyPopupSize(view, fittedMinimizedSize);
      view.setTimeout(() => {
        if (state.isMinimized && isPopupContext())
          applyPopupSize(view, fittedMinimizedSize);
      }, 250);
      return;
    }
    const currentMinimizedSize = {
      width: view.innerWidth,
      height: view.innerHeight
    };
    cancelPendingPopupSizeSave();
    savePopupSize(currentMinimizedSize, true);
    state.isMinimized = false;
    render();
    const restoreSize = popupSession.preMinimizePopupSize || loadSavedPopupSize() || calculateOptimalPopupSize(view);
    popupSession.preMinimizePopupSize = null;
    applyPopupSize(view, fitPopupSizeToScreen(restoreSize, view));
  }
  async function openDocumentPictureInPicture() {
    const pip = window.documentPictureInPicture;
    if (!pip || typeof pip.requestWindow !== "function") return false;
    try {
      const preferredSize = getPreferredPopupSize(window);
      const pipWindow = await pip.requestWindow({
        ...preferredSize,
        preferInitialWindowPlacement: true
      });
      const styleLink = pipWindow.document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = "./assets/styles.css";
      pipWindow.document.head.append(styleLink);
      pipWindow.document.documentElement.dataset.theme = resolveTheme(getTheme());
      pipWindow.document.body.className = "is-popup";
      pipWindow.document.body.append(elements.app);
      popupSession.popupFitSignature = "";
      scheduleFitPopupContent();
      pipWindow.document.addEventListener("keydown", handleKeyboard);
      popupSession.suppressPopupSizeSaveUntil = now() + 1200;
      pipWindow.addEventListener("resize", () => {
        scheduleFitControlButtonText();
        popupSession.popupFitSignature = "";
        scheduleFitPopupContent();
        schedulePopupSizeSave(pipWindow);
      });
      const applyPreferredSize = () => {
        if (state.isMinimized || elements.app.ownerDocument !== pipWindow.document)
          return;
        applyPopupSize(pipWindow, fitPopupSizeToScreen(preferredSize, pipWindow));
      };
      styleLink.addEventListener(
        "load",
        () => pipWindow.requestAnimationFrame(applyPreferredSize),
        { once: true }
      );
      pipWindow.requestAnimationFrame(
        () => pipWindow.requestAnimationFrame(applyPreferredSize)
      );
      pipWindow.addEventListener("pagehide", () => {
        if (elements.todoDialog.open) elements.todoDialog.close();
        state.isMinimized = false;
        popupSession.preMinimizePopupSize = null;
        elements.app.style.zoom = "";
        elements.app.style.width = "";
        elements.app.style.maxWidth = "";
        popupSession.popupFitSignature = "";
        document.body.classList.toggle(
          "is-popup",
          new URLSearchParams(location.search).has("popup")
        );
        document.body.append(elements.app);
        disablePastHistoryEditing(false);
        render();
      });
      return true;
    } catch {
      return false;
    }
  }
  async function openCompactWindow() {
    if (!await openDocumentPictureInPicture()) openPopupWindow();
  }
  async function cyclePopupDisplay() {
    if (!isPopupContext()) {
      await openCompactWindow();
      return;
    }
    toggleMinimized();
  }
  function bindPopupEvents() {
    elements.resetPopupSizeButton.addEventListener("click", resetPopupSize);
    elements.resetMinimizedPopupSizeButton.addEventListener(
      "click",
      resetMinimizedPopupSize
    );
    elements.popupButton.addEventListener("click", openCompactWindow);
    elements.minimizeButton.addEventListener("click", toggleMinimized);
  }

  // src/core/lifecycle.js
  function bindLifecycleEvents() {
    window.addEventListener("resize", scheduleFitControlButtonText);
    window.addEventListener("resize", () => {
      popupSession.popupFitSignature = "";
      scheduleFitPopupContent();
      schedulePopupSizeSave(window);
    });
    window.addEventListener("beforeunload", (event) => {
      if (!hasStartedTimer() && !historySession.dailyMemoDirty) return;
      saveState();
      event.preventDefault();
      event.returnValue = "";
    });
  }

  // src/features/backup/state.js
  var backupSession = {
    pendingBackupImport: null
  };

  // src/shared/download.js
  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
      URL.revokeObjectURL(url);
    }
  }

  // src/features/backup/backup.js
  function setBackupStatus(message, isError = false) {
    elements.backupStatus.textContent = message;
    elements.backupStatus.classList.toggle("is-error", isError);
  }
  function getBackupSummary(storage2) {
    const parse = (key, fallback) => {
      try {
        return JSON.parse(storage2[key] || JSON.stringify(fallback));
      } catch {
        return fallback;
      }
    };
    const records = parse(RECORDS_KEY, []);
    const timerState = parse(STORAGE_KEY, {});
    const memos = parse(DAILY_MEMOS_KEY, {});
    const workdays = parse(WORKDAY_TIMES_KEY, {});
    const dates = Array.isArray(records) ? records.map((record) => record && record.date).filter((date) => typeof date === "string").sort() : [];
    return [
      `\u4F5C\u696D\u5C65\u6B74\uFF1A${Array.isArray(records) ? records.length : 0}\u4EF6`,
      `\u5BFE\u8C61\u671F\u9593\uFF1A${dates.length ? `${dates[0]} \uFF5E ${dates[dates.length - 1]}` : "\u5C65\u6B74\u306A\u3057"}`,
      `\u30BF\u30A4\u30DE\u30FC\u30BF\u30D6\uFF1A${Array.isArray(timerState.timerTabs) ? timerState.timerTabs.length : 0}\u4EF6`,
      `\u65E5\u5225\u30E1\u30E2\uFF1A${memos && typeof memos === "object" && !Array.isArray(memos) ? Object.keys(memos).length : 0}\u4EF6`,
      `\u51FA\u9000\u52E4\u8A18\u9332\uFF1A${workdays && typeof workdays === "object" && !Array.isArray(workdays) ? Object.keys(workdays).length : 0}\u4EF6`
    ].join("\n");
  }
  function exportBackup() {
    saveState();
    saveRecords();
    saveDailyMemos();
    const backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      storage: Object.fromEntries(
        BACKUP_STORAGE_KEYS.map((key) => [key, storage.getItem(key)])
      )
    };
    if (!window.confirm(
      `\u6B21\u306E\u5185\u5BB9\u3092\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3057\u307E\u3059\u3002

${getBackupSummary(backup.storage)}

\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3057\u307E\u3059\u304B\uFF1F`
    )) {
      setBackupStatus("\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F\u3002");
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    });
    downloadFile(blob, `simple-timer-backup-${localDateKey()}.json`);
    setBackupStatus("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002");
  }
  function validateBackup(backup) {
    if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
      throw new Error(
        "Simple Timer\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30D5\u30A1\u30A4\u30EB\u3067\u306F\u306A\u3044\u304B\u3001\u5BFE\u5FDC\u3057\u3066\u3044\u306A\u3044\u5F62\u5F0F\u3067\u3059\u3002"
      );
    }
    if (!backup.storage || typeof backup.storage !== "object" || Array.isArray(backup.storage)) {
      throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u4FDD\u5B58\u30C7\u30FC\u30BF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
    }
    BACKUP_STORAGE_KEYS.forEach((key) => {
      if (!(key in backup.storage)) backup.storage[key] = null;
      const value = backup.storage[key];
      if (value !== null && typeof value !== "string") {
        throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306E\u30C7\u30FC\u30BF\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
      }
    });
    [
      [
        STORAGE_KEY,
        (value) => value && typeof value === "object" && !Array.isArray(value)
      ],
      [RECORDS_KEY, Array.isArray],
      [TODOS_KEY, Array.isArray],
      [
        POPUP_SIZE_KEY,
        (value) => value && Number.isFinite(value.width) && Number.isFinite(value.height)
      ],
      [
        MINIMIZED_POPUP_SIZE_KEY,
        (value) => value && Number.isFinite(value.width) && Number.isFinite(value.height)
      ],
      [
        DAILY_MEMOS_KEY,
        (value) => value && typeof value === "object" && !Array.isArray(value)
      ],
      [
        WORKDAY_TIMES_KEY,
        (value) => value && typeof value === "object" && !Array.isArray(value)
      ]
    ].forEach(([key, isValid]) => {
      const rawValue = backup.storage[key];
      if (rawValue === null) return;
      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306EJSON\u30C7\u30FC\u30BF\u304C\u7834\u640D\u3057\u3066\u3044\u307E\u3059\u3002");
      }
      if (!isValid(parsed))
        throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306E\u30C7\u30FC\u30BF\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
    });
    if (backup.storage[DEFAULT_MODE_KEY] !== null && !Object.values(MODES).includes(backup.storage[DEFAULT_MODE_KEY])) {
      throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306E\u521D\u671F\u8868\u793A\u8A2D\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
    }
    if (backup.storage[AGGREGATION_ENABLED_KEY] !== null && !["true", "false"].includes(backup.storage[AGGREGATION_ENABLED_KEY])) {
      throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306E\u9AD8\u5EA6\u306A\u8A08\u6E2C\u8A2D\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
    }
    if (backup.storage[THEME_KEY] !== null && !["system", "light", "dark"].includes(backup.storage[THEME_KEY])) {
      throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306E\u30C6\u30FC\u30DE\u8A2D\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
    }
    if (backup.storage[PRIMARY_TIME_DISPLAY_KEY] !== null && !["measurement", "clock"].includes(backup.storage[PRIMARY_TIME_DISPLAY_KEY])) {
      throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306E\u6642\u9593\u8868\u793A\u8A2D\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
    }
    if (backup.storage[FINISH_SOUND_VOLUME_KEY] !== null) {
      const volume = Number(backup.storage[FINISH_SOUND_VOLUME_KEY]);
      if (!Number.isSafeInteger(volume) || volume < 0) {
        throw new Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5185\u306E\u7D42\u4E86\u97F3\u91CF\u8A2D\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
      }
    }
  }
  function parseBackupJsonValue(storage2, key, fallback) {
    try {
      const value = storage2[key];
      return value === null || value === void 0 ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  function recordMergeKey(record) {
    if (record && typeof record.id === "string" && record.id)
      return `id:${record.id}`;
    return `record:${[
      record?.date,
      record?.createdAt,
      record?.firstStartedAt,
      record?.taskName,
      record?.durationMs
    ].join("|")}`;
  }
  function mergeBackupData(backup) {
    saveState();
    saveRecords();
    saveDailyMemos();
    saveWorkdayTimes();
    const storedCurrentRecords = parseBackupJsonValue(
      { [RECORDS_KEY]: storage.getItem(RECORDS_KEY) },
      RECORDS_KEY,
      []
    );
    const storedImportedRecords = parseBackupJsonValue(
      backup.storage,
      RECORDS_KEY,
      []
    );
    const currentRecords = Array.isArray(storedCurrentRecords) ? storedCurrentRecords : [];
    const importedRecords = Array.isArray(storedImportedRecords) ? storedImportedRecords : [];
    const mergedRecords = [];
    const recordKeys = /* @__PURE__ */ new Set();
    [...currentRecords, ...importedRecords].forEach((record) => {
      const key = recordMergeKey(record);
      if (recordKeys.has(key)) return;
      recordKeys.add(key);
      mergedRecords.push(record);
    });
    const currentMemos = parseBackupJsonValue(
      { [DAILY_MEMOS_KEY]: storage.getItem(DAILY_MEMOS_KEY) },
      DAILY_MEMOS_KEY,
      {}
    );
    const importedMemos = parseBackupJsonValue(
      backup.storage,
      DAILY_MEMOS_KEY,
      {}
    );
    const currentWorkdays = parseBackupJsonValue(
      { [WORKDAY_TIMES_KEY]: storage.getItem(WORKDAY_TIMES_KEY) },
      WORKDAY_TIMES_KEY,
      {}
    );
    const importedWorkdays = parseBackupJsonValue(
      backup.storage,
      WORKDAY_TIMES_KEY,
      {}
    );
    storage.setItem(RECORDS_KEY, JSON.stringify(mergedRecords));
    storage.setItem(
      DAILY_MEMOS_KEY,
      JSON.stringify({ ...importedMemos, ...currentMemos })
    );
    storage.setItem(
      WORKDAY_TIMES_KEY,
      JSON.stringify({ ...importedWorkdays, ...currentWorkdays })
    );
  }
  function finishBackupImport(mode) {
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
            [...importedTodos, ...currentTodos].map((todo) => [todo.id, todo])
          ).values()
        ])
      );
    }
    location.reload();
  }
  function hasCurrentImportableData() {
    return state.records.length > 0 || JSON.parse(storage.getItem(TODOS_KEY)).length > 0 || Object.keys(historySession.dailyMemos).length > 0 || Object.keys(historySession.workdayTimes).length > 0;
  }
  async function importBackup(event) {
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
      elements.backupImportSummary.textContent = `\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u5185\u5BB9
${getBackupSummary(backup.storage)}`;
      elements.backupImportModeDialog.showModal();
    } catch (error) {
      setBackupStatus(
        error instanceof Error ? error.message : "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
        true
      );
    }
  }
  function bindBackupEvents() {
    elements.backupExportButton.addEventListener("click", exportBackup);
    elements.backupImportButton.addEventListener(
      "click",
      () => elements.backupFileInput.click()
    );
    elements.backupFileInput.addEventListener("change", importBackup);
    elements.cancelBackupImportButton.addEventListener("click", () => {
      backupSession.pendingBackupImport = null;
      elements.backupImportModeDialog.close();
      setBackupStatus("\u30A4\u30F3\u30DD\u30FC\u30C8\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F\u3002");
    });
    elements.mergeBackupImportButton.addEventListener(
      "click",
      () => finishBackupImport("merge")
    );
    elements.replaceBackupImportButton.addEventListener(
      "click",
      () => finishBackupImport("replace")
    );
    elements.backupImportModeDialog.addEventListener("cancel", () => {
      backupSession.pendingBackupImport = null;
      setBackupStatus("\u30A4\u30F3\u30DD\u30FC\u30C8\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F\u3002");
    });
  }

  // src/features/history/export.js
  function updateExportDurationFormatState() {
    const isDisabled = !elements.exportDurationInput.checked;
    elements.exportDurationFormatGroup.disabled = isDisabled;
    elements.exportDurationFormatGroup.classList.toggle(
      "is-disabled",
      isDisabled
    );
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
      elements.exportHistoryError.textContent = "\u958B\u59CB\u30FB\u7D42\u4E86\u6642\u9593\u307E\u305F\u306F\u4F5C\u696D\u6642\u9593\u30921\u3064\u4EE5\u4E0A\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044";
      return;
    }
    const hasExportableMemo = includeMemo && Object.values(historySession.dailyMemos).some((memo) => memo.trim());
    if (!state.records.length && !hasExportableMemo) {
      elements.exportHistoryError.textContent = "\u51FA\u529B\u3067\u304D\u308B\u5C65\u6B74\u307E\u305F\u306F\u65E5\u5225\u30E1\u30E2\u304C\u3042\u308A\u307E\u305B\u3093";
      return;
    }
    const durationFormat = new FormData(elements.exportHistoryForm).get(
      "export-duration-format"
    );
    const recordsByDate = /* @__PURE__ */ new Map();
    [...state.records].sort(
      (a, b) => a.date.localeCompare(b.date) || String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
    ).forEach((record) => {
      if (!recordsByDate.has(record.date)) recordsByDate.set(record.date, []);
      recordsByDate.get(record.date).push(record);
    });
    const dates = [
      .../* @__PURE__ */ new Set([
        ...recordsByDate.keys(),
        ...includeMemo ? Object.keys(historySession.dailyMemos).filter(
          (date) => historySession.dailyMemos[date].trim()
        ) : []
      ])
    ].sort();
    const lines = ["Simple Timer \u4F5C\u696D\u5C65\u6B74", ""];
    dates.forEach((date) => {
      lines.push(date);
      if (includeMemo && historySession.dailyMemos[date]) {
        lines.push(
          `\u65E5\u5225\u30E1\u30E2: ${historySession.dailyMemos[date].replace(/\n/g, "\n  ")}`
        );
      }
      const records = recordsByDate.get(date) || [];
      if (records.length) {
        const headings = ["\u4F5C\u696D\u540D"];
        if (includeTimeRange) headings.push("\u958B\u59CB\uFF5E\u7D42\u4E86");
        if (includeDuration) headings.push("\u4F5C\u696D\u6642\u9593");
        lines.push(headings.join("	"));
        records.forEach((record) => {
          const columns = [record.taskName];
          if (includeTimeRange)
            columns.push(formatHistoryTimeRange(record) || "\uFF5E");
          if (includeDuration) {
            columns.push(
              durationFormat === "clock" ? formatTime(record.durationMs) : `${Math.round(record.durationMs / 6e4)}\u5206`
            );
          }
          lines.push(columns.join("	"));
          if (includeMemo && record.memo)
            lines.push(`  \u30E1\u30E2: ${record.memo.replace(/\n/g, "\n    ")}`);
        });
      }
      lines.push("");
    });
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
      type: "text/plain;charset=utf-8"
    });
    downloadFile(blob, `simple-timer-history-${localDateKey()}.txt`);
    elements.exportHistoryDialog.close();
    elements.statusText.textContent = "\u5168\u5C65\u6B74\u3092TXT\u51FA\u529B\u3057\u307E\u3057\u305F";
    showToast("\u9078\u629E\u3057\u305F\u5185\u5BB9\u3067\u5C65\u6B74\u3092\u51FA\u529B\u3057\u307E\u3057\u305F");
  }
  function bindExportEvents() {
    elements.exportHistoryButton.addEventListener(
      "click",
      openExportHistoryDialog
    );
    elements.exportDurationInput.addEventListener(
      "change",
      updateExportDurationFormatState
    );
    elements.exportHistoryForm.addEventListener("submit", exportAllHistory);
  }

  // src/ui/activation.js
  function bindActivation(element, action) {
    element.addEventListener("click", action);
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      action();
    });
  }

  // src/features/settings/events.js
  function bindSettingsEvents() {
    elements.settingsButton.addEventListener("click", openSettingsDialog);
    elements.defaultModeSelect.addEventListener("change", () => {
      if (!Object.values(MODES).includes(elements.defaultModeSelect.value))
        return;
      storage.setItem(DEFAULT_MODE_KEY, elements.defaultModeSelect.value);
      if (!state.hasStarted && !state.isRunning && state.elapsedBeforeStartMs === 0) {
        state.mode = elements.defaultModeSelect.value;
        state.countdownSessionStartElapsedMs = 0;
        state.finishedAt = 0;
        saveState();
        render();
      }
      showToast("\u65B0\u3057\u3044\u30BF\u30A4\u30DE\u30FC\u306E\u521D\u671F\u30E2\u30FC\u30C9\u3092\u5909\u66F4\u3057\u307E\u3057\u305F");
    });
    elements.aggregationEnabledInput.addEventListener("change", () => {
      storage.setItem(
        AGGREGATION_ENABLED_KEY,
        String(elements.aggregationEnabledInput.checked)
      );
      if (elements.historyDialog.open) renderHistory();
      showToast(
        elements.aggregationEnabledInput.checked ? "\u9AD8\u5EA6\u306A\u8A08\u6E2C\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F" : "\u9AD8\u5EA6\u306A\u8A08\u6E2C\u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F"
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
      showToast("\u8868\u793A\u30C6\u30FC\u30DE\u3092\u5909\u66F4\u3057\u307E\u3057\u305F");
    });
    elements.primaryTimeDisplaySelect.addEventListener("change", () => {
      const value = elements.primaryTimeDisplaySelect.value;
      if (!["measurement", "clock"].includes(value)) return;
      storage.setItem(PRIMARY_TIME_DISPLAY_KEY, value);
      render();
      showToast(
        value === "measurement" ? "\u8A08\u6E2C\u6642\u9593\u3092\u5927\u304D\u304F\u8868\u793A\u3057\u307E\u3059" : "\u73FE\u5728\u6642\u523B\u3092\u5927\u304D\u304F\u8868\u793A\u3057\u307E\u3059"
      );
    });
    elements.defaultTimeFormatSelect.addEventListener("change", () => {
      setSharedTimeFormat(elements.defaultTimeFormatSelect.value, {
        saveDefault: true,
        notify: true
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
      if (!saveFinishSoundVolume(
        Number(elements.finishSoundVolumeNumberInput.value)
      )) {
        updateFinishSoundVolumeSetting();
      }
    });
    elements.previewFinishSoundButton.addEventListener("click", () => {
      if (getFinishSoundVolume() <= 0) {
        showToast("\u7D42\u4E86\u97F3\u306E\u97F3\u91CF\u306F0%\u3067\u3059");
        return;
      }
      playFinishSound();
    });
  }
  function bindDisplayEvents() {
    bindActivation(elements.timeDisplayArea, togglePrimaryTimeDisplay);
    elements.timeDisplay.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePrimaryTimeDisplay();
    });
    bindActivation(elements.secondaryTimeDisplay, togglePrimaryTimeDisplay);
    bindActivation(elements.cumulativeTimeDisplay, togglePrimaryTimeDisplay);
  }

  // src/features/todos/todos.js
  function renderTodos() {
    const list = elements.todoList;
    list.replaceChildren();
    const today = localDateKey();
    list.dataset.date = today;
    const todos = JSON.parse(storage.getItem(TODOS_KEY) || "[]");
    todos.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    if (!todos.length) {
      const empty = list.ownerDocument.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "Todo\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093";
      list.append(empty);
    }
    for (const todo of todos) {
      const row = list.ownerDocument.createElement("div");
      row.className = "history-item todo-item";
      row.classList.toggle("is-due-today", todo.due === today);
      row.classList.toggle("is-overdue", Boolean(todo.due) && todo.due < today);
      const details = list.ownerDocument.createElement("div");
      details.className = "history-item-details";
      const text = list.ownerDocument.createElement("strong");
      text.textContent = todo.text;
      const deadline = list.ownerDocument.createElement("small");
      deadline.className = "history-item-meta";
      deadline.textContent = `\u671F\u9650\uFF1A${todo.due || "\u672A\u6307\u5B9A"}`;
      details.append(text, deadline);
      const button = list.ownerDocument.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = "\u524A\u9664";
      button.setAttribute("aria-label", `${todo.text}\u3092\u524A\u9664`);
      button.addEventListener("click", () => {
        const latest = JSON.parse(storage.getItem(TODOS_KEY));
        storage.setItem(
          TODOS_KEY,
          JSON.stringify(latest.filter((item) => item.id !== todo.id))
        );
        renderTodos();
      });
      row.append(details, button);
      list.append(row);
    }
  }
  function initializeTodos() {
    const dialog = elements.todoDialog;
    elements.todoButton.addEventListener("click", () => {
      renderTodos();
      dialog.showModal();
    });
    elements.todoCloseButton.addEventListener("click", () => dialog.close());
    elements.todoForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = elements.todoText;
      const text = input.value.trim();
      if (!text) {
        input.focus();
        return;
      }
      const todos = JSON.parse(storage.getItem(TODOS_KEY));
      todos.push({
        id: crypto.randomUUID(),
        text,
        due: elements.todoDue.value
      });
      storage.setItem(TODOS_KEY, JSON.stringify(todos));
      event.target.reset();
      renderTodos();
      input.focus();
    });
  }

  // src/features/timer/day.js
  function updateDateTime(date = /* @__PURE__ */ new Date()) {
    const dateKey = localDateKey(date);
    const todoList = elements.todoList;
    if (elements.todoDialog.open && todoList.dataset.date !== dateKey)
      renderTodos();
    if (dateKey !== timerSession.activeStateDate && state.timerTabs.length && !timerSession.pendingNewDateKey) {
      const hasPreviousDayWork = state.timerTabs.some((tab) => {
        const elapsedMs = tab.id === state.activeTimerId ? getElapsedMs() : tab.elapsedBeforeStartMs;
        return elapsedMs > 0;
      });
      if (hasPreviousDayWork) openPreviousDayConfirm(dateKey);
      else resetTimersForNewDay(dateKey, false);
    }
    const currentSecond = Math.floor(date.getTime() / 1e3);
    if (currentSecond === timerSession.displayedClockSecond) return;
    timerSession.displayedClockSecond = currentSecond;
    const weekdays = ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"];
    const dateText = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    elements.recordDate.textContent = `${dateText}(${weekdays[date.getDay()]})`;
    timerSession.currentClockText = `${hours}:${minutes}:${seconds}`;
    if (elements.settingsDialog.open && isPastHistoryEditUnlocked())
      updatePastHistoryEditSetting();
    if (state.timerTabs.length) render();
  }
  function resetTimersForNewDay(dateKey = localDateKey(), notify = true) {
    stopTicking();
    const firstTab = createTimerTab(1);
    state.timerTabs = [firstTab];
    state.nextTimerNumber = 2;
    applyTimerTab(firstTab);
    timerSession.activeStateDate = dateKey;
    timerSession.timerTabsSignature = "";
    syncInputsFromDuration();
    saveState();
    render();
    if (notify) showToast("\u524D\u65E5\u5206\u306E\u8A08\u6E2C\u9014\u4E2D\u30C7\u30FC\u30BF\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F");
  }
  function startDateTimeUpdates() {
    if (timerSession.dateTimeIntervalId || timerSession.pendingNewDateKey) return;
    const scheduleNextUpdate = () => {
      if (timerSession.pendingNewDateKey) {
        timerSession.dateTimeIntervalId = 0;
        return;
      }
      updateDateTime();
      if (timerSession.pendingNewDateKey) {
        timerSession.dateTimeIntervalId = 0;
        return;
      }
      const delay = Math.max(20, 1e3 - Date.now() % 1e3 + 10);
      timerSession.dateTimeIntervalId = window.setTimeout(
        scheduleNextUpdate,
        delay
      );
    };
    scheduleNextUpdate();
  }
  function stopDateTimeUpdates() {
    if (!timerSession.dateTimeIntervalId) return;
    window.clearTimeout(timerSession.dateTimeIntervalId);
    timerSession.dateTimeIntervalId = 0;
  }
  function openPreviousDayConfirm(newDateKey) {
    freezeRunningTimer();
    snapshotActiveTimer();
    saveState();
    timerSession.pendingNewDateKey = newDateKey;
    stopDateTimeUpdates();
    const totalMs = state.timerTabs.reduce(
      (total, tab) => total + Math.max(0, tab.elapsedBeforeStartMs),
      0
    );
    elements.previousDayConfirmMessage.textContent = `${formatHistoryDateLabel(timerSession.activeStateDate)}\u306E\u4F5C\u696D\u6642\u9593 ${formatTime(totalMs)} \u304C\u6B8B\u3063\u3066\u3044\u307E\u3059\u3002`;
    elements.previousDayConfirmOverlay.hidden = false;
    elements.recordPreviousDayButton.focus();
  }
  function finishPreviousDayResolution(message) {
    const newDateKey = timerSession.pendingNewDateKey || localDateKey();
    timerSession.pendingNewDateKey = "";
    elements.previousDayConfirmOverlay.hidden = true;
    resetTimersForNewDay(newDateKey, false);
    updateDateTime();
    startDateTimeUpdates();
    showToast(message);
  }
  function resetPreviousDayWork() {
    finishPreviousDayResolution("\u524D\u65E5\u5206\u306E\u4F5C\u696D\u6642\u9593\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F");
  }
  function recordPreviousDayWork() {
    const [year, month, day] = timerSession.activeStateDate.split("-").map(Number);
    const endOfSavedDate = new Date(year, month - 1, day + 1).getTime() - 1;
    const addedAt = Number.isFinite(endOfSavedDate) ? endOfSavedDate : now();
    state.timerTabs.forEach((tab) => {
      if (tab.elapsedBeforeStartMs <= 0) return;
      state.records.push({
        id: `${now()}-${Math.random().toString(16).slice(2)}`,
        date: timerSession.activeStateDate,
        taskName: normalizeTaskName(tab.taskName) || `\u30BF\u30A4\u30DE\u30FC ${tab.number}`,
        memo: typeof tab.taskMemo === "string" ? tab.taskMemo : "",
        durationMs: Math.round(tab.elapsedBeforeStartMs),
        mode: tab.mode,
        firstStartedAt: Number.isFinite(tab.firstStartedAt) && tab.firstStartedAt > 0 ? new Date(tab.firstStartedAt).toISOString() : void 0,
        createdAt: new Date(addedAt).toISOString()
      });
    });
    saveRecords();
    finishPreviousDayResolution("\u524D\u65E5\u5206\u3092\u4F5C\u696D\u5C65\u6B74\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F");
  }

  // src/features/timer/events.js
  function bindTimerEvents() {
    elements.resetPreviousDayButton.addEventListener(
      "click",
      resetPreviousDayWork
    );
    elements.recordPreviousDayButton.addEventListener(
      "click",
      recordPreviousDayWork
    );
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
    elements.cancelTimerNavigationButton.addEventListener(
      "click",
      closeTimerNavigationConfirm
    );
    elements.confirmTimerNavigationButton.addEventListener(
      "click",
      confirmTimerNavigation
    );
    elements.timerNavigationConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.timerNavigationConfirmOverlay)
        closeTimerNavigationConfirm();
    });
    elements.cancelModeSwitchButton.addEventListener(
      "click",
      closeModeSwitchConfirm
    );
    elements.confirmModeSwitchButton.addEventListener("click", confirmModeSwitch);
    elements.modeSwitchConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.modeSwitchConfirmOverlay)
        closeModeSwitchConfirm();
    });
    elements.cancelTimerTabDeleteButton.addEventListener(
      "click",
      closeTimerTabConfirm
    );
    elements.confirmTimerTabDeleteButton.addEventListener(
      "click",
      confirmCloseTimerTab
    );
    elements.timerTabConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.timerTabConfirmOverlay)
        closeTimerTabConfirm();
    });
    elements.modeTabs.forEach(
      (tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode))
    );
    elements.startPauseButton.addEventListener(
      "pointerdown",
      handleTimerPointerDown
    );
    elements.startPauseButton.addEventListener("click", handleTimerClick);
    elements.compactStartPauseButton.addEventListener(
      "pointerdown",
      handleTimerPointerDown
    );
    elements.compactStartPauseButton.addEventListener("click", handleTimerClick);
    elements.resetButton.addEventListener("click", requestResetOrFinishBreak);
    elements.cancelResetButton.addEventListener("click", closeResetConfirm);
    elements.confirmResetButton.addEventListener("click", confirmResetTimer);
    elements.resetConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.resetConfirmOverlay) closeResetConfirm();
    });
    elements.nextTaskButton.addEventListener("click", moveToNextTask);
  }

  // src/ui/events.js
  function bindCommonEvents() {
    elements.toastUndoButton.addEventListener("click", () => {
      const action = toastSession.toastUndoAction;
      toastSession.toastUndoAction = null;
      elements.toastUndoButton.hidden = true;
      if (action) action();
    });
    elements.closeDialogButtons.forEach(
      (button) => button.addEventListener("click", () => {
        const dialog = button.closest("dialog");
        if (dialog === elements.historyDialog && !canCloseHistoryWithMemo())
          return;
        dialog.close();
      })
    );
    document.addEventListener("keydown", handleKeyboard);
  }

  // src/core/events.js
  function bindEvents() {
    bindTimerEvents();
    bindSettingsEvents();
    bindDisplayEvents();
    bindCommonEvents();
    bindPopupEvents();
    bindBackupEvents();
    bindCountdownEvents();
    bindTasksEvents();
    bindHistoryEvents();
    bindSummaryEvents();
    bindEditorEvents();
    bindExportEvents();
    bindLifecycleEvents();
  }

  // src/main.js
  function initialize() {
    applyTheme();
    if (storage.getItem(DEFAULT_MODE_KEY) === "pomodoro") {
      storage.setItem(DEFAULT_MODE_KEY, MODES.COUNTDOWN);
    }
    loadState();
    state.historyUnit = getDefaultTimeFormat();
    historySession.workSummaryUnit = state.historyUnit;
    loadDailyMemos();
    loadWorkdayTimes();
    const isPopup = new URLSearchParams(location.search).has("popup");
    elements.body.classList.toggle("is-popup", isPopup);
    if (isPopup) popupSession.suppressPopupSizeSaveUntil = now() + 1200;
    syncInputsFromDuration();
    bindEvents();
    initializeTodos();
    window.addEventListener("storage", (event) => {
      if (!event.key || [RECORDS_KEY, DAILY_MEMOS_KEY, WORKDAY_TIMES_KEY, TODOS_KEY].some(
        (key) => event.key === key || event.key.startsWith(`${key}:item:`)
      )) {
        loadRecords();
        if (!historySession.dailyMemoDirty) loadDailyMemos();
        loadWorkdayTimes();
        renderHistory();
        renderTodos();
      }
    });
    updateDateTime();
    startDateTimeUpdates();
    render();
    if (isPopup) {
      window.requestAnimationFrame(
        () => applyPopupSize(window, getPreferredPopupSize(window))
      );
    }
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        showToast("\u30AA\u30D5\u30E9\u30A4\u30F3\u6A5F\u80FD\u3092\u6E96\u5099\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F");
      });
    }
    window.addEventListener(
      "offline",
      () => showToast("\u30AA\u30D5\u30E9\u30A4\u30F3\u306B\u306A\u308A\u307E\u3057\u305F\u3002\u4FDD\u5B58\u6E08\u307F\u306E\u6A5F\u80FD\u3092\u5229\u7528\u3067\u304D\u307E\u3059")
    );
    window.addEventListener("online", () => showToast("\u30AA\u30F3\u30E9\u30A4\u30F3\u306B\u623B\u308A\u307E\u3057\u305F"));
    window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (getTheme() === "system") applyTheme("system");
    });
  }
  initialize();
})();
