import { bindLifecycleEvents } from "./lifecycle.js";
import { bindBackupEvents } from "../features/backup/backup.js";
import { bindEditorEvents } from "../features/history/editor.js";
import { bindExportEvents } from "../features/history/export.js";
import { bindHistoryEvents } from "../features/history/list.js";
import { bindSummaryEvents } from "../features/history/summary.js";
import { bindPopupEvents } from "../features/popup/window.js";
import {
  bindDisplayEvents,
  bindSettingsEvents,
} from "../features/settings/events.js";
import { bindTasksEvents } from "../features/tasks/tasks.js";
import { bindCountdownEvents } from "../features/timer/countdown.js";
import { bindTimerEvents } from "../features/timer/events.js";
import { bindCommonEvents } from "../ui/events.js";

export function bindEvents() {
  bindTimerEvents();
  bindSettingsEvents();
  bindDisplayEvents();
  bindCommonEvents();
  bindPopupEvents();
  bindBackupEvents();
  bindCountdownEvents();
  bindTasksEvents();
  bindHistoryEvents();
  bindSummaryEvents();
  bindEditorEvents();
  bindExportEvents();
  bindLifecycleEvents();
}
