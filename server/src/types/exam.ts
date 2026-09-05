/**
 * Exam Routine Management — TypeScript domain types.
 *
 * Supports FR-22: Semester Final Exam Routine Generation.
 * These types define the contract between the exam controller/validator layer
 * and the {@link examService} business logic.
 *
 * @module types/exam
 */

/**
 * Input for creating a single exam schedule entry.
 *
 * Each entry maps to a `ScheduleEntry` row with `type = EXAM`.
 * The entry undergoes 3-way conflict detection (Room, Teacher, Batch)
 * via {@link conflictService.checkConflict} before persistence.
 */
export interface CreateExamEntryInput {
  /** Batch UUID to which this exam belongs. */
  batchId: string;

  /** Optional course UUID reference (nullable per SRS when course catalog entry is unavailable). */
  courseId?: string;

  /** Human-readable course name for display (stored in `topic` field when `courseId` is absent). */
  courseName: string;

  /** Room UUID assigned for this exam session. */
  roomId: string;

  /** Exam date in ISO 8601 format (e.g. `"2026-12-15"`). */
  date: string;

  /** Start time as ISO 8601 datetime or `"HH:mm"` string. */
  startTime: string;

  /** End time as ISO 8601 datetime or `"HH:mm"` string. */
  endTime: string;

  /** Optional teacher/invigilator user UUID. Defaults to the admin performing the action. */
  teacherId?: string;

  /** Optional free-text notes or exam topic description. */
  topic?: string;
}

/**
 * Bulk creation payload for exam routine generation.
 *
 * Wraps multiple {@link CreateExamEntryInput} entries for transactional
 * insertion. All entries are conflict-checked individually; any single
 * conflict aborts the entire batch.
 */
export interface BulkCreateExamInput {
  /** Optional semester UUID for validation context. */
  semesterId?: string;

  /** Array of individual exam entries to create. */
  entries: CreateExamEntryInput[];
}

/**
 * Partial update payload for modifying an existing exam entry.
 *
 * All fields are optional. The update re-runs conflict detection
 * with {@link conflictService.checkConflict} using the Self-Exclusion Rule
 * (`excludeScheduleEntryId`) to avoid false self-conflicts.
 */
export interface UpdateExamEntryInput {
  /** Updated course UUID reference. */
  courseId?: string;

  /** Updated human-readable course name. */
  courseName?: string;

  /** Updated room UUID. */
  roomId?: string;

  /** Updated exam date in `YYYY-MM-DD` format. */
  date?: string;

  /** Updated start time. */
  startTime?: string;

  /** Updated end time. */
  endTime?: string;

  /** Updated teacher/invigilator UUID. */
  teacherId?: string;

  /** Updated free-text topic or notes. */
  topic?: string;
}

/**
 * Query filter parameters for listing exam schedule entries.
 *
 * Supports date-range, batch, and semester filtering with pagination.
 */
export interface ExamQueryFilter {
  /** Filter by batch UUID. */
  batchId?: string;

  /** Filter by semester UUID (resolves to matching batch IDs). */
  semesterId?: string;

  /** ISO date range start (inclusive, `YYYY-MM-DD`). */
  startDate?: string;

  /** ISO date range end (inclusive, `YYYY-MM-DD`). */
  endDate?: string;

  /** Page number (1-indexed, defaults to 1). */
  page?: number;

  /** Results per page (defaults to 50, max 100). */
  limit?: number;
}

/**
 * Client-facing DTO representing a single exam schedule entry.
 *
 * Shaped from raw Prisma `ScheduleEntry` rows by the `toExamDTO` helper
 * in {@link examService}, joining related batch, course, teacher, and room names.
 */
export interface ExamEntryItem {
  /** Unique ScheduleEntry UUID. */
  id: string;

  /** Entry type discriminator (always `"EXAM"`). */
  type: "EXAM";

  /** Current entry status (e.g. `"SCHEDULED"`, `"CANCELLED"`). */
  status: string;

  /** Associated course UUID, or `null` if unavailable. */
  courseId: string | null;

  /** Human-readable course name, or `null`. */
  courseName: string | null;

  /** Batch UUID for this exam. */
  batchId: string;

  /** Human-readable batch name (e.g. `"Batch 51"`), or `null`. */
  batchName: string | null;

  /** Teacher/invigilator user UUID. */
  teacherId: string;

  /** Teacher's display name, or `null`. */
  teacherName: string | null;

  /** Room UUID assigned for the exam. */
  roomId: string;

  /** Room number (e.g. `"R-101"`), or `null`. */
  roomNumber: string | null;

  /** Exam date as ISO date string (`YYYY-MM-DD`). */
  date: string;

  /** Start time as ISO datetime string. */
  startTime: string;

  /** End time as ISO datetime string. */
  endTime: string;

  /** Free-text topic or notes, or `null`. */
  topic: string | null;

  /** ISO datetime when the entry was created. */
  createdAt: string;

  /** ISO datetime when the entry was last updated. */
  updatedAt: string;
}

/**
 * Paginated response wrapper for exam schedule listings.
 */
export interface PaginatedExamResponse {
  /** Array of exam entry DTOs for the current page. */
  exams: ExamEntryItem[];

  /** Pagination metadata. */
  pagination: {
    /** Total number of matching exam entries. */
    total: number;

    /** Current page number (1-indexed). */
    page: number;

    /** Number of entries per page. */
    limit: number;

    /** Total number of pages. */
    totalPages: number;
  };
}
