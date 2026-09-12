import { canCloseHistoryWithMemo } from "../features/history/memos.js";
import { elements } from "./elements.js";
import { handleKeyboard } from "./keyboard.js";
import { toastSession } from "./toast-state.js";

export function bindCommonEvents() {
  elements.toastUndoButton.addEventListener("click", () => {
    const action = toastSession.toastUndoAction;
    toastSession.toastUndoAction = null;
    elements.toastUndoButton.hidden = true;
    if (action) action();
  });
  elements.closeDialogButtons.forEach((button) =>
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog === elements.historyDialog && !canCloseHistoryWithMemo())
        return;
      dialog.close();
    }),
  );
  document.addEventListener("keydown", handleKeyboard);
}
