import {
  MINIMIZED_POPUP_SIZE_KEY,
  MINIMIZED_POPUP_SIZE_LIMITS,
  OPTIMAL_POPUP_MIN_HEIGHT,
  POPUP_SIZE_KEY,
  POPUP_SIZE_LIMITS,
} from "../../core/constants.js";
import { state } from "../../core/state.js";
import { popupSession } from "./state.js";
import {
  disablePastHistoryEditing,
  getTheme,
  isPastHistoryEditUnlocked,
  resolveTheme,
  updatePastHistoryEditSetting,
} from "../settings/settings.js";
import { render, scheduleFitControlButtonText } from "../timer/view.js";
import { now } from "../../shared/time.js";
import { storage } from "../../storage/client.js";
import { elements } from "../../ui/elements.js";
import { handleKeyboard } from "../../ui/keyboard.js";
import { showToast } from "../../ui/toast.js";

export function getCurrentBody() {
  return elements.app.ownerDocument.body;
}

export function isPopupContext() {
  return getCurrentBody().classList.contains("is-popup");
}

export function fitPopupContentToWindow() {
  if (!isPopupContext()) {
    elements.app.style.zoom = "";
    elements.app.style.width = "";
    elements.app.style.maxWidth = "";
    popupSession.popupFitSignature = "";
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
  if (signature === popupSession.popupFitSignature) return;
  popupSession.popupFitSignature = signature;
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

export function scheduleFitPopupContent() {
  if (!isPopupContext()) return;
  const view = elements.app.ownerDocument.defaultView;
  view.cancelAnimationFrame(popupSession.popupFitFrame);
  popupSession.popupFitFrame = view.requestAnimationFrame(
    fitPopupContentToWindow,
  );
}

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizePopupSize(size, limits = POPUP_SIZE_LIMITS) {
  if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height))
    return null;
  return {
    width: Math.round(clamp(size.width, limits.minWidth, limits.maxWidth)),
    height: Math.round(clamp(size.height, limits.minHeight, limits.maxHeight)),
  };
}

