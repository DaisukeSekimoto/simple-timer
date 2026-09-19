export const STORAGE_KEY = "simple-timer-state";

export const TODOS_KEY = "simple-timer-todos";

export const RECORDS_KEY = "simple-timer-records";

export const POPUP_SIZE_KEY = "simple-timer-popup-size";

export const MINIMIZED_POPUP_SIZE_KEY = "simple-timer-minimized-popup-size";

export const DEFAULT_MODE_KEY = "simple-timer-default-mode";

export const AGGREGATION_ENABLED_KEY = "simple-timer-aggregation-enabled";

export const DAILY_MEMOS_KEY = "simple-timer-daily-memos";

export const WORKDAY_TIMES_KEY = "simple-timer-workday-times";

export const THEME_KEY = "simple-timer-theme";

export const PRIMARY_TIME_DISPLAY_KEY = "simple-timer-primary-time-display";

export const DEFAULT_TIME_FORMAT_KEY = "simple-timer-default-time-format";

export const FINISH_SOUND_VOLUME_KEY = "simple-timer-finish-sound-volume";

export const BACKUP_FORMAT = "simple-timer-backup";

export const BACKUP_VERSION = 1;

export const BACKUP_STORAGE_KEYS = [
  STORAGE_KEY,
  RECORDS_KEY,
  TODOS_KEY,
  POPUP_SIZE_KEY,
  MINIMIZED_POPUP_SIZE_KEY,
  DEFAULT_MODE_KEY,
  AGGREGATION_ENABLED_KEY,
  DAILY_MEMOS_KEY,
  WORKDAY_TIMES_KEY,
  THEME_KEY,
  PRIMARY_TIME_DISPLAY_KEY,
  DEFAULT_TIME_FORMAT_KEY,
  FINISH_SOUND_VOLUME_KEY,
];

export const MODES = { COUNTDOWN: "countdown", STOPWATCH: "stopwatch" };

export const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;

export const DEFAULT_POMODORO_BREAK_MS = 5 * 60 * 1000;

export const TICK_INTERVAL_MS = 250;

export const POPUP_SIZE_LIMITS = {
  minWidth: 320,
  maxWidth: 720,
  minHeight: 120,
  maxHeight: 900,
};

export const MINIMIZED_POPUP_SIZE_LIMITS = {
  minWidth: 160,
  maxWidth: 720,
  minHeight: 72,
  maxHeight: 900,
};

export const OPTIMAL_POPUP_MIN_HEIGHT = 360;
