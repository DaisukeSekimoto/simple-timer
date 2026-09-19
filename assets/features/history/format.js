import { state } from "../../core/state.js";
import { formatDurationForUnit } from "../../shared/time.js";

export function formatRecordDuration(milliseconds) {
  return formatDurationForUnit(milliseconds, state.historyUnit);
}