export function loadStoredPopupSize(key) {
  try {
    const limits =
      key === MINIMIZED_POPUP_SIZE_KEY
        ? MINIMIZED_POPUP_SIZE_LIMITS
        : POPUP_SIZE_LIMITS;
    return normalizePopupSize(
      JSON.parse(storage.getItem(key) || "null"),
      limits,
    );
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function loadSavedPopupSize() {
  return loadStoredPopupSize(POPUP_SIZE_KEY);
}

export function loadSavedMinimizedPopupSize() {
  return loadStoredPopupSize(MINIMIZED_POPUP_SIZE_KEY);
}

export function calculateOptimalPopupSize(view = window) {
  const screen = view.screen || window.screen;
  const availableWidth = Number.isFinite(screen.availWidth)
    ? screen.availWidth - 32
    : POPUP_SIZE_LIMITS.maxWidth;
  const availableHeight = Number.isFinite(screen.availHeight)
    ? screen.availHeight - 48
    : POPUP_SIZE_LIMITS.maxHeight;
  const configuredMaxWidth = Number.parseFloat(
    view.getComputedStyle(elements.app).maxWidth,
  );
  const contentWidth = Math.ceil(
    Math.max(
      elements.app.scrollWidth,
      elements.app.getBoundingClientRect().width,
      Number.isFinite(configuredMaxWidth) ? configuredMaxWidth : 0,
    ),
  );
  const contentHeight = Math.ceil(
    Math.max(
      elements.app.scrollHeight,
      elements.app.getBoundingClientRect().height,
    ),
  );
  return {
    width: Math.round(
      clamp(
        contentWidth,
        POPUP_SIZE_LIMITS.minWidth,
        Math.min(POPUP_SIZE_LIMITS.maxWidth, availableWidth),
      ),
    ),
    height: Math.round(
      clamp(
        contentHeight + 8,
        OPTIMAL_POPUP_MIN_HEIGHT,
        Math.min(POPUP_SIZE_LIMITS.maxHeight, availableHeight),
      ),
    ),
  };
}

export function calculateOptimalMinimizedPopupSize(view = window) {
  const previousZoom = elements.app.style.zoom;
  elements.app.style.zoom = "1";
  const screen = view.screen || window.screen;
  const availableWidth = Number.isFinite(screen.availWidth)
    ? screen.availWidth - 32
    : MINIMIZED_POPUP_SIZE_LIMITS.maxWidth;
  const availableHeight = Number.isFinite(screen.availHeight)
    ? screen.availHeight - 48
    : MINIMIZED_POPUP_SIZE_LIMITS.maxHeight;
  const appStyle = view.getComputedStyle(elements.app);
  const header = elements.app.querySelector(".app-header");
  const headerHeight = Math.ceil(header.getBoundingClientRect().height);
  const verticalPadding =
    (Number.parseFloat(appStyle.paddingTop) || 0) +
    (Number.parseFloat(appStyle.paddingBottom) || 0);
  const horizontalPadding =
    (Number.parseFloat(appStyle.paddingLeft) || 0) +
    (Number.parseFloat(appStyle.paddingRight) || 0);
  const isCurrentlyMinimized = state.isMinimized && isPopupContext();
  const timerHeight = isCurrentlyMinimized
    ? Math.ceil(elements.panel.getBoundingClientRect().height)
    : 96;
  const contentHeight = headerHeight + timerHeight + verticalPadding + 2;
  const contentWidth = isCurrentlyMinimized
    ? Math.max(header.scrollWidth, elements.panel.scrollWidth) +
      horizontalPadding
    : 360;
  const size = {
    width: Math.round(
      clamp(
        contentWidth,
        MINIMIZED_POPUP_SIZE_LIMITS.minWidth,
        Math.min(MINIMIZED_POPUP_SIZE_LIMITS.maxWidth, availableWidth),
      ),
    ),
    height: Math.round(
      clamp(
        contentHeight,
        MINIMIZED_POPUP_SIZE_LIMITS.minHeight,
        Math.min(MINIMIZED_POPUP_SIZE_LIMITS.maxHeight, availableHeight),
      ),
    ),
  };
  elements.app.style.zoom = previousZoom;
  return size;
}

export function fitPopupSizeToScreen(
  size,
  view = window,
  limits = POPUP_SIZE_LIMITS,
) {
  const screen = view.screen || window.screen;
  const maximumWidth = Math.min(
    limits.maxWidth,
    Math.max(limits.minWidth, screen.availWidth - 32),
  );
  const maximumHeight = Math.min(
    limits.maxHeight,
    Math.max(limits.minHeight, screen.availHeight - 48),
  );
  return {
    width: Math.round(clamp(size.width, limits.minWidth, maximumWidth)),
    height: Math.round(clamp(size.height, limits.minHeight, maximumHeight)),
  };
}

export function getPreferredPopupSize(view = window) {
  const savedSize = loadSavedPopupSize();
  return savedSize
    ? fitPopupSizeToScreen(savedSize, view)
    : calculateOptimalPopupSize(view);
}

export function savePopupSize(size, isMinimized = false) {
  const limits = isMinimized ? MINIMIZED_POPUP_SIZE_LIMITS : POPUP_SIZE_LIMITS;
  const normalized = normalizePopupSize(size, limits);
  if (!normalized) return;
  const key = isMinimized ? MINIMIZED_POPUP_SIZE_KEY : POPUP_SIZE_KEY;
  storage.setItem(key, JSON.stringify(normalized));
  updatePopupSizeSettings();
}

export function updatePopupSizeSettings() {
  const savedSize = loadSavedPopupSize();
  const savedMinimizedSize = loadSavedMinimizedPopupSize();
  const automaticSize = calculateOptimalPopupSize(
    elements.app.ownerDocument.defaultView || window,
  );
  const automaticMinimizedSize = calculateOptimalMinimizedPopupSize(
    elements.app.ownerDocument.defaultView || window,
  );
  const minimizedSize = savedMinimizedSize || automaticMinimizedSize;
  elements.popupSizeStatus.textContent = savedSize
    ? `${savedSize.width} × ${savedSize.height}px（保存済み）`
    : `${automaticSize.width} × ${automaticSize.height}px（自動）`;
  elements.minimizedPopupSizeStatus.textContent = savedMinimizedSize
    ? `${minimizedSize.width} × ${minimizedSize.height}px（保存済み）`
    : `${minimizedSize.width} × ${minimizedSize.height}px（自動）`;
  elements.resetPopupSizeButton.disabled = !savedSize;
  elements.resetMinimizedPopupSizeButton.disabled = !savedMinimizedSize;
  if (elements.settingsDialog.open && isPastHistoryEditUnlocked())
    updatePastHistoryEditSetting();
}

export function schedulePopupSizeSave(view) {
  if (!isPopupContext()) return;
  window.clearTimeout(popupSession.popupResizeSaveId);
  const remainingSuppressionMs = Math.max(
    0,
    popupSession.suppressPopupSizeSaveUntil - now(),
  );
  popupSession.popupResizeSaveId = window.setTimeout(
    () => {
      if (!isPopupContext()) return;
      savePopupSize(
        { width: view.innerWidth, height: view.innerHeight },
        state.isMinimized,
      );
      popupSession.popupResizeSaveId = 0;
    },
    Math.max(350, remainingSuppressionMs + 100),
  );
}

export function cancelPendingPopupSizeSave() {
  window.clearTimeout(popupSession.popupResizeSaveId);
  popupSession.popupResizeSaveId = 0;
}

export function resizePopupWindow(view, size) {
  popupSession.suppressPopupSizeSaveUntil = now() + 1000;
  const frameWidth = Math.max(0, view.outerWidth - view.innerWidth);
  const frameHeight = Math.max(0, view.outerHeight - view.innerHeight);
  try {
    view.resizeTo(size.width + frameWidth, size.height + frameHeight);
  } catch {
    /* Browsers may disallow resizing normal tabs. */
  }
}

export function applyPopupSize(view, size) {
  cancelPendingPopupSizeSave();
  resizePopupWindow(view, size);
  view.requestAnimationFrame(() => resizePopupWindow(view, size));
}

export function resetPopupSize() {
  storage.removeItem(POPUP_SIZE_KEY);
  popupSession.preMinimizePopupSize = null;
  updatePopupSizeSettings();
  if (isPopupContext() && !state.isMinimized) {
    const view = elements.app.ownerDocument.defaultView;
    applyPopupSize(view, calculateOptimalPopupSize(view));
  }
  showToast("PiPサイズを自動設定に戻しました");
}

export function resetMinimizedPopupSize() {
  storage.removeItem(MINIMIZED_POPUP_SIZE_KEY);
  updatePopupSizeSettings();
  if (isPopupContext() && state.isMinimized) {
    const view = elements.app.ownerDocument.defaultView;
    applyPopupSize(
      view,
      fitPopupSizeToScreen(
        calculateOptimalMinimizedPopupSize(view),
        view,
        MINIMIZED_POPUP_SIZE_LIMITS,
      ),
    );
  }
  showToast("最小化サイズを自動設定に戻しました");
}

export function openPopupWindow() {
  const url = new URL(window.location.href);
  url.searchParams.set("popup", "1");
  const size = getPreferredPopupSize(window);
  const handle = window.open(
    url.toString(),
    "simpleTimerPopup",
    `popup=yes,width=${size.width},height=${size.height},left=120,top=120,resizable=yes,scrollbars=yes`,
  );
  elements.statusText.textContent = handle
    ? "小窓を開きました"
    : "ポップアップがブロックされました";
  if (handle) handle.focus();
}

export function toggleMinimized() {
  if (!isPopupContext()) return;
  const view = elements.app.ownerDocument.defaultView;
  if (!state.isMinimized) {
    popupSession.preMinimizePopupSize = {
      width: view.innerWidth,
      height: view.innerHeight,
    };
    cancelPendingPopupSizeSave();
    savePopupSize(popupSession.preMinimizePopupSize, false);
    state.isMinimized = true;
    render();
    const minimizedSize =
      loadSavedMinimizedPopupSize() || calculateOptimalMinimizedPopupSize(view);
    const fittedMinimizedSize = fitPopupSizeToScreen(
      minimizedSize,
      view,
      MINIMIZED_POPUP_SIZE_LIMITS,
    );
    applyPopupSize(view, fittedMinimizedSize);
    view.setTimeout(() => {
      if (state.isMinimized && isPopupContext())
        applyPopupSize(view, fittedMinimizedSize);
    }, 250);
    return;
  }
  const currentMinimizedSize = {
    width: view.innerWidth,
    height: view.innerHeight,
  };
  cancelPendingPopupSizeSave();
  savePopupSize(currentMinimizedSize, true);
  state.isMinimized = false;
  render();
  const restoreSize =
    popupSession.preMinimizePopupSize ||
    loadSavedPopupSize() ||
    calculateOptimalPopupSize(view);
  popupSession.preMinimizePopupSize = null;
  applyPopupSize(view, fitPopupSizeToScreen(restoreSize, view));
}

export async function openDocumentPictureInPicture() {
  const pip = window.documentPictureInPicture;
  if (!pip || typeof pip.requestWindow !== "function") return false;
  try {
    const preferredSize = getPreferredPopupSize(window);
    const pipWindow = await pip.requestWindow({
      ...preferredSize,
      preferInitialWindowPlacement: true,
    });
    const styleLink = pipWindow.document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = "./assets/styles.css";
    pipWindow.document.head.append(styleLink);
    pipWindow.document.documentElement.dataset.theme = resolveTheme(getTheme());
    pipWindow.document.body.className = "is-popup";
    pipWindow.document.body.append(elements.app);
    popupSession.popupFitSignature = "";
    scheduleFitPopupContent();
    pipWindow.document.addEventListener("keydown", handleKeyboard);
    popupSession.suppressPopupSizeSaveUntil = now() + 1200;
    pipWindow.addEventListener("resize", () => {
      scheduleFitControlButtonText();
      popupSession.popupFitSignature = "";
      scheduleFitPopupContent();
      schedulePopupSizeSave(pipWindow);
    });
    const applyPreferredSize = () => {
      if (
        state.isMinimized ||
        elements.app.ownerDocument !== pipWindow.document
      )
        return;
      applyPopupSize(pipWindow, fitPopupSizeToScreen(preferredSize, pipWindow));
    };
    styleLink.addEventListener(
      "load",
      () => pipWindow.requestAnimationFrame(applyPreferredSize),
      { once: true },
    );
    pipWindow.requestAnimationFrame(() =>
      pipWindow.requestAnimationFrame(applyPreferredSize),
    );
    pipWindow.addEventListener("pagehide", () => {
      // Close before adopting the dialog back into the main document.
      if (elements.todoDialog.open) elements.todoDialog.close();
      state.isMinimized = false;
      popupSession.preMinimizePopupSize = null;
      elements.app.style.zoom = "";
      elements.app.style.width = "";
      elements.app.style.maxWidth = "";
      popupSession.popupFitSignature = "";
      document.body.classList.toggle(
        "is-popup",
        new URLSearchParams(location.search).has("popup"),
      );
      document.body.append(elements.app);
      disablePastHistoryEditing(false);
      render();
    });
    return true;
  } catch {
    return false;
  }
}

export async function openCompactWindow() {
  if (!(await openDocumentPictureInPicture())) openPopupWindow();
}

export async function cyclePopupDisplay() {
  if (!isPopupContext()) {
    await openCompactWindow();
    return;
  }
  toggleMinimized();
}

export function bindPopupEvents() {
  elements.resetPopupSizeButton.addEventListener("click", resetPopupSize);
  elements.resetMinimizedPopupSizeButton.addEventListener(
    "click",
    resetMinimizedPopupSize,
  );
  elements.popupButton.addEventListener("click", openCompactWindow);
  elements.minimizeButton.addEventListener("click", toggleMinimized);
}
