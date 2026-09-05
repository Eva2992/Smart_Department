/**
 * Exam Service — FR-22 Semester Final Exam Routine Management.
 *
 * Provides the business logic layer for managing semester final examination
 * schedule entries. All exam entries are stored as `ScheduleEntry` rows with
 * `type = EXAM` and undergo 3-way conflict detection (Room, Teacher, Batch)
 * via {@link conflictService} before persistence.
 *
 * Implements:
 * - Bulk creation of EXAM ScheduleEntry rows with per-entry conflict checking.
 * - Paginated listing with date-range, batch, and semester filtering.
 * - Individual exam entry update with conflict re-check using the
 *   Self-Exclusion Rule (`excludeScheduleEntryId`) to prevent false self-conflicts.
 * - Soft-cancel via status `CANCELLED`.
 *
 * @see {@link ExamEntryItem} for the client-facing DTO structure.
 * @see {@link conflictService} for the 3-way conflict detection engine.
 * @module services/examService
 */

import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { conflictService } from "./conflictService.js";
import { normalizeDateString } from "../utils/timeUtils.js";
import type {
  CreateExamEntryInput,
  BulkCreateExamInput,
  UpdateExamEntryInput,
  ExamQueryFilter,
  ExamEntryItem,
  PaginatedExamResponse,
} from "../types/exam.js";
import { ScheduleEntryType, ScheduleEntryStatus } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Shapes a raw Prisma ScheduleEntry into the client-facing {@link ExamEntryItem} DTO.
 *
 * Joins related entity names (course, batch, teacher, room) and normalizes
 * date/time fields to ISO string format for JSON serialization.
 *
 * @param raw - Raw Prisma ScheduleEntry with optional joined relations.
 * @returns Normalized {@link ExamEntryItem} DTO ready for API response.
 */
