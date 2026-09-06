import type { Role, Program } from "@prisma/client";

/**
 * Individual course mark entry within a student's semester final result.
 *
 * Each item represents the student's performance in one course, including
 * the raw percentage marks, the mapped JU CSE letter grade, the grade point
 * on the 4.0 scale, and the course's credit weight used for GPA calculation.
 *
 * @see {@link ResultService.calculateGPA} for credit-weighted GPA computation.
 */
export interface CourseMarkItem {
  /** Course code identifier (e.g. `"CSE 404"`). */
  courseCode: string;

  /** Full course title (e.g. `"Software Engineering"`). */
  courseTitle: string;

  /** Credit hours assigned to the course, used as weight in GPA calculation. */
  creditHours: number;

  /** Raw percentage marks (0–100). Absent when only a letter grade was provided. */
  marks?: number;

  /** JU CSE letter grade mapped from marks (e.g. `"A+"`, `"B-"`, `"F"`). */
  letterGrade: string;

  /** Numeric grade point on the JU 4.0 scale (e.g. `4.0` for A+, `0.0` for F). */
  gradePoint: number;
}

/**
 * Validated student result row parsed from uploaded CSV/spreadsheet grade sheets.
 *
 * Produced by {@link ResultService.parseAndValidateGradeSheet} after extracting
 * individual student rows and mapping marks to the JU CSE grading scale.
 */
export interface ParsedStudentResult {
  /** Student's official Jahangirnagar University ID (roll number). */
  universityId: string;

  /** Student's full name, if available in the grade sheet. */
  studentName?: string;

  /** Array of per-course mark entries for this student's semester. */
  courseMarks: CourseMarkItem[];

  /** Credit-weighted semester GPA on the JU 4.0 scale. */
  gpa: number;

  /** Cumulative GPA across all completed semesters. Defaults to semester GPA if absent. */
  cgpa?: number;
}

/**
 * Payload for uploading and publishing semester final results.
 *
 * Implements the Dual-Hybrid Result Storage model (ADR-0004):
 * structured relational {@link Result} records are created per student,
 * while the raw document is archived in the {@link Resource} repository.
 */
export interface UploadResultPayload {
  /** Target batch UUID for this result upload. */
  batchId: string;

  /** Target semester UUID within the batch. */
  semesterId: string;

  /** Parsed and validated student result rows. */
  results: ParsedStudentResult[];

  /** Raw CSV/spreadsheet content for archival in the Resource repository. */
  rawContent?: string;

  /** Original uploaded file name (e.g. `"results_batch51.csv"`). */
  fileName?: string;

  /** File size in bytes for the archived resource record. */
  fileSizeBytes?: number;
}

/**
 * Query parameters for searching and filtering published results.
 *
 * Supports paginated access for both the public result page (FR-26)
 * and authenticated student dashboards.
 */
export interface ResultQueryParams {
  /** Filter by batch UUID. */
  batchId?: string;

  /** Filter by semester UUID. */
  semesterId?: string;

  /** Filter by academic program (e.g. `BSC_HONOURS`, `MSC`). */
  program?: Program;

  /** Case-insensitive partial match on student university ID. */
  universityId?: string;

  /** Free-text search across university ID and student name. */
  search?: string;

  /** Page number for pagination (1-indexed, defaults to 1). */
  page?: number;

  /** Number of results per page (defaults to 20, max 100). */
  limit?: number;
}

/**
 * Authenticated user context for the result uploader.
 *
 * Used by {@link ResultService.publishResult} to enforce RBAC:
 * CR users can only upload for their assigned batch.
 */
export interface UploaderContext {
  /** Authenticated user's UUID. */
  id: string;

  /** User's system role (`ADMIN`, `CR`, `TEACHER`, `STUDENT`). */
  role: Role;

  /** CR's assigned batch UUID. Required when role is `CR` for batch-ownership validation. */
  batchId?: string | null;
}
