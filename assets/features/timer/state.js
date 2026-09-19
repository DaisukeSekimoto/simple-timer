import { localDateKey } from "../../shared/time.js";

export const timerSession = {
  tickId: 0,
  timerPointerHandledAt: 0,
  timerTabsSignature: "",
  pendingCloseTimerId: "",
  timerTabConfirmPreviousFocus: null,
  pendingMode: "",
  modeSwitchConfirmPreviousFocus: null,
  pendingTimerNavigation: null,
  timerNavigationConfirmPreviousFocus: null,
  displayedClockSecond: -1,
  activeStateDate: localDateKey(),
  pendingNewDateKey: "",
  dateTimeIntervalId: 0,
  currentClockText: "00:00:00",
  pendingUntilPomodoroPlan: null,
};