function toExamDTO(raw: {
  id: string;
  type: string;
  status: string;
  courseId: string | null;
  course?: { name: string; code: string } | null;
  batchId: string;
  batch?: { name: string } | null;
  teacherId: string;
  teacher?: { name: string } | null;
  roomId: string;
  room?: { roomNumber: string } | null;
  date: Date | string;
  startTime: Date | string;
  endTime: Date | string;
  topic: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ExamEntryItem {
  return {
    id: raw.id,
    type: "EXAM",
    status: String(raw.status),
    courseId: raw.courseId,
    courseName: raw.course?.name ?? raw.topic ?? null,
    batchId: raw.batchId,
    batchName: raw.batch?.name ?? null,
    teacherId: raw.teacherId,
    teacherName: raw.teacher?.name ?? null,
    roomId: raw.roomId,
    roomNumber: raw.room?.roomNumber ?? null,
    date: typeof raw.date === "string" ? raw.date : raw.date.toISOString().split("T")[0],
    startTime: typeof raw.startTime === "string" ? raw.startTime : raw.startTime.toISOString(),
    endTime: typeof raw.endTime === "string" ? raw.endTime : raw.endTime.toISOString(),
    topic: raw.topic,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : raw.createdAt.toISOString(),
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : raw.updatedAt.toISOString(),
  };
}

/**
 * Prisma `include` clause for joining related entity names on ScheduleEntry queries.
 * @internal
 */
const EXAM_INCLUDE = {
  course: { select: { name: true, code: true } },
  batch: { select: { name: true } },
  teacher: { select: { name: true } },
  room: { select: { roomNumber: true } },
} as const;

// ─── Service Functions ─────────────────────────────────────────────────────────

/**
 * Bulk-creates exam ScheduleEntry rows within a single database transaction.
 *
 * Each entry is individually conflict-checked via {@link conflictService.checkConflict}
 * before insertion. If any entry produces a conflict, the entire transaction is
 * rolled back and an error is thrown with a descriptive message identifying the
 * conflicting exam.
 *
 * @param input - Bulk create payload containing an array of {@link CreateExamEntryInput} entries.
 * @param adminId - The Admin user UUID performing the action (used as default `teacherId`
 *   when not specified per entry, and recorded as `createdById`).
 * @returns Array of created {@link ExamEntryItem} DTOs.
 * @throws {AppError} `VALIDATION_ERROR` (400) if no entries are provided.
 * @throws {AppError} `EXAM_CONFLICT` (409) if any entry conflicts with an existing
 *   schedule entry on room, teacher, or batch dimensions.
 *
 * @example
 * ```ts
 * const exams = await createExamRoutine(
 *   {
 *     entries: [
 *       {
 *         batchId: "batch-uuid",
 *         courseName: "Software Engineering",
 *         roomId: "room-uuid",
 *         date: "2026-12-15",
 *         startTime: "09:00",
 *         endTime: "12:00",
 *       },
 *     ],
 *   },
 *   "admin-uuid"
 * );
 * ```
 */
export async function createExamRoutine(
  input: BulkCreateExamInput,
  adminId: string
): Promise<ExamEntryItem[]> {
  if (!input.entries || input.entries.length === 0) {
    throw new AppError("At least one exam entry is required", 400, "VALIDATION_ERROR");
  }

  const created: ExamEntryItem[] = [];

  // Validate every entry inside a transaction so partial inserts never persist
  await prisma.$transaction(async (tx) => {
    for (const entry of input.entries) {
      const teacherId = entry.teacherId ?? adminId;

      // Build required check using the same teacher ID that will be persisted.
      const conflict = await conflictService.checkConflict(
        {
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          roomId: entry.roomId,
          teacherId,
          batchId: entry.batchId,
        },
        tx
      );

      if (conflict.hasConflict) {
        throw new AppError(
          `Conflict for exam "${entry.courseName}" on ${entry.date}: ${conflict.summaryMessage}`,
          409,
          "EXAM_CONFLICT"
        );
      }

      const raw = await (tx as typeof prisma).scheduleEntry.create({
        data: {
          type: ScheduleEntryType.EXAM,
          status: ScheduleEntryStatus.SCHEDULED,
          batchId: entry.batchId,
          ...(entry.courseId ? { courseId: entry.courseId } : {}),
          teacherId,
          roomId: entry.roomId,
          date: new Date(normalizeDateString(entry.date)),
          startTime: new Date(`${normalizeDateString(entry.date)}T${_toHHmm(entry.startTime)}:00.000Z`),
          endTime: new Date(`${normalizeDateString(entry.date)}T${_toHHmm(entry.endTime)}:00.000Z`),
          topic: entry.courseName, // store courseName in topic for display (course may be null)
          createdById: adminId,
        },
        include: EXAM_INCLUDE,
      });

      created.push(toExamDTO(raw));
    }
  });

  return created;
}

/**
 * Returns a paginated list of EXAM schedule entries, optionally filtered
 * by batch, semester, and date range.
 *
 * Results are ordered by date ascending, then start time ascending.
 * When `semesterId` is provided without `batchId`, the service resolves
 * all batches whose `currentSemesterId` matches.
 *
 * @param filter - Query filters including `batchId`, `semesterId`, date range, and pagination.
 * @returns Paginated response containing {@link ExamEntryItem} DTOs and pagination metadata.
 *
 * @example
 * ```ts
 * const schedule = await getExamSchedule({
 *   batchId: "batch-uuid",
 *   startDate: "2026-12-01",
 *   endDate: "2026-12-31",
 *   page: 1,
 *   limit: 50,
 * });
 * // schedule.exams — array of ExamEntryItem DTOs
 * // schedule.pagination — { total, page, limit, totalPages }
 * ```
 */
export async function getExamSchedule(
  filter: ExamQueryFilter
): Promise<PaginatedExamResponse> {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    type: ScheduleEntryType.EXAM,
  };

  if (filter.batchId) {
    where.batchId = filter.batchId;
  }

  if (filter.startDate || filter.endDate) {
    const dateClause: Record<string, Date> = {};
    if (filter.startDate) dateClause.gte = new Date(normalizeDateString(filter.startDate));
    if (filter.endDate) dateClause.lte = new Date(normalizeDateString(filter.endDate));
    where.date = dateClause;
  }

  // semesterId filtering: get batchIds that have this semester as current
  if (filter.semesterId && !filter.batchId) {
    const batches = await prisma.batch.findMany({
      where: { currentSemesterId: filter.semesterId },
      select: { id: true },
    });
    where.batchId = { in: batches.map((b) => b.id) };
  }

  const [entries, total] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: EXAM_INCLUDE,
    }),
    prisma.scheduleEntry.count({ where }),
  ]);

  return {
    exams: entries.map((e) => toExamDTO(e)),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Fetches a single exam entry by its ScheduleEntry UUID.
 *
 * @param id - ScheduleEntry UUID to retrieve.
 * @returns The matching {@link ExamEntryItem} DTO.
 * @throws {AppError} `EXAM_NOT_FOUND` (404) if no EXAM-type entry exists with the given ID.
 *
 * @example
 * ```ts
 * const exam = await getExamEntryById("entry-uuid");
 * // exam.courseName, exam.date, exam.roomNumber, etc.
 * ```
 */
export async function getExamEntryById(id: string): Promise<ExamEntryItem> {
  const raw = await prisma.scheduleEntry.findUnique({
    where: { id },
    include: EXAM_INCLUDE,
  });

  if (!raw || raw.type !== ScheduleEntryType.EXAM) {
    throw new AppError("Exam entry not found", 404, "EXAM_NOT_FOUND");
  }

  return toExamDTO(raw);
}

/**
 * Updates an existing exam entry with partial field changes.
 *
 * Re-runs 3-way conflict detection before persisting, using the Self-Exclusion Rule
 * (`excludeScheduleEntryId = id`) to prevent the entry from conflicting with itself
 * when only non-time fields change.
 *
 * The batch assignment is immutable on update — only room, teacher, date, time,
 * course, and topic fields can be modified.
 *
 * @param id - ScheduleEntry UUID to update.
 * @param updates - Partial update fields from {@link UpdateExamEntryInput}.
 * @returns Updated {@link ExamEntryItem} DTO.
 * @throws {AppError} `EXAM_NOT_FOUND` (404) if no EXAM-type entry exists with the given ID.
 * @throws {AppError} `EXAM_CONFLICT` (409) if the updated values conflict with another
 *   schedule entry.
 *
 * @example
 * ```ts
 * const updated = await updateExamEntry("entry-uuid", {
 *   roomId: "new-room-uuid",
 *   startTime: "10:00",
 *   endTime: "13:00",
 * });
 * ```
 */
export async function updateExamEntry(
  id: string,
  updates: UpdateExamEntryInput
): Promise<ExamEntryItem> {
  const existing = await prisma.scheduleEntry.findUnique({
    where: { id },
    include: EXAM_INCLUDE,
  });

  if (!existing || existing.type !== ScheduleEntryType.EXAM) {
    throw new AppError("Exam entry not found", 404, "EXAM_NOT_FOUND");
  }

  // Resolve effective values after partial update
  const effectiveDate = updates.date
    ? normalizeDateString(updates.date)
    : normalizeDateString(existing.date);
  const effectiveStartTime =
    updates.startTime ?? existing.startTime;
  const effectiveEndTime =
    updates.endTime ?? existing.endTime;
  const effectiveRoomId = updates.roomId ?? existing.roomId;
  const effectiveTeacherId = updates.teacherId ?? existing.teacherId;
  const effectiveBatchId = existing.batchId; // batch is immutable on update

  const conflict = await conflictService.checkConflict({
    date: effectiveDate,
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    roomId: effectiveRoomId,
    teacherId: effectiveTeacherId,
    batchId: effectiveBatchId,
    excludeScheduleEntryId: id,
  });

  if (conflict.hasConflict) {
    throw new AppError(
      `Update conflict: ${conflict.summaryMessage}`,
      409,
      "EXAM_CONFLICT"
    );
  }

  const updateData: Record<string, unknown> = {};
  if (updates.courseId !== undefined) updateData.courseId = updates.courseId;
  if (updates.roomId) updateData.roomId = updates.roomId;
  if (updates.teacherId) updateData.teacherId = updates.teacherId;
  if (updates.topic !== undefined) updateData.topic = updates.topic;
  if (updates.courseName) {
    // Keep topic in sync with courseName when courseId absent
    if (!updates.courseId && !existing.courseId) {
      updateData.topic = updates.courseName;
    }
  }

  if (updates.date) {
    updateData.date = new Date(normalizeDateString(updates.date));
  }

  if (updates.startTime) {
    const resolvedDate = updates.date
      ? normalizeDateString(updates.date)
      : normalizeDateString(existing.date);
    updateData.startTime = new Date(
      `${resolvedDate}T${_toHHmm(updates.startTime)}:00.000Z`
    );
  }

  if (updates.endTime) {
    const resolvedDate = updates.date
      ? normalizeDateString(updates.date)
      : normalizeDateString(existing.date);
    updateData.endTime = new Date(
      `${resolvedDate}T${_toHHmm(updates.endTime)}:00.000Z`
    );
  }

  const updated = await prisma.scheduleEntry.update({
    where: { id },
    data: updateData,
    include: EXAM_INCLUDE,
  });

  return toExamDTO(updated);
}

/**
 * Cancels (soft-deletes) an exam entry by transitioning its status to `CANCELLED`.
 *
 * The entry remains in the database for audit trail purposes but is excluded
 * from active schedule views.
 *
 * @param id - ScheduleEntry UUID to cancel.
 * @returns Updated {@link ExamEntryItem} DTO with `status = "CANCELLED"`.
 * @throws {AppError} `EXAM_NOT_FOUND` (404) if no EXAM-type entry exists with the given ID.
 *
 * @example
 * ```ts
 * const cancelled = await cancelExamEntry("entry-uuid");
 * // cancelled.status === "CANCELLED"
 * ```
 */
export async function cancelExamEntry(id: string): Promise<ExamEntryItem> {
  const existing = await prisma.scheduleEntry.findUnique({ where: { id } });

  if (!existing || existing.type !== ScheduleEntryType.EXAM) {
    throw new AppError("Exam entry not found", 404, "EXAM_NOT_FOUND");
  }

  const updated = await prisma.scheduleEntry.update({
    where: { id },
    data: { status: ScheduleEntryStatus.CANCELLED },
    include: EXAM_INCLUDE,
  });

  return toExamDTO(updated);
}

/**
 * Converts various time-string formats to `"HH:mm"` for ISO datetime construction.
 *
 * Handles three input formats:
 * - `"HH:mm"` — returned as-is.
 * - `"HH:mm:ss"` — truncated to `"HH:mm"`.
 * - ISO datetime string (contains `"T"`) — extracts the time portion.
 *
 * @param value - Time value as string or Date object.
 * @returns Time string in `"HH:mm"` format.
 * @internal
 */
function _toHHmm(value: string | Date): string {
  const s = typeof value === "string" ? value : value.toISOString();
  // ISO datetime → extract time part
  if (s.includes("T")) {
    return s.split("T")[1].substring(0, 5);
  }
  // Already HH:mm or HH:mm:ss
  return s.substring(0, 5);
}

export const examService = {
  createExamRoutine,
  getExamSchedule,
  getExamEntryById,
  updateExamEntry,
  cancelExamEntry,
};
