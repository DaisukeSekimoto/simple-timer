export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatHistoryDateLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const label = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
  return dateKey === localDateKey() ? `${label}（本日）` : label;
}

export function now() {
  return Date.now();
}

export function normalizeSeconds(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export function formatTime(milliseconds, rounding = "floor") {
  const totalSeconds = Math.max(
    0,
    (rounding === "ceil" ? Math.ceil : Math.floor)(milliseconds / 1000),
  );
  const parts = [
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatDurationForUnit(milliseconds, unit = "minutes") {
  if (unit === "minutes") return `${Math.round(milliseconds / 60000)}分`;
  return formatTime(milliseconds);
}

export function formatHistoryClock(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatHistoryTimeRange(record) {
  const addedAt = new Date(record.createdAt);
  if (Number.isNaN(addedAt.getTime())) return "";
  const storedStartedAt = new Date(record.firstStartedAt);
  return Number.isNaN(storedStartedAt.getTime())
    ? `～${formatHistoryClock(addedAt)}`
    : `${formatHistoryClock(storedStartedAt)}～${formatHistoryClock(addedAt)}`;
}

export function compareHistoryRecordsByEndTimeDescending(
  leftRecord,
  rightRecord,
) {
  const leftEndTime = Date.parse(leftRecord.createdAt);
  const rightEndTime = Date.parse(rightRecord.createdAt);
  if (Number.isFinite(leftEndTime) && Number.isFinite(rightEndTime)) {
    return rightEndTime - leftEndTime;
  }
  if (Number.isFinite(leftEndTime)) return -1;
  if (Number.isFinite(rightEndTime)) return 1;
  return 0;
}

export function calculateWorkDurationMs(clockIn, clockOut) {
  if (!/^\d{2}:\d{2}$/.test(clockIn) || !/^\d{2}:\d{2}$/.test(clockOut))
    return null;
  const [inHours, inMinutes] = clockIn.split(":").map(Number);
  const [outHours, outMinutes] = clockOut.split(":").map(Number);
  let minutes = outHours * 60 + outMinutes - (inHours * 60 + inMinutes);
  if (minutes < 0) minutes += 24 * 60;
  return minutes * 60000;
}

export function calculateTimeRangeDuration(recordDate, startTime, endTime) {
  if (!startTime || !endTime) return null;
  const startDate = new Date(`${recordDate}T${startTime}`);
  const endDate = new Date(`${recordDate}T${endTime}`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
    return null;
  if (startDate.getTime() > endDate.getTime())
    startDate.setDate(startDate.getDate() - 1);
  const durationMs = endDate.getTime() - startDate.getTime();
  return Number.isSafeInteger(durationMs) && durationMs >= 1000
    ? durationMs
    : null;
}

export function formatTimeInputValue(date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
