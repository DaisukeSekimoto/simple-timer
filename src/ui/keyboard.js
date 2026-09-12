import { state } from "../core/state.js";
import {
  closeDeleteConfirm,
  isDeleteConfirmOpen,
  openHistoryDialog,
} from "../features/history/editor.js";
import { cyclePopupDisplay } from "../features/popup/window.js";
import { openTaskDialog } from "../features/tasks/tasks.js";
import {
  closeModeSwitchConfirm,
  closeResetConfirm,
  isModeSwitchConfirmOpen,
  isResetConfirmOpen,
  requestResetOrFinishBreak,
  toggleTimer,
} from "../features/timer/controls.js";
import { timerSession } from "../features/timer/state.js";
import {
  addTimerTab,
  closeTimerNavigationConfirm,
  closeTimerTab,
  closeTimerTabConfirm,
  isTimerNavigationConfirmOpen,
  isTimerTabConfirmOpen,
  selectAdjacentTimerTab,
  selectNextTimerTab,
} from "../features/timer/tabs.js";
import { elements } from "./elements.js";

export function handleKeyboard(event) {
  if (timerSession.pendingNewDateKey) return;
  const key = event.key.toLowerCase();
  const hasOpenDialog = Boolean(
    elements.app.ownerDocument.querySelector("dialog[open]"),
  );
  const hasOpenConfirmation =
    isResetConfirmOpen() ||
    isTimerNavigationConfirmOpen() ||
    isModeSwitchConfirmOpen() ||
    isTimerTabConfirmOpen() ||
    isDeleteConfirmOpen();
  if (event.ctrlKey && !event.altKey && !event.shiftKey && key === "enter") {
    const form = event.target.closest?.(
      "#task-dialog-form, #add-history-form, #edit-history-form",
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
  const isAddTimerShortcut =
    !event.metaKey &&
    !event.ctrlKey &&
    event.altKey &&
    event.shiftKey &&
    event.code === "KeyT";
  if (isAddTimerShortcut) {
    if (!hasOpenDialog && !hasOpenConfirmation) {
      event.preventDefault();
      addTimerTab();
    }
    return;
  }
  const isHistoryShortcut =
    !event.metaKey &&
    !event.ctrlKey &&
    event.altKey &&
    event.shiftKey &&
    event.code === "KeyH";
  if (isHistoryShortcut) {
    if (!hasOpenDialog && !hasOpenConfirmation) {
      event.preventDefault();
      openHistoryDialog();
    }
    return;
  }
  const isResetShortcut =
    !event.metaKey &&
    !event.ctrlKey &&
    event.altKey &&
    event.shiftKey &&
    event.code === "KeyR";
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
  if (
    !hasOpenDialog &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.altKey &&
    event.shiftKey &&
    key === "tab"
  ) {
    event.preventDefault();
    selectNextTimerTab();
    return;
  }
  const isMoveTabShortcut =
    !hasOpenDialog &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.altKey &&
    event.shiftKey &&
    (event.code === "ArrowLeft" || event.code === "ArrowRight");
  if (isMoveTabShortcut) {
    event.preventDefault();
    selectAdjacentTimerTab(event.code === "ArrowLeft" ? -1 : 1);
    return;
  }
  const isDeleteTabShortcut =
    !hasOpenDialog &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.altKey &&
    event.shiftKey &&
    (key === "delete" || key === "backspace" || event.code === "KeyD");
  if (isDeleteTabShortcut) {
    event.preventDefault();
    closeTimerTab(state.activeTimerId);
    return;
  }
  const isPopupShortcut =
    !hasOpenDialog &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.altKey &&
    event.shiftKey &&
    event.code === "KeyS";
  if (isPopupShortcut) {
    event.preventDefault();
    cyclePopupDisplay();
    return;
  }
  if (
    ["input", "textarea", "button"].includes(
      event.target.tagName.toLowerCase(),
    ) ||
    elements.app.ownerDocument.querySelector("dialog[open]")
  )
    return;
  if (event.code === "Space") {
    event.preventDefault();
    toggleTimer();
  }
}
