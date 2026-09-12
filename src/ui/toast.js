import { elements } from "./elements.js";
import { toastSession } from "./toast-state.js";

export function showToast(message, undoAction = null) {
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
    undoAction ? 7000 : 3000,
  );
}
