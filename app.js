(function () {
  const STORAGE_KEY = "simple-timer-state";
  const RECORDS_KEY = "simple-timer-records";
  const POPUP_SIZE_KEY = "simple-timer-popup-size";
  const MINIMIZED_POPUP_SIZE_KEY = "simple-timer-minimized-popup-size";
  const DEFAULT_MODE_KEY = "simple-timer-default-mode";
  const AGGREGATION_ENABLED_KEY = "simple-timer-aggregation-enabled";
  const MODES = { COUNTDOWN: "countdown", STOPWATCH: "stopwatch" };
  const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;
  const TICK_INTERVAL_MS = 250;
  const POPUP_SIZE_LIMITS = { minWidth: 320, maxWidth: 720, minHeight: 120, maxHeight: 900 };
  const OPTIMAL_POPUP_MIN_HEIGHT = 360;

  const elements = {
    body: document.body,
    app: document.querySelector(".app"),
    panel: document.querySelector(".timer-panel"),
    statusText: document.querySelector("#status-text"),
    recordDate: document.querySelector("#record-date"),
    toast: document.querySelector("#toast"),
    previousDayConfirmOverlay: document.querySelector("#previous-day-confirm-overlay"),
    previousDayConfirmMessage: document.querySelector("#previous-day-confirm-message"),
    resetPreviousDayButton: document.querySelector("#reset-previous-day-button"),
    recordPreviousDayButton: document.querySelector("#record-previous-day-button"),
    timeDisplay: document.querySelector("#time-display"),
    cumulativeTimeDisplay: document.querySelector("#cumulative-time-display"),
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
    addHistoryButton: document.querySelector("#add-history-button"),
    exportHistoryButton: document.querySelector("#export-history-button"),
    addHistoryDialog: document.querySelector("#add-history-dialog"),
    addHistoryForm: document.querySelector("#add-history-form"),
    manualDate: document.querySelector("#manual-date"),
    manualTaskInput: document.querySelector("#manual-task-input"),
    manualMemoInput: document.querySelector("#manual-memo-input"),
    manualHoursInput: document.querySelector("#manual-hours-input"),
    manualMinutesInput: document.querySelector("#manual-minutes-input"),
    manualSecondsInput: document.querySelector("#manual-seconds-input"),
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
  let timerPointerHandledAt = 0;
  let audioContext = null;
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
    elements.recordDate.textContent = `${dateText}(${weekdays[date.getDay()]}) ${hours}:${minutes}:${seconds}`;
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
    dateTimeIntervalId = window.setInterval(updateDateTime, 1000);
  }

  function stopDateTimeUpdates() {
    if (!dateTimeIntervalId) return;
    window.clearInterval(dateTimeIntervalId);
    dateTimeIntervalId = 0;
  }

  function openPreviousDayConfirm(newDateKey) {
    if (state.isRunning) {
      state.elapsedBeforeStartMs = getElapsedMs();
      state.isRunning = false;
      state.startedAt = 0;
      stopTicking();
    }
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
      taskName: "",
      taskMemo: "",
      firstStartedAt: 0,
      finishedAt: 0,
      hasStarted: false,
    };
  }

  function getDefaultMode() {
    const savedMode = localStorage.getItem(DEFAULT_MODE_KEY);
    return Object.values(MODES).includes(savedMode) ? savedMode : MODES.COUNTDOWN;
  }

  function isValidTimerTab(tab) {
    return tab && typeof tab.id === "string" && Number.isFinite(tab.number) &&
      Object.values(MODES).includes(tab.mode) &&
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
    tab.taskName = state.taskName;
    tab.taskMemo = state.taskMemo;
    tab.firstStartedAt = state.firstStartedAt;
    tab.finishedAt = state.finishedAt;
    tab.hasStarted = state.hasStarted;
  }

  function applyTimerTab(tab) {
    state.activeTimerId = tab.id;
    state.mode = tab.mode;
    state.isRunning = false;
    state.startedAt = 0;
    state.elapsedBeforeStartMs = tab.elapsedBeforeStartMs;
    state.countdownSessionStartElapsedMs = Number.isFinite(tab.countdownSessionStartElapsedMs)
      ? Math.min(tab.countdownSessionStartElapsedMs, tab.elapsedBeforeStartMs)
      : 0;
    state.countdownDurationMs = tab.countdownDurationMs;
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

  function getElapsedMs() {
    return state.isRunning
      ? state.elapsedBeforeStartMs + now() - state.startedAt
      : state.elapsedBeforeStartMs;
  }

  function getRecordedElapsedMs() {
    return getElapsedMs();
  }

  function getCountdownSessionElapsedMs() {
    return Math.max(0, getElapsedMs() - state.countdownSessionStartElapsedMs);
  }

  function getDisplayMs() {
    return state.mode === MODES.STOPWATCH
      ? getElapsedMs()
      : Math.max(0, state.countdownDurationMs - getCountdownSessionElapsedMs());
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

  function syncInputsFromDuration() {
    const totalSeconds = Math.round(state.countdownDurationMs / 1000);
    elements.hoursInput.value = String(Math.floor(totalSeconds / 3600));
    elements.minutesInput.value = String(Math.floor((totalSeconds % 3600) / 60));
    elements.secondsInput.value = String(totalSeconds % 60);
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
    return record.mode === "manual" || Number.isNaN(storedStartedAt.getTime())
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

  function normalizePopupSize(size) {
    if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) return null;
    return {
      width: Math.round(clamp(size.width, POPUP_SIZE_LIMITS.minWidth, POPUP_SIZE_LIMITS.maxWidth)),
      height: Math.round(clamp(size.height, POPUP_SIZE_LIMITS.minHeight, POPUP_SIZE_LIMITS.maxHeight)),
    };
  }

  function loadStoredPopupSize(key) {
    try {
      return normalizePopupSize(JSON.parse(localStorage.getItem(key) || "null"));
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
    const availableWidth = Number.isFinite(screen.availWidth) ? screen.availWidth - 32 : POPUP_SIZE_LIMITS.maxWidth;
    const availableHeight = Number.isFinite(screen.availHeight) ? screen.availHeight - 48 : POPUP_SIZE_LIMITS.maxHeight;
    const appStyle = view.getComputedStyle(elements.app);
    const header = elements.app.querySelector(".app-header");
    const headerHeight = Math.ceil(header.getBoundingClientRect().height);
    const verticalPadding = (Number.parseFloat(appStyle.paddingTop) || 0) + (Number.parseFloat(appStyle.paddingBottom) || 0);
    const horizontalPadding = (Number.parseFloat(appStyle.paddingLeft) || 0) + (Number.parseFloat(appStyle.paddingRight) || 0);
    const isCurrentlyMinimized = state.isMinimized && isPopupContext();
    const timerHeight = isCurrentlyMinimized
      ? elements.timeDisplay.getBoundingClientRect().height + elements.cumulativeTimeDisplay.getBoundingClientRect().height
      : 96;
    const contentHeight = headerHeight + timerHeight + verticalPadding + 4;
    const contentWidth = isCurrentlyMinimized ? header.scrollWidth + horizontalPadding : 360;
    const size = {
      width: Math.round(clamp(contentWidth, POPUP_SIZE_LIMITS.minWidth, Math.min(POPUP_SIZE_LIMITS.maxWidth, availableWidth))),
      height: Math.round(clamp(contentHeight, POPUP_SIZE_LIMITS.minHeight, Math.min(POPUP_SIZE_LIMITS.maxHeight, availableHeight))),
    };
    elements.app.style.zoom = previousZoom;
    return size;
  }

  function fitPopupSizeToScreen(size, view = window) {
    const screen = view.screen || window.screen;
    const maximumWidth = Math.min(POPUP_SIZE_LIMITS.maxWidth, Math.max(POPUP_SIZE_LIMITS.minWidth, screen.availWidth - 32));
    const maximumHeight = Math.min(POPUP_SIZE_LIMITS.maxHeight, Math.max(POPUP_SIZE_LIMITS.minHeight, screen.availHeight - 48));
    return {
      width: Math.round(clamp(size.width, POPUP_SIZE_LIMITS.minWidth, maximumWidth)),
      height: Math.round(clamp(size.height, POPUP_SIZE_LIMITS.minHeight, maximumHeight)),
    };
  }

  function getPreferredPopupSize(view = window) {
    const savedSize = loadSavedPopupSize();
    return savedSize ? fitPopupSizeToScreen(savedSize, view) : calculateOptimalPopupSize(view);
  }

  function savePopupSize(size, isMinimized = false) {
    const normalized = normalizePopupSize(size);
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
    updatePopupSizeSettings();
    elements.settingsDialog.showModal();
  }

  function schedulePopupSizeSave(view) {
    if (!isPopupContext() || now() < suppressPopupSizeSaveUntil) return;
    const sizeAtResize = { width: view.innerWidth, height: view.innerHeight };
    const wasMinimizedAtResize = state.isMinimized;
    window.clearTimeout(popupResizeSaveId);
    popupResizeSaveId = window.setTimeout(() => {
      if (!isPopupContext() || now() < suppressPopupSizeSaveUntil) return;
      savePopupSize(sizeAtResize, wasMinimizedAtResize);
      popupResizeSaveId = 0;
    }, 350);
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
      applyPopupSize(view, fitPopupSizeToScreen(calculateOptimalMinimizedPopupSize(view), view));
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
    if (state.isRunning) {
      state.elapsedBeforeStartMs = getElapsedMs();
      state.isRunning = false;
      state.startedAt = 0;
      stopTicking();
    }
    snapshotActiveTimer();
    applyTimerTab(nextTab);
    syncInputsFromDuration();
    timerTabsSignature = "";
    saveState();
    render();
  }

  function performAddTimerTab() {
    if (state.isRunning) {
      state.elapsedBeforeStartMs = getElapsedMs();
      state.isRunning = false;
      state.startedAt = 0;
      stopTicking();
    }
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
    if (tab.id === state.activeTimerId && state.isRunning) stopTicking();
    const index = state.timerTabs.indexOf(tab);
    state.timerTabs.splice(index, 1);
    if (tab.id === state.activeTimerId) {
      applyTimerTab(state.timerTabs[Math.min(index, state.timerTabs.length - 1)]);
      syncInputsFromDuration();
    }
    timerTabsSignature = "";
    saveState();
    render();
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
    showToast("タイマータブを削除しました");
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
  }

  function updateStatus() {
    if (state.finishedAt) elements.statusText.textContent = "完了";
    else if (state.isRunning) elements.statusText.textContent = state.mode === MODES.COUNTDOWN ? "集中時間を計測中" : "作業時間を計測中";
    else if (state.mode === MODES.COUNTDOWN && state.elapsedBeforeStartMs > 0 && getCountdownSessionElapsedMs() === 0) {
      elements.statusText.textContent = "作業時間を保持して待機中";
    }
    else if (state.elapsedBeforeStartMs > 0) elements.statusText.textContent = "一時停止中";
    else elements.statusText.textContent = "待機中";
  }

  function isFinishedCountdown() {
    return state.mode === MODES.COUNTDOWN && state.finishedAt > 0;
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
  }

  function render() {
    if (state.mode === MODES.COUNTDOWN && state.isRunning && getDisplayMs() <= 0) {
      finishCountdown();
      return;
    }
    updateDocumentTitle();
    elements.taskNameDisplay.textContent = state.taskName || "タスク名を入力";
    elements.timeDisplay.textContent = formatTime(getDisplayMs(), state.mode === MODES.COUNTDOWN ? "ceil" : "floor");
    elements.cumulativeTimeDisplay.hidden = state.mode !== MODES.COUNTDOWN;
    elements.cumulativeTimeDisplay.textContent = `作業時間 ${formatTime(getElapsedMs())}`;
    const canResumeCurrentSession = state.mode === MODES.STOPWATCH
      ? state.elapsedBeforeStartMs > 0
      : getCountdownSessionElapsedMs() > 0;
    const primaryActionLabel = isFinishedCountdown()
      ? "同じタスクで計測"
      : state.isRunning
        ? "一時停止"
        : canResumeCurrentSession
          ? "再開"
          : "開始";
    elements.startPauseButton.textContent = primaryActionLabel;
    elements.compactStartPauseButton.textContent = isFinishedCountdown()
      ? "追加設定"
      : state.isRunning
        ? "一時停止"
        : canResumeCurrentSession
          ? "再開"
          : "開始";
    elements.panel.classList.toggle("is-finished", state.finishedAt > 0);
    renderTimerTabs();
    getCurrentBody().classList.toggle("is-minimized", state.isMinimized && isPopupContext());
    elements.minimizeButton.querySelector("span").textContent = state.isMinimized ? "□" : "−";
    updateModeUi();
    updateStatus();
    scheduleFitControlButtonText();
    scheduleFitPopupContent();
  }

  function startTimer() {
    state.timerTabs.forEach((tab) => {
      if (tab.id !== state.activeTimerId) {
        tab.isRunning = false;
        tab.startedAt = 0;
      }
    });
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      if (state.finishedAt || getCountdownSessionElapsedMs() >= state.countdownDurationMs) {
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
    state.elapsedBeforeStartMs = getElapsedMs();
    state.isRunning = false;
    state.startedAt = 0;
    stopTicking();
    saveState();
    render();
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
    state.isRunning = false;
    state.startedAt = 0;
    state.elapsedBeforeStartMs = 0;
    state.countdownSessionStartElapsedMs = 0;
    state.finishedAt = 0;
    state.hasStarted = false;
    state.taskName = "";
    state.taskMemo = "";
    state.firstStartedAt = 0;
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
    resetTimer();
    showToast("履歴に追加せずリセットしました");
  }

  function isResetConfirmOpen() {
    return !elements.resetConfirmOverlay.hidden;
  }

  function finishCountdown() {
    state.elapsedBeforeStartMs = state.countdownSessionStartElapsedMs + state.countdownDurationMs;
    state.isRunning = false;
    state.startedAt = 0;
    state.finishedAt = now();
    state.hasStarted = true;
    stopTicking();
    saveState();
    playFinishSound();
    render();
  }

  function performModeSwitch(mode) {
    if (state.mode === mode) return;
    if (state.isRunning) {
      state.elapsedBeforeStartMs = getElapsedMs();
      stopTicking();
    }
    state.isRunning = false;
    state.startedAt = 0;
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
    if (state.isRunning) {
      state.elapsedBeforeStartMs = getElapsedMs();
      state.isRunning = false;
      state.startedAt = 0;
      stopTicking();
    }
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

  function showToast(message) {
    window.clearTimeout(toastId);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastId = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 3000);
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
    const records = state.records.filter((record) => record.date === elements.historyDate.value);
    const isViewingToday = elements.historyDate.value === localDateKey();
    elements.historyDialog.classList.toggle("is-viewing-past", !isViewingToday);
    elements.historyDateContext.hidden = isViewingToday;
    elements.addHistoryButton.hidden = !isViewingToday;
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
    const availableDates = [...new Set([today, ...state.records.map((record) => record.date)])]
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
    editingRecord.taskName = taskName;
    editingRecord.memo = elements.editMemoInput.value.trim().slice(0, 300);
    editingRecord.updatedAt = new Date().toISOString();
    editingRecord.durationMs = durationMs;
    saveRecords();
    elements.editHistoryDialog.close();
    renderHistory();
    showToast("作業履歴を変更しました");
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
    if (state.isRunning) {
      state.elapsedBeforeStartMs = getElapsedMs();
      state.isRunning = false;
      state.startedAt = 0;
      stopTicking();
    }
    snapshotActiveTimer();
    const tab = createTimerTab(state.nextTimerNumber);
    state.nextTimerNumber += 1;
    tab.mode = Object.values(MODES).includes(record.mode) ? record.mode : getDefaultMode();
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
    state.records.splice(recordIndex, 1);
    closeDeleteConfirm();
    if (elements.editHistoryDialog.open) elements.editHistoryDialog.close();
    saveRecords();
    renderHistoryDateOptions();
    renderHistory();
    showToast("作業履歴を削除しました");
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

  function normalizeManualDurationInputs() {
    return normalizeDurationInputs(
      [elements.manualHoursInput, elements.manualMinutesInput, elements.manualSecondsInput],
      elements.manualHistoryError,
    );
  }

  function normalizeEditDurationInputs() {
    return normalizeDurationInputs(
      [elements.editHoursInput, elements.editMinutesInput, elements.editSecondsInput],
      elements.editHistoryError,
    );
  }

  function addManualHistory(event) {
    event.preventDefault();
    const taskName = resolveTaskName(elements.manualTaskInput.value);
    const durationMs = normalizeManualDurationInputs();

    if (durationMs === null) return;
    if (!taskName) {
      elements.manualHistoryError.textContent = "タスク名を入力してください";
      return;
    }
    if (durationMs < 1000) {
      elements.manualHistoryError.textContent = "作業時間を1秒以上入力してください";
      return;
    }

    const addedAt = now();
    state.records.push({
      id: `${addedAt}-${Math.random().toString(16).slice(2)}`,
      date: localDateKey(),
      taskName,
      memo: elements.manualMemoInput.value.trim().slice(0, 300),
      durationMs,
      mode: "manual",
      createdAt: new Date(addedAt).toISOString(),
    });
    saveRecords();
    renderHistoryDateOptions(localDateKey());
    renderHistory();
    elements.addHistoryDialog.close();
    elements.statusText.textContent = "作業履歴を追加しました";
  }

  function exportAllHistory() {
    if (!state.records.length) {
      elements.historyList.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "出力できる記録がありません";
      elements.historyList.append(empty);
      return;
    }

    const recordsByDate = new Map();
    [...state.records]
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
      .forEach((record) => {
        if (!recordsByDate.has(record.date)) recordsByDate.set(record.date, []);
        recordsByDate.get(record.date).push(record);
      });

    const taskColumnWidth = Math.max(12, ...state.records.map((record) => displayWidth(record.taskName))) + 2;
    const minuteValues = state.records.map((record) => `${Math.round(record.durationMs / 60000)}分`);
    const minuteColumnWidth = Math.max(4, ...minuteValues.map(displayWidth)) + 2;
    const lines = ["Simple Timer 作業履歴", ""];
    recordsByDate.forEach((records, date) => {
      lines.push(date);
      lines.push(`${padDisplayEnd("作業名", taskColumnWidth)}${padDisplayEnd("分", minuteColumnWidth)}時間`);
      records.forEach((record) => {
        const minutes = `${Math.round(record.durationMs / 60000)}分`;
        lines.push(`${padDisplayEnd(record.taskName, taskColumnWidth)}${padDisplayEnd(minutes, minuteColumnWidth)}${formatTime(record.durationMs)}`);
      });
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
    elements.statusText.textContent = "全履歴をTXT出力しました";
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
      applyPopupSize(view, fitPopupSizeToScreen(minimizedSize, view));
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
      const hadSavedSize = Boolean(loadSavedPopupSize());
      const pipWindow = await pip.requestWindow(getPreferredPopupSize(window));
      const styleLink = pipWindow.document.createElement("link");
      styleLink.rel = "stylesheet"; styleLink.href = "./styles.css";
      pipWindow.document.head.append(styleLink);
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
      if (!hadSavedSize) {
        const fitToContent = () => resizePopupWindow(pipWindow, calculateOptimalPopupSize(pipWindow));
        styleLink.addEventListener("load", () => pipWindow.requestAnimationFrame(fitToContent), { once: true });
        pipWindow.requestAnimationFrame(() => pipWindow.requestAnimationFrame(fitToContent));
      }
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

  function handleKeyboard(event) {
    if (pendingNewDateKey) return;
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
    if (["input", "textarea", "button"].includes(event.target.tagName.toLowerCase()) || elements.app.ownerDocument.querySelector("dialog[open]")) return;
    if (event.code === "Space") {
      event.preventDefault();
      isFinishedCountdown() ? prepareAdditionalCountdown() : state.isRunning ? pauseTimer() : startTimer();
    }
    else if (event.key.toLowerCase() === "r") requestResetTimer();
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
    elements.resetPopupSizeButton.addEventListener("click", resetPopupSize);
    elements.resetMinimizedPopupSizeButton.addEventListener("click", resetMinimizedPopupSize);
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
    [elements.hoursInput, elements.minutesInput, elements.secondsInput].forEach((input) => input.addEventListener("change", () => {
      setCountdownDuration(getDurationFromInputs() / 1000);
    }));
    elements.presetButtons.forEach((button) => button.addEventListener("click", () => setCountdownDuration(Number.parseInt(button.dataset.seconds, 10))));
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
    elements.historyDialog.addEventListener("close", () => { if (isDeleteConfirmOpen()) closeDeleteConfirm(); });
    elements.historyDate.addEventListener("change", renderHistory);
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
    elements.exportHistoryButton.addEventListener("click", exportAllHistory);
    elements.cancelDeleteButton.addEventListener("click", closeDeleteConfirm);
    elements.confirmDeleteButton.addEventListener("click", confirmDeleteHistoryRecord);
    elements.confirmOverlay.addEventListener("click", (event) => {
      if (event.target === elements.confirmOverlay) closeDeleteConfirm();
    });
    elements.closeDialogButtons.forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
    elements.startPauseButton.addEventListener("pointerdown", handleTimerPointerDown);
    elements.startPauseButton.addEventListener("click", handleTimerClick);
    elements.compactStartPauseButton.addEventListener("pointerdown", handleTimerPointerDown);
    elements.compactStartPauseButton.addEventListener("click", handleTimerClick);
    elements.resetButton.addEventListener("click", requestResetTimer);
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
      if (!hasStartedTimer()) return;
      saveState();
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function initialize() {
    loadState();
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
  }

  initialize();
})();
