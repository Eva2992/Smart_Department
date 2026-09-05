import { prisma } from "../lib/prisma.js";
import {
  isTimeOverlapping,
  normalizeDateString,
  timeToMinutes,
  minutesToTimeString,
  formatTime12h,
} from "../utils/timeUtils.js";
import { ScheduleEntryStatus } from "@prisma/client";

export type ConflictType = "ROOM" | "TEACHER" | "BATCH";

export interface ConflictingEntrySummary {
  id: string;
  courseName?: string;
  courseCode?: string;
  teacherName?: string;
  teacherId?: string;
  roomNumber?: string;
  roomId?: string;
  batchName?: string;
  batchId?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
}

export interface ConflictDetail {
  type: ConflictType;
  message: string;
  conflictingEntry: ConflictingEntrySummary;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  summaryMessage?: string;
}

export interface CheckConflictInput {
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  roomId?: string;
  teacherId?: string;
  batchId?: string;
  excludeScheduleEntryId?: string;
}

export interface ExistingScheduleEntryItem {
  id: string;
  date: Date | string;
  startTime: Date | string;
  endTime: Date | string;
  roomId: string;
  teacherId: string;
  batchId: string;
  type?: string;
  status?: ScheduleEntryStatus | string;
  course?: { name: string; code: string } | null;
  teacher?: { name: string; email?: string } | null;
  room?: { roomNumber: string } | null;
  batch?: { name: string } | null;
}

/**
 * Pure in-memory conflict evaluation given a proposed slot and a list of existing schedule records.
 *
 * @param existingEntries - The list of existing schedule entries to check against
 * @param input - The proposed time slot details
 * @returns Conflict detection results
 *
 * @example
 * ```ts
 * const result = evaluateInMemConflicts(entries, input);
 * ```
 */
export function evaluateInMemConflicts(
  existingEntries: ExistingScheduleEntryItem[],
  input: CheckConflictInput
): ConflictResult {
  const targetDateStr = normalizeDateString(input.date);
  const conflicts: ConflictDetail[] = [];

  for (const entry of existingEntries) {
    // Exclude if entry matches excluded ID
    if (input.excludeScheduleEntryId && entry.id === input.excludeScheduleEntryId) {
      continue;
    }

    // Cancelled or holiday entries do NOT conflict
    if (
      entry.status === ScheduleEntryStatus.CANCELLED ||
      entry.status === ScheduleEntryStatus.HOLIDAY ||
      entry.status === "CANCELLED" ||
      entry.status === "HOLIDAY"
    ) {
      continue;
    }

    const entryDateStr = normalizeDateString(entry.date);
    if (entryDateStr !== targetDateStr) {
      continue;
    }

    // Check time overlap
    let overlapping = false;
    try {
      overlapping = isTimeOverlapping(
        input.startTime,
        input.endTime,
        entry.startTime,
        entry.endTime
      );
    } catch {
      overlapping = false;
    }

    if (!overlapping) {
      continue;
    }

    const entryStartFormatted = formatTime12h(entry.startTime);
    const entryEndFormatted = formatTime12h(entry.endTime);
    const courseTitle = entry.course
      ? `${entry.course.code} (${entry.course.name})`
      : entry.type || "Class";
    const roomName = entry.room?.roomNumber || "the room";
    const teacherName = entry.teacher?.name || "Teacher";
    const batchName = entry.batch?.name || "Batch";

    const entrySummary: ConflictingEntrySummary = {
      id: entry.id,
      courseName: entry.course?.name,
      courseCode: entry.course?.code,
      teacherName: entry.teacher?.name,
      teacherId: entry.teacherId,
      roomNumber: entry.room?.roomNumber,
      roomId: entry.roomId,
      batchName: entry.batch?.name,
      batchId: entry.batchId,
      date: entryDateStr,
      startTime:
        typeof entry.startTime === "string"
          ? entry.startTime
          : minutesToTimeString(timeToMinutes(entry.startTime)),
      endTime:
        typeof entry.endTime === "string"
          ? entry.endTime
          : minutesToTimeString(timeToMinutes(entry.endTime)),
      type: entry.type || "CLASS",
      status: String(entry.status || "SCHEDULED"),
    };

    // 1. Room Conflict
    if (input.roomId && entry.roomId === input.roomId) {
      conflicts.push({
        type: "ROOM",
        message: `Room ${roomName} is already occupied by "${courseTitle}" from ${entryStartFormatted} to ${entryEndFormatted} on ${targetDateStr}.`,
        conflictingEntry: entrySummary,
      });
    }

    // 2. Teacher Conflict
    if (input.teacherId && entry.teacherId === input.teacherId) {
      conflicts.push({
        type: "TEACHER",
        message: `Teacher ${teacherName} is already scheduled to teach "${courseTitle}" in ${roomName} from ${entryStartFormatted} to ${entryEndFormatted} on ${targetDateStr}.`,
        conflictingEntry: entrySummary,
      });
    }

    // 3. Batch Conflict
    if (input.batchId && entry.batchId === input.batchId) {
      conflicts.push({
        type: "BATCH",
        message: `Batch ${batchName} already has "${courseTitle}" scheduled in ${roomName} from ${entryStartFormatted} to ${entryEndFormatted} on ${targetDateStr}.`,
        conflictingEntry: entrySummary,
      });
    }
  }

  const hasConflict = conflicts.length > 0;
  const summaryMessage = hasConflict
    ? `Schedule conflict detected: ${conflicts.map((c) => c.message).join(" ")}`
    : undefined;

  return {
    hasConflict,
    conflicts,
    summaryMessage,
  };
}

