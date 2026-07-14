(function () {
  const STORAGE_KEY = "simple-timer-state";
  const RECORDS_KEY = "simple-timer-records";
  const MODES = { COUNTDOWN: "countdown", STOPWATCH: "stopwatch" };
  const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;
  const TICK_INTERVAL_MS = 250;

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
    isMinimized: false,
    records: [],
    historyUnit: "minutes",
  };

  let tickId = 0;
  let toastId = 0;
  let timerPointerHandledAt = 0;
  let audioContext = null;
  let pendingRecordAfterTaskInput = false;
  let fitButtonsFrame = 0;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatJapaneseDate(date = new Date()) {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric", month: "long", day: "numeric", weekday: "short",
    }).format(date);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Object.values(MODES).includes(saved.mode)) state.mode = saved.mode;
      if (Number.isFinite(saved.countdownDurationMs) && saved.countdownDurationMs > 0) {
        state.countdownDurationMs = saved.countdownDurationMs;
      }
      if (typeof saved.taskName === "string") state.taskName = saved.taskName.slice(0, 80);
      const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
      if (Array.isArray(records)) {
        state.records = records.filter((record) =>
          record && typeof record.taskName === "string" && typeof record.date === "string" &&
          Number.isFinite(record.durationMs) && record.durationMs > 0,
        );
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(RECORDS_KEY);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      countdownDurationMs: state.countdownDurationMs,
      taskName: state.taskName,
    }));
  }

  function saveRecords() {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records));
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
    elements.recordDate.textContent = formatJapaneseDate();
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
    getCurrentBody().classList.toggle("is-minimized", state.isMinimized && isPopupContext());
    elements.minimizeButton.querySelector("span").textContent = state.isMinimized ? "□" : "−";
    updateModeUi();
    updateStatus();
    scheduleFitControlButtonText();
  }

  function startTimer() {
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      if (state.finishedAt || state.elapsedBeforeStartMs >= state.countdownDurationMs) state.elapsedBeforeStartMs = 0;
      syncInputsFromDuration();
    }
    state.finishedAt = 0;
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
    stopTicking();
    playFinishSound();
    render();
  }

  function switchMode(mode) {
    if (state.mode === mode) return;
    pauseTimer();
    state.mode = mode;
    state.elapsedBeforeStartMs = 0;
    state.finishedAt = 0;
    saveState();
    render();
  }

  function setCountdownDuration(seconds) {
    state.countdownDurationMs = seconds * 1000;
    state.elapsedBeforeStartMs = 0;
    state.finishedAt = 0;
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

  function renderRecentTasks() {
    elements.recentTaskList.replaceChildren();
    const names = recentTaskNames();
    if (!names.length) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "履歴はまだありません";
      elements.recentTaskList.append(empty);
      return;
    }
    names.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-task-button";
      button.textContent = name;
      button.addEventListener("click", () => { elements.taskInput.value = name; elements.taskInput.focus(); });
      elements.recentTaskList.append(button);
    });
  }

  function openTaskDialog(recordAfterInput = false) {
    pendingRecordAfterTaskInput = recordAfterInput === true;
    elements.taskInput.value = state.taskName;
    renderRecentTasks();
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
      item.addEventListener("click", () => deleteHistoryRecord(record));
      elements.historyList.append(item);
    });
  }

  function deleteHistoryRecord(record) {
    const duration = formatRecordDuration(record.durationMs);
    if (!window.confirm(`「${record.taskName}（${duration}）」を削除しますか？`)) return;
    const recordIndex = state.records.findIndex((item) => item === record);
    if (recordIndex < 0) return;
    state.records.splice(recordIndex, 1);
    saveRecords();
    renderHistory();
    showToast("作業履歴を削除しました");
  }

  function openHistoryDialog() {
    elements.historyDate.value = localDateKey();
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
    elements.addHistoryDialog.showModal();
    window.setTimeout(() => elements.manualTaskInput.focus(), 0);
  }

  function addManualHistory(event) {
    event.preventDefault();
    const taskName = elements.manualTaskInput.value.trim();
    const hours = Math.min(99, normalizeSeconds(elements.manualHoursInput.value, 0));
    const minutes = Math.min(59, normalizeSeconds(elements.manualMinutesInput.value, 0));
    const seconds = Math.min(59, normalizeSeconds(elements.manualSecondsInput.value, 0));
    const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

    if (!taskName || !elements.manualDate.value) {
      elements.manualHistoryError.textContent = "日付とタスク名を入力してください";
      return;
    }
    if (durationMs < 1000) {
      elements.manualHistoryError.textContent = "作業時間を1秒以上入力してください";
      return;
    }

    state.records.push({
      id: `${now()}-${Math.random().toString(16).slice(2)}`,
      date: elements.manualDate.value,
      taskName: taskName.slice(0, 80),
      durationMs,
      mode: "manual",
      createdAt: new Date().toISOString(),
    });
    saveRecords();
    elements.historyDate.value = elements.manualDate.value;
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
    const handle = window.open(url.toString(), "simpleTimerPopup", "popup=yes,width=360,height=580,left=120,top=120,resizable=yes,scrollbars=yes");
    elements.statusText.textContent = handle ? "小窓を開きました" : "ポップアップがブロックされました";
    if (handle) handle.focus();
  }

  function resizePopup(width, height) { if (isPopupContext()) { try { elements.app.ownerDocument.defaultView.resizeTo(width, height); } catch {} } }
  function toggleMinimized() {
    if (!isPopupContext()) return;
    state.isMinimized = !state.isMinimized;
    resizePopup(state.isMinimized ? 280 : 360, state.isMinimized ? 190 : 580);
    render();
  }

  async function openDocumentPictureInPicture() {
    const pip = window.documentPictureInPicture;
    if (!pip || typeof pip.requestWindow !== "function") return false;
    try {
      const pipWindow = await pip.requestWindow({ width: 360, height: 580 });
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
    if (["input", "textarea", "button"].includes(event.target.tagName.toLowerCase()) || elements.taskDialog.open || elements.historyDialog.open) return;
    if (event.code === "Space") {
      event.preventDefault();
      isFinishedCountdown() ? moveToNextTask() : state.isRunning ? pauseTimer() : startTimer();
    }
    else if (event.key.toLowerCase() === "r") resetTimer();
  }

  function bindEvents() {
    elements.modeTabs.forEach((tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode)));
    [elements.hoursInput, elements.minutesInput, elements.secondsInput].forEach((input) => input.addEventListener("change", () => {
      state.countdownDurationMs = getDurationFromInputs();
      state.elapsedBeforeStartMs = 0; state.finishedAt = 0;
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
    elements.historyDate.addEventListener("change", renderHistory);
    elements.unitButtons.forEach((button) => button.addEventListener("click", () => { state.historyUnit = button.dataset.unit; renderHistory(); }));
    elements.addHistoryButton.addEventListener("click", openAddHistoryDialog);
    elements.addHistoryForm.addEventListener("submit", addManualHistory);
    elements.exportHistoryButton.addEventListener("click", exportAllHistory);
    elements.closeDialogButtons.forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
    elements.startPauseButton.addEventListener("pointerdown", handleTimerPointerDown);
    elements.startPauseButton.addEventListener("click", handleTimerClick);
    elements.resetButton.addEventListener("click", resetTimer);
    elements.nextTaskButton.addEventListener("click", moveToNextTask);
    elements.popupButton.addEventListener("click", openCompactWindow);
    elements.minimizeButton.addEventListener("click", toggleMinimized);
    document.addEventListener("keydown", handleKeyboard);
    window.addEventListener("resize", scheduleFitControlButtonText);
  }

  function initialize() {
    loadState();
    elements.body.classList.toggle("is-popup", new URLSearchParams(location.search).has("popup"));
    syncInputsFromDuration();
    bindEvents();
    render();
  }

  initialize();
})();
