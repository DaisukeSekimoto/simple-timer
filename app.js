(function () {
  const STORAGE_KEY = "simple-timer-state";
  const MODES = {
    COUNTDOWN: "countdown",
    STOPWATCH: "stopwatch",
  };

  const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;
  const TICK_INTERVAL_MS = 250;

  const elements = {
    body: document.body,
    app: document.querySelector(".app"),
    panel: document.querySelector(".timer-panel"),
    statusText: document.querySelector("#status-text"),
    timeDisplay: document.querySelector("#time-display"),
    popupButton: document.querySelector("#popup-button"),
    minimizeButton: document.querySelector("#minimize-button"),
    modeTabs: Array.from(document.querySelectorAll(".mode-tab")),
    countdownSettings: document.querySelector("#countdown-settings"),
    hoursInput: document.querySelector("#hours-input"),
    minutesInput: document.querySelector("#minutes-input"),
    secondsInput: document.querySelector("#seconds-input"),
    presetButtons: Array.from(document.querySelectorAll(".preset-button")),
    taskInput: document.querySelector("#task-input"),
    startPauseButton: document.querySelector("#start-pause-button"),
    resetButton: document.querySelector("#reset-button"),
    copyButton: document.querySelector("#copy-button"),
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
  };

  let tickId = 0;
  let audioContext = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.mode === MODES.COUNTDOWN || saved.mode === MODES.STOPWATCH) {
        state.mode = saved.mode;
      }
      if (Number.isFinite(saved.countdownDurationMs) && saved.countdownDurationMs > 0) {
        state.countdownDurationMs = saved.countdownDurationMs;
      }
      if (typeof saved.taskName === "string") {
        state.taskName = saved.taskName.slice(0, 80);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: state.mode,
        countdownDurationMs: state.countdownDurationMs,
        taskName: state.taskName,
      }),
    );
  }

  function now() {
    return Date.now();
  }

  function getElapsedMs() {
    if (!state.isRunning) {
      return state.elapsedBeforeStartMs;
    }
    return state.elapsedBeforeStartMs + now() - state.startedAt;
  }

  function getDisplayMs() {
    if (state.mode === MODES.STOPWATCH) {
      return getElapsedMs();
    }

    return Math.max(0, state.countdownDurationMs - getElapsedMs());
  }

  function normalizeSeconds(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(0, parsed);
  }

  function getDurationFromInputs() {
    const hours = Math.min(99, normalizeSeconds(elements.hoursInput.value, 0));
    const minutes = Math.min(59, normalizeSeconds(elements.minutesInput.value, 0));
    const seconds = Math.min(59, normalizeSeconds(elements.secondsInput.value, 0));
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return Math.max(1, totalSeconds) * 1000;
  }

  function syncInputsFromDuration() {
    const totalSeconds = Math.round(state.countdownDurationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    elements.hoursInput.value = String(hours);
    elements.minutesInput.value = String(minutes);
    elements.secondsInput.value = String(seconds);
  }

  function formatTime(milliseconds, rounding = "floor") {
    const round = rounding === "ceil" ? Math.ceil : Math.floor;
    const totalSeconds = Math.max(0, round(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  }

  function getCopyText() {
    const task = state.taskName.trim() || "タスク";
    const label = state.mode === MODES.COUNTDOWN ? "集中時間" : "作業時間";
    const elapsed = state.mode === MODES.COUNTDOWN
      ? Math.min(state.countdownDurationMs, getElapsedMs())
      : getElapsedMs();
    return `${task} ${label}: ${formatTime(elapsed, "floor")}`;
  }

  function getCurrentBody() {
    return elements.app.ownerDocument.body;
  }

  function isPopupContext() {
    return getCurrentBody().classList.contains("is-popup");
  }

  function updateModeUi() {
    elements.modeTabs.forEach((tab) => {
      const isActive = tab.dataset.mode === state.mode;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    elements.countdownSettings.hidden = state.mode !== MODES.COUNTDOWN;
  }

  function updateStatus() {
    if (state.finishedAt > 0) {
      elements.statusText.textContent = "完了";
      return;
    }

    if (state.isRunning) {
      elements.statusText.textContent = state.mode === MODES.COUNTDOWN ? "集中時間を計測中" : "作業時間を計測中";
      return;
    }

    if (state.elapsedBeforeStartMs > 0) {
      elements.statusText.textContent = "一時停止中";
      return;
    }

    elements.statusText.textContent = "待機中";
  }

  function render() {
    if (state.mode === MODES.COUNTDOWN && state.isRunning && getDisplayMs() <= 0) {
      finishCountdown();
      return;
    }

    const rounding = state.mode === MODES.COUNTDOWN ? "ceil" : "floor";
    elements.timeDisplay.textContent = formatTime(getDisplayMs(), rounding);
    elements.startPauseButton.textContent = state.isRunning ? "一時停止" : "開始";
    elements.panel.classList.toggle("is-finished", state.finishedAt > 0);
    getCurrentBody().classList.toggle("is-minimized", state.isMinimized && isPopupContext());
    elements.minimizeButton.setAttribute("aria-label", state.isMinimized ? "復元" : "最小化");
    elements.minimizeButton.setAttribute("title", state.isMinimized ? "復元" : "最小化");
    elements.minimizeButton.querySelector("span").textContent = state.isMinimized ? "□" : "−";
    updateModeUi();
    updateStatus();
  }

  function startTimer() {
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      if (state.finishedAt > 0 || state.elapsedBeforeStartMs >= state.countdownDurationMs) {
        state.elapsedBeforeStartMs = 0;
      }
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
    state.elapsedBeforeStartMs = getElapsedMs();
    state.isRunning = false;
    state.startedAt = 0;
    stopTicking();
    render();
  }

  function resetTimer() {
    state.isRunning = false;
    state.startedAt = 0;
    state.elapsedBeforeStartMs = 0;
    state.finishedAt = 0;
    stopTicking();
    if (state.mode === MODES.COUNTDOWN) {
      state.countdownDurationMs = getDurationFromInputs();
      syncInputsFromDuration();
      saveState();
    }
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
    if (state.mode === mode) {
      return;
    }

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

  function startTicking() {
    if (!tickId) {
      tickId = window.setInterval(render, TICK_INTERVAL_MS);
    }
  }

  function stopTicking() {
    if (tickId) {
      window.clearInterval(tickId);
      tickId = 0;
    }
  }

  function playFinishSound() {
    try {
      audioContext = audioContext || new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.38);
    } catch {
      // Audio is optional; the visual completion state remains available.
    }
  }

  async function copySummary() {
    const text = getCopyText();
    try {
      await navigator.clipboard.writeText(text);
      elements.statusText.textContent = "コピーしました";
    } catch {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        const temporary = document.createElement("span");
        temporary.textContent = text;
        temporary.style.position = "fixed";
        temporary.style.left = "-9999px";
        document.body.appendChild(temporary);
        range.selectNodeContents(temporary);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
        temporary.remove();
        elements.statusText.textContent = "コピーしました";
      } catch {
        elements.statusText.textContent = "コピーできませんでした";
      }
    }
  }

  function openPopupWindow() {
    const url = new URL(window.location.href);
    url.searchParams.set("popup", "1");
    const features = [
      "popup=yes",
      "width=360",
      "height=520",
      "left=120",
      "top=120",
      "resizable=yes",
      "scrollbars=no",
    ].join(",");

    const handle = window.open(url.toString(), "simpleTimerPopup", features);
    if (handle) {
      handle.focus();
      elements.statusText.textContent = "小窓を開きました";
    } else {
      elements.statusText.textContent = "ポップアップがブロックされました";
    }
  }

  function resizePopup(width, height) {
    if (!isPopupContext()) {
      return;
    }

    try {
      elements.app.ownerDocument.defaultView.resizeTo(width, height);
    } catch {
      // Window resizing is optional and browser-controlled.
    }
  }

  function toggleMinimized() {
    if (!isPopupContext()) {
      return;
    }

    state.isMinimized = !state.isMinimized;
    resizePopup(state.isMinimized ? 280 : 360, state.isMinimized ? 190 : 520);
    render();
  }

  async function openDocumentPictureInPicture() {
    const pip = window.documentPictureInPicture;
    if (!pip || typeof pip.requestWindow !== "function") {
      return false;
    }

    try {
      const pipWindow = await pip.requestWindow({ width: 360, height: 520 });
      const styleLink = pipWindow.document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = "./styles.css";
      pipWindow.document.head.append(styleLink);
      pipWindow.document.title = document.title;
      pipWindow.document.body.className = "is-popup";
      pipWindow.document.body.append(elements.app);
      pipWindow.document.addEventListener("keydown", handleKeyboard);
      pipWindow.addEventListener("pagehide", () => {
        state.isMinimized = false;
        document.body.classList.toggle("is-popup", new URLSearchParams(window.location.search).has("popup"));
        document.body.append(elements.app);
        render();
      });
      elements.statusText.textContent = "最前面小窓を開きました";
      return true;
    } catch {
      return false;
    }
  }

  async function openCompactWindow() {
    const openedPip = await openDocumentPictureInPicture();
    if (!openedPip) {
      openPopupWindow();
    }
  }

  function handleKeyboard(event) {
    const tagName = event.target.tagName.toLowerCase();
    const isTyping = tagName === "input" || tagName === "textarea";
    if (isTyping) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      state.isRunning ? pauseTimer() : startTimer();
    } else if (event.key.toLowerCase() === "r") {
      resetTimer();
    } else if (event.key.toLowerCase() === "c") {
      copySummary();
    }
  }

  function bindEvents() {
    elements.modeTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchMode(tab.dataset.mode));
    });

    [elements.hoursInput, elements.minutesInput, elements.secondsInput].forEach((input) => {
      input.addEventListener("change", () => {
        state.countdownDurationMs = getDurationFromInputs();
        state.elapsedBeforeStartMs = 0;
        state.finishedAt = 0;
        syncInputsFromDuration();
        saveState();
        render();
      });
    });

    elements.presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setCountdownDuration(Number.parseInt(button.dataset.seconds, 10));
      });
    });

    elements.taskInput.addEventListener("input", () => {
      state.taskName = elements.taskInput.value;
      saveState();
    });

    elements.startPauseButton.addEventListener("click", () => {
      state.isRunning ? pauseTimer() : startTimer();
    });
    elements.resetButton.addEventListener("click", resetTimer);
    elements.copyButton.addEventListener("click", copySummary);
    elements.popupButton.addEventListener("click", openCompactWindow);
    elements.minimizeButton.addEventListener("click", toggleMinimized);
    document.addEventListener("keydown", handleKeyboard);
  }

  function initialize() {
    loadState();
    elements.body.classList.toggle("is-popup", new URLSearchParams(window.location.search).has("popup"));
    elements.taskInput.value = state.taskName;
    syncInputsFromDuration();
    bindEvents();
    render();
  }

  initialize();
})();
