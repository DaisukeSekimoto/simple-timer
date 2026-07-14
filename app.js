(function () {
  const STORAGE_KEY = "simple-timer-state";
  const RECORDS_KEY = "simple-timer-records";
  const MODES = { COUNTDOWN: "countdown", STOPWATCH: "stopwatch" };
  const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;
  const TICK_INTERVAL_MS = 250;
  const POPUP_SIZE = { width: 400, height: 640 };
  const MINIMIZED_POPUP_SIZE = { width: 320, height: 205 };

  const elements = {
    body: document.body,
    app: document.querySelector(".app"),
    panel: document.querySelector(".timer-panel"),
    statusText: document.querySelector("#status-text"),
    recordDate: document.querySelector("#record-date"),
    toast: document.querySelector("#toast"),
    timeDisplay: document.querySelector("#time-display"),
    popupButton: document.querySelector("#popup-button"),
    minimizeButton: document.querySelector("#minimize-button"),
    historyButton: document.querySelector("#history-button"),
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
    taskDialog: document.querySelector("#task-dialog"),
    taskDialogForm: document.querySelector("#task-dialog-form"),
    recentTaskList: document.querySelector("#recent-task-list"),
    manualRecentTaskList: document.querySelector("#manual-recent-task-list"),
    historyDialog: document.querySelector("#history-dialog"),
    historyDate: document.querySelector("#history-date"),
    historyList: document.querySelector("#history-list"),
    addHistoryButton: document.querySelector("#add-history-button"),
    exportHistoryButton: document.querySelector("#export-history-button"),
    addHistoryDialog: document.querySelector("#add-history-dialog"),
    addHistoryForm: document.querySelector("#add-history-form"),
    manualDate: document.querySelector("#manual-date"),
    manualTaskInput: document.querySelector("#manual-task-input"),
    manualHoursInput: document.querySelector("#manual-hours-input"),
    manualMinutesInput: document.querySelector("#manual-minutes-input"),
    manualSecondsInput: document.querySelector("#manual-seconds-input"),
    manualHistoryError: document.querySelector("#manual-history-error"),
    editHistoryDialog: document.querySelector("#edit-history-dialog"),
    editHistoryForm: document.querySelector("#edit-history-form"),
    editTaskInput: document.querySelector("#edit-task-input"),
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
    resetButton: document.querySelector("#reset-button"),
    nextTaskButton: document.querySelector("#next-task-button"),
  };

  const state = {
    mode: MODES.COUNTDOWN,
    isRunning: false,
    startedAt: 0,
    elapsedBeforeStartMs: 0,
    countdownDurationMs: DEFAULT_COUNTDOWN_SECONDS * 1000,
    taskName: "",
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

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function updateDateTime(date = new Date()) {
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
    const firstColon = document.createElement("span");
    const secondColon = document.createElement("span");
    const colonClassName = date.getSeconds() % 2 === 0 ? "clock-colon" : "clock-colon is-hidden";
    firstColon.className = colonClassName;
    secondColon.className = colonClassName;
    firstColon.textContent = ":";
    secondColon.textContent = ":";
    elements.recordDate.replaceChildren(
      document.createTextNode(`${dateText}(${weekdays[date.getDay()]}) ${hours}`),
      firstColon,
      document.createTextNode(minutes),
      secondColon,
      document.createTextNode(seconds),
    );
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
      mode: MODES.COUNTDOWN,
      isRunning: false,
      startedAt: 0,
      elapsedBeforeStartMs: 0,
      countdownDurationMs: DEFAULT_COUNTDOWN_SECONDS * 1000,
      taskName: "",
      finishedAt: 0,
      hasStarted: false,
    };
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
    tab.countdownDurationMs = state.countdownDurationMs;
    tab.taskName = state.taskName;
    tab.finishedAt = state.finishedAt;
    tab.hasStarted = state.hasStarted;
  }

  function applyTimerTab(tab) {
    state.activeTimerId = tab.id;
    state.mode = tab.mode;
    state.isRunning = false;
    state.startedAt = 0;
    state.elapsedBeforeStartMs = tab.elapsedBeforeStartMs;
    state.countdownDurationMs = tab.countdownDurationMs;
    state.taskName = tab.taskName;
    state.finishedAt = tab.finishedAt || 0;
    state.hasStarted = tab.hasStarted === true;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const savedTabs = Array.isArray(saved.timerTabs) ? saved.timerTabs.filter(isValidTimerTab) : [];
      if (savedTabs.length) {
        state.timerTabs = savedTabs.map((tab) => ({
          ...tab,
          taskName: tab.taskName.slice(0, 80),
          isRunning: false,
          startedAt: 0,
          hasStarted: tab.hasStarted === true || tab.elapsedBeforeStartMs > 0 || tab.finishedAt > 0,
        }));
        state.nextTimerNumber = Math.max(...state.timerTabs.map((tab) => tab.number)) + 1;
        const activeTab = state.timerTabs.find((tab) => tab.id === saved.activeTimerId) || state.timerTabs[0];
        applyTimerTab(activeTab);
      } else {
        const firstTab = createTimerTab(1);
        if (Object.values(MODES).includes(saved.mode)) firstTab.mode = saved.mode;
        if (Number.isFinite(saved.countdownDurationMs) && saved.countdownDurationMs > 0) {
          firstTab.countdownDurationMs = saved.countdownDurationMs;
        }
        if (typeof saved.taskName === "string") firstTab.taskName = saved.taskName.slice(0, 80);
        state.timerTabs = [firstTab];
        state.nextTimerNumber = 2;
        applyTimerTab(firstTab);
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
      );
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
    const elapsed = getElapsedMs();
    return state.mode === MODES.COUNTDOWN ? Math.min(state.countdownDurationMs, elapsed) : elapsed;
  }

  function getDisplayMs() {
    return state.mode === MODES.STOPWATCH
      ? getElapsedMs()
      : Math.max(0, state.countdownDurationMs - getElapsedMs());
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
  }

  function scheduleFitControlButtonText() {
    const view = elements.app.ownerDocument.defaultView || window;
    view.cancelAnimationFrame(fitButtonsFrame);
    fitButtonsFrame = view.requestAnimationFrame(fitControlButtonText);
  }

  function render() {
    if (state.mode === MODES.COUNTDOWN && state.isRunning && getDisplayMs() <= 0) {
      finishCountdown();
      return;
    }
    elements.taskNameDisplay.textContent = state.taskName || "タスク名を入力";
    elements.timeDisplay.textContent = formatTime(getDisplayMs(), state.mode === MODES.COUNTDOWN ? "ceil" : "floor");
    elements.startPauseButton.textContent = isFinishedCountdown()
      ? "次の作業に移る\n（履歴へ追加）"
      : state.isRunning
        ? "一時停止"
        : state.elapsedBeforeStartMs > 0
          ? "再開"
          : "開始";
    elements.panel.classList.toggle("is-finished", state.finishedAt > 0);
    renderTimerTabs();
    getCurrentBody().classList.toggle("is-minimized", state.isMinimized && isPopupContext());
    elements.minimizeButton.querySelector("span").textContent = state.isMinimized ? "□" : "−";
    updateModeUi();
    updateStatus();
    scheduleFitControlButtonText();
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
      if (state.finishedAt || state.elapsedBeforeStartMs >= state.countdownDurationMs) state.elapsedBeforeStartMs = 0;
      syncInputsFromDuration();
    }
    state.finishedAt = 0;
    state.hasStarted = true;
    state.isRunning = true;
    state.startedAt = now();
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

  function toggleTimer() {
    if (isFinishedCountdown()) {
      moveToNextTask();
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
    state.finishedAt = 0;
    state.hasStarted = false;
    state.taskName = "";
    stopTicking();
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      syncInputsFromDuration();
    }
    saveState();
    render();
  }

  function finishCountdown() {
    state.elapsedBeforeStartMs = state.countdownDurationMs;
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
    if (state.isRunning) stopTicking();
    state.isRunning = false;
    state.startedAt = 0;
    state.mode = mode;
    state.elapsedBeforeStartMs = 0;
    state.finishedAt = 0;
    state.hasStarted = false;
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
      `現在の計測時間を破棄して「${modeName}」へ切り替えてもよろしいですか？`;
    elements.modeSwitchConfirmOverlay.hidden = false;
    elements.confirmModeSwitchButton.focus();
  }

  function isModeSwitchConfirmOpen() {
    return !elements.modeSwitchConfirmOverlay.hidden;
  }

  function setCountdownDuration(seconds) {
    state.countdownDurationMs = seconds * 1000;
    state.elapsedBeforeStartMs = 0;
    state.finishedAt = 0;
    state.hasStarted = false;
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
      if (!names.includes(record.taskName)) names.push(record.taskName);
    });
    if (state.taskName && !names.includes(state.taskName)) names.unshift(state.taskName);
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
    renderRecentTasks(elements.recentTaskList, elements.taskInput);
    elements.taskDialog.showModal();
    window.setTimeout(() => elements.taskInput.focus(), 0);
  }

  function setTaskName(name) {
    state.taskName = name.trim().slice(0, 80);
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
    state.records.push({
      id: `${now()}-${Math.random().toString(16).slice(2)}`,
      date: localDateKey(),
      taskName: state.taskName.trim(),
      durationMs: Math.round(durationMs),
      mode: state.mode,
      createdAt: new Date().toISOString(),
    });
    saveRecords();
    resetTimer();
    state.taskName = "";
    saveState();
    render();
    elements.statusText.textContent = "今日の作業として記録しました";
    showToast("作業履歴に追加しました");
  }

  function renderHistory() {
    const records = state.records.filter((record) => record.date === elements.historyDate.value);
    elements.unitButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.unit === state.historyUnit));
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
      const task = document.createElement("span");
      const duration = document.createElement("span");
      task.textContent = record.taskName;
      duration.textContent = formatRecordDuration(record.durationMs);
      item.append(task, duration);
      item.addEventListener("click", () => openEditHistoryDialog(record));
      elements.historyList.append(item);
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
    const totalSeconds = Math.round(record.durationMs / 1000);
    elements.editHoursInput.value = String(Math.floor(totalSeconds / 3600));
    elements.editMinutesInput.value = String(Math.floor((totalSeconds % 3600) / 60));
    elements.editSecondsInput.value = String(totalSeconds % 60);
    elements.editTaskInput.value = record.taskName;
    elements.editHistoryError.textContent = "";
    elements.editHistoryDialog.showModal();
    window.setTimeout(() => elements.editTaskInput.focus(), 0);
  }

  function updateHistoryRecord(event) {
    event.preventDefault();
    if (!editingRecord) return;
    const taskName = elements.editTaskInput.value.trim();
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
    editingRecord.taskName = taskName.slice(0, 80);
    editingRecord.durationMs = durationMs;
    saveRecords();
    elements.editHistoryDialog.close();
    renderHistory();
    showToast("作業履歴を変更しました");
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
    const taskName = elements.manualTaskInput.value.trim();
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

    state.records.push({
      id: `${now()}-${Math.random().toString(16).slice(2)}`,
      date: localDateKey(),
      taskName: taskName.slice(0, 80),
      durationMs,
      mode: "manual",
      createdAt: new Date().toISOString(),
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
    const handle = window.open(url.toString(), "simpleTimerPopup", `popup=yes,width=${POPUP_SIZE.width},height=${POPUP_SIZE.height},left=120,top=120,resizable=yes,scrollbars=yes`);
    elements.statusText.textContent = handle ? "小窓を開きました" : "ポップアップがブロックされました";
    if (handle) handle.focus();
  }

  function resizePopup(width, height) { if (isPopupContext()) { try { elements.app.ownerDocument.defaultView.resizeTo(width, height); } catch {} } }
  function toggleMinimized() {
    if (!isPopupContext()) return;
    state.isMinimized = !state.isMinimized;
    const size = state.isMinimized ? MINIMIZED_POPUP_SIZE : POPUP_SIZE;
    resizePopup(size.width, size.height);
    render();
  }

  async function openDocumentPictureInPicture() {
    const pip = window.documentPictureInPicture;
    if (!pip || typeof pip.requestWindow !== "function") return false;
    try {
      const pipWindow = await pip.requestWindow(POPUP_SIZE);
      const styleLink = pipWindow.document.createElement("link");
      styleLink.rel = "stylesheet"; styleLink.href = "./styles.css";
      pipWindow.document.head.append(styleLink);
      pipWindow.document.body.className = "is-popup";
      pipWindow.document.body.append(elements.app);
      pipWindow.document.addEventListener("keydown", handleKeyboard);
      pipWindow.addEventListener("resize", scheduleFitControlButtonText);
      pipWindow.addEventListener("pagehide", () => {
        state.isMinimized = false;
        document.body.classList.toggle("is-popup", new URLSearchParams(location.search).has("popup"));
        document.body.append(elements.app); render();
      });
      return true;
    } catch { return false; }
  }

  async function openCompactWindow() { if (!(await openDocumentPictureInPicture())) openPopupWindow(); }

  function handleKeyboard(event) {
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
    if (["input", "textarea", "button"].includes(event.target.tagName.toLowerCase()) || elements.taskDialog.open || elements.historyDialog.open) return;
    if (event.code === "Space") {
      event.preventDefault();
      isFinishedCountdown() ? moveToNextTask() : state.isRunning ? pauseTimer() : startTimer();
    }
    else if (event.key.toLowerCase() === "r") resetTimer();
  }

  function bindEvents() {
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
      state.countdownDurationMs = getDurationFromInputs();
      state.elapsedBeforeStartMs = 0; state.finishedAt = 0; state.hasStarted = false;
      syncInputsFromDuration(); saveState(); render();
    }));
    elements.presetButtons.forEach((button) => button.addEventListener("click", () => setCountdownDuration(Number.parseInt(button.dataset.seconds, 10))));
    elements.taskButton.addEventListener("click", () => openTaskDialog(false));
    elements.taskDialogForm.addEventListener("submit", (event) => {
      event.preventDefault();
      setTaskName(elements.taskInput.value);
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
    elements.resetButton.addEventListener("click", resetTimer);
    elements.nextTaskButton.addEventListener("click", moveToNextTask);
    elements.popupButton.addEventListener("click", openCompactWindow);
    elements.minimizeButton.addEventListener("click", toggleMinimized);
    document.addEventListener("keydown", handleKeyboard);
    window.addEventListener("resize", scheduleFitControlButtonText);
    window.addEventListener("beforeunload", (event) => {
      if (!hasStartedTimer()) return;
      saveState();
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function initialize() {
    loadState();
    elements.body.classList.toggle("is-popup", new URLSearchParams(location.search).has("popup"));
    syncInputsFromDuration();
    bindEvents();
    updateDateTime();
    window.setInterval(updateDateTime, 250);
    render();
  }

  initialize();
})();
