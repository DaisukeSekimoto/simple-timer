import {
  DAILY_MEMOS_KEY,
  DEFAULT_MODE_KEY,
  MODES,
  RECORDS_KEY,
  TODOS_KEY,
  WORKDAY_TIMES_KEY,
} from "./core/constants.js";
import { bindEvents } from "./core/events.js";
import { state } from "./core/state.js";
import { renderHistory } from "./features/history/list.js";
import { historySession } from "./features/history/state.js";
import { popupSession } from "./features/popup/state.js";
import {
  applyPopupSize,
  getPreferredPopupSize,
} from "./features/popup/window.js";
import {
  applyTheme,
  getDefaultTimeFormat,
  getTheme,
} from "./features/settings/settings.js";
import { syncInputsFromDuration } from "./features/timer/countdown.js";
import { startDateTimeUpdates, updateDateTime } from "./features/timer/day.js";
import { render } from "./features/timer/view.js";
import { initializeTodos, renderTodos } from "./features/todos/todos.js";
import { now } from "./shared/time.js";
import { storage } from "./storage/client.js";
import {
  loadDailyMemos,
  loadRecords,
  loadState,
  loadWorkdayTimes,
} from "./storage/repository.js";
import { elements } from "./ui/elements.js";
import { showToast } from "./ui/toast.js";

export function initialize() {
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
    if (
      !event.key ||
      [RECORDS_KEY, DAILY_MEMOS_KEY, WORKDAY_TIMES_KEY, TODOS_KEY].some(
        (key) => event.key === key || event.key.startsWith(`${key}:item:`),
      )
    ) {
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
    window.requestAnimationFrame(() =>
      applyPopupSize(window, getPreferredPopupSize(window)),
    );
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      showToast("オフライン機能を準備できませんでした");
    });
  }
  window.addEventListener("offline", () =>
    showToast("オフラインになりました。保存済みの機能を利用できます"),
  );
  window.addEventListener("online", () => showToast("オンラインに戻りました"));
  window
    .matchMedia?.("(prefers-color-scheme: dark)")
    .addEventListener?.("change", () => {
      if (getTheme() === "system") applyTheme("system");
    });
}

initialize();
