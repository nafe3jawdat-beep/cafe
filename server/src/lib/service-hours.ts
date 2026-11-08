const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parse an "HH:mm" value into minutes after midnight. */
export function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidTime(value: string): boolean {
  return parseTimeToMinutes(value) !== null;
}

/** Validate an IANA timezone such as "Asia/Amman" or "UTC". */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Current wall-clock time in a timezone, as minutes after midnight.
 * Falls back to UTC if a bad timezone has somehow reached the database.
 */
export function minutesInTimeZone(now: Date, timeZone: string): number {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0"
  );

  return hour * 60 + minute;
}

export interface ServiceHours {
  openingTime: string;
  closingTime: string;
  timezone: string;
}

/**
 * Whether `now` falls inside the café's service window.
 *
 * - Equal opening/closing times mean 24-hour service.
 * - A closing time earlier than the opening time is an overnight window
 *   (for example 18:00–02:00).
 */
export function isWithinServiceHours(
  hours: ServiceHours,
  now: Date = new Date()
): boolean {
  const open = parseTimeToMinutes(hours.openingTime);
  const close = parseTimeToMinutes(hours.closingTime);

  // Bad configuration should not lock every guest out; the admin form and
  // API schema both prevent this, but fail open if the row was edited by hand.
  if (open === null || close === null) return true;
  if (open === close) return true;

  const current = minutesInTimeZone(now, hours.timezone);

  if (open < close) return current >= open && current < close;
  return current >= open || current < close;
}
