/**
 * Time utility functions for academic scheduling and conflict detection.
 */

/**
 * Converts a time string (e.g. "09:00", "09:00:00", "9:30") or Date to minutes from midnight (0 - 1439).
 */
export function timeToMinutes(time: string | Date): number {
  if (time instanceof Date) {
    return time.getUTCHours() * 60 + time.getUTCMinutes();
  }

  const trimmed = time.trim();
  // Handle ISO strings (e.g. "1970-01-01T09:00:00.000Z" or "2026-08-27T09:00:00Z")
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      // Check if time has timezone offset or is UTC
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    }
  }

  // Handle "HH:mm" or "HH:mm:ss"
  const parts = trimmed.split(":");
  if (parts.length < 2) {
    throw new Error(`Invalid time format: "${time}". Expected "HH:mm" or "HH:mm:ss".`);
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values in "${time}". Hours: 0-23, Minutes: 0-59.`);
  }

  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight back to "HH:mm" string.
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Mathematical Overlap Condition:
 * Slot A [startA, endA] overlaps with Slot B [startB, endB] iff:
 * startA < endB AND endA > startB
 *
 * Abutting intervals (endA === startB or startA === endB) do NOT overlap.
 */
export function isTimeOverlapping(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  const minStartA = timeToMinutes(startA);
  const minEndA = timeToMinutes(endA);
  const minStartB = timeToMinutes(startB);
  const minEndB = timeToMinutes(endB);

  if (minStartA >= minEndA) {
    throw new Error(`Invalid interval A: start (${startA}) must be strictly before end (${endA}).`);
  }
  if (minStartB >= minEndB) {
    throw new Error(`Invalid interval B: start (${startB}) must be strictly before end (${endB}).`);
  }

  return minStartA < minEndB && minEndA > minStartB;
}

/**
 * Normalizes a date to YYYY-MM-DD string.
 */
export function normalizeDateString(date: string | Date): string {
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  if (typeof date === "string") {
    return date.split("T")[0].trim();
  }
  throw new Error(`Invalid date format: ${date}`);
}

/**
 * Formats time into 12-hour AM/PM string (e.g. "09:00 AM", "01:30 PM").
 */
export function formatTime12h(time: string | Date): string {
  const mins = timeToMinutes(time);
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
