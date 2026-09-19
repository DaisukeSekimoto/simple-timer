import { historySession } from "../features/history/state.js";
import { popupSession } from "../features/popup/state.js";
import {
  scheduleFitPopupContent,
  schedulePopupSizeSave,
} from "../features/popup/window.js";
import { hasStartedTimer } from "../features/timer/tabs.js";
import { scheduleFitControlButtonText } from "../features/timer/view.js";
import { saveState } from "../storage/repository.js";

export function bindLifecycleEvents() {
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