export class ConflictService {
  /**
   * Checks database for any 3-way scheduling conflict (Room, Teacher, Batch).
   *
   * @param input - The schedule entry constraints to check
   * @param txClient - The Prisma client or transaction to use
   * @returns A conflict result indicating any detected conflicts
   *
   * @example
   * ```ts
   * const conflict = await conflictService.checkConflict(input);
   * ```
   */
  async checkConflict(
    input: CheckConflictInput,
    txClient: typeof prisma | any = prisma
  ): Promise<ConflictResult> {
    const targetDate = new Date(normalizeDateString(input.date));

    // Construct OR conditions for matching entities
    const orConditions: any[] = [];
    if (input.roomId) orConditions.push({ roomId: input.roomId });
    if (input.teacherId) orConditions.push({ teacherId: input.teacherId });
    if (input.batchId) orConditions.push({ batchId: input.batchId });

    if (orConditions.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    // Query all potentially overlapping entries on this date
    const existingEntries = await txClient.scheduleEntry.findMany({
      where: {
        date: targetDate,
        status: {
          notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY],
        },
        ...(input.excludeScheduleEntryId ? { id: { not: input.excludeScheduleEntryId } } : {}),
        OR: orConditions,
      },
      include: {
        course: { select: { name: true, code: true } },
        teacher: { select: { name: true, email: true } },
        room: { select: { roomNumber: true } },
        batch: { select: { name: true } },
      },
    });

    return evaluateInMemConflicts(existingEntries, input);
  }

  /**
   * Helper to check pure interval overlap.
   *
   * @param startA - Start time of first interval
   * @param endA - End time of first interval
   * @param startB - Start time of second interval
   * @param endB - End time of second interval
   * @returns True if intervals overlap
   *
   * @example
   * ```ts
   * const overlap = conflictService.checkOverlap('10:00', '11:00', '10:30', '11:30');
   * ```
   */
  checkOverlap(
    startA: string | Date,
    endA: string | Date,
    startB: string | Date,
    endB: string | Date
  ): boolean {
    return isTimeOverlapping(startA, endA, startB, endB);
  }
}

export const conflictService = new ConflictService();
