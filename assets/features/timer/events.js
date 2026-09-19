import { moveToNextTask } from "../history/recording.js";
import {
  closeModeSwitchConfirm,
  closeResetConfirm,
  confirmModeSwitch,
  confirmResetTimer,
  handleTimerClick,
  handleTimerPointerDown,
  requestResetOrFinishBreak,
  switchMode,
} from "./controls.js";
import { recordPreviousDayWork, resetPreviousDayWork } from "./day.js";
import {
  addTimerTab,
  closeTimerNavigationConfirm,
  closeTimerTab,
  closeTimerTabConfirm,
  confirmCloseTimerTab,
  confirmTimerNavigation,
  selectTimerTab,
} from "./tabs.js";
import { elements } from "../../ui/elements.js";

export function bindTimerEvents() {
  elements.resetPreviousDayButton.addEventListener(
    "click",
    resetPreviousDayWork,
  );
  elements.recordPreviousDayButton.addEventListener(
    "click",
    recordPreviousDayWork,
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
    closeTimerNavigationConfirm,
  );
  elements.confirmTimerNavigationButton.addEventListener(
    "click",
    confirmTimerNavigation,
  );
  elements.timerNavigationConfirmOverlay.addEventListener("click", (event) => {
    if (event.target === elements.timerNavigationConfirmOverlay)
      closeTimerNavigationConfirm();
  });
  elements.cancelModeSwitchButton.addEventListener(
    "click",
    closeModeSwitchConfirm,
  );
  elements.confirmModeSwitchButton.addEventListener("click", confirmModeSwitch);
  elements.modeSwitchConfirmOverlay.addEventListener("click", (event) => {
    if (event.target === elements.modeSwitchConfirmOverlay)
      closeModeSwitchConfirm();
  });
  elements.cancelTimerTabDeleteButton.addEventListener(
    "click",
    closeTimerTabConfirm,
  );
  elements.confirmTimerTabDeleteButton.addEventListener(
    "click",
    confirmCloseTimerTab,
  );
  elements.timerTabConfirmOverlay.addEventListener("click", (event) => {
    if (event.target === elements.timerTabConfirmOverlay)
      closeTimerTabConfirm();
  });
  elements.modeTabs.forEach((tab) =>
    tab.addEventListener("click", () => switchMode(tab.dataset.mode)),
  );
  elements.startPauseButton.addEventListener(
    "pointerdown",
    handleTimerPointerDown,
  );
  elements.startPauseButton.addEventListener("click", handleTimerClick);
  elements.compactStartPauseButton.addEventListener(
    "pointerdown",
    handleTimerPointerDown,
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
