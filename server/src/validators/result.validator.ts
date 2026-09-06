/**
 * Zod validation schemas for Result Upload and Query endpoints.
 *
 * Enforces the JU CSE grading constraints (FR-25, FR-26):
 * - Valid letter grades: A+, A, A-, B+, B, B-, C+, C, D, F.
 * - GPA/CGPA range: 0.0–4.0.
 * - Marks range: 0–100.
 * - Credit hours: positive numbers.
 *
 * @see {@link ResultController} for endpoint handlers consuming these schemas.
 * @see {@link JU_GRADING_SCALE} for the official grading scale mapping.
 * @module validators/result
 */

import { z } from "zod";

/**
 * Tuple of valid JU CSE letter grades ordered from highest to lowest.
 *
 * Used by {@link courseMarkItemSchema} for runtime grade validation.
 */
export const validLetterGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"] as const;

/**
 * Zod schema validating a single {@link CourseMarkItem} entry.
 *
 * Enforces:
 * - `courseCode`: minimum 2 characters.
 * - `courseTitle`: minimum 2 characters.
 * - `creditHours`: positive number.
 * - `marks`: optional, 0–100 range.
 * - `letterGrade`: must be one of {@link validLetterGrades} (case-insensitive).
 * - `gradePoint`: 0.0–4.0 range.
 */
export const courseMarkItemSchema = z.object({
  courseCode: z.string().trim().min(2, "Course code is required (min 2 chars)"),
  courseTitle: z.string().trim().min(2, "Course title is required"),
  creditHours: z.number().positive("Credit hours must be positive"),
  marks: z
    .number()
    .min(0, "Marks cannot be negative")
    .max(100, "Marks cannot exceed 100")
    .optional(),
  letterGrade: z
    .string()
    .trim()
    .refine((val) => (validLetterGrades as readonly string[]).includes(val.toUpperCase()), {
      message: "Invalid letter grade. Must be one of: A+, A, A-, B+, B, B-, C+, C, D, F",
    }),
  gradePoint: z
    .number()
    .min(0, "Grade point cannot be negative")
    .max(4.0, "Grade point cannot exceed 4.0"),
});

/**
 * Zod schema validating a single student result row within the upload payload.
 *
 * Enforces:
 * - `universityId`: non-empty string (student roll number).
 * - `courseMarks`: at least one {@link courseMarkItemSchema} entry.
 * - `gpa`: 0.0–4.0 range.
 * - `cgpa`: optional, 0.0–4.0 range.
 */
export const studentResultItemSchema = z.object({
  universityId: z.string().trim().min(1, "University ID / Roll is required"),
  studentName: z.string().trim().optional(),
  courseMarks: z.array(courseMarkItemSchema).min(1, "At least one course is required"),
  gpa: z.number().min(0, "GPA cannot be negative").max(4.0, "GPA cannot exceed 4.0"),
  cgpa: z.number().min(0, "CGPA cannot be negative").max(4.0, "CGPA cannot exceed 4.0").optional(),
});

/**
 * Zod schema for the complete result upload payload (FR-25).
 *
 * Validates:
 * - `batchId` and `semesterId`: non-empty UUIDs.
 * - `results`: at least one {@link studentResultItemSchema} entry.
 * - `rawContent`: optional raw CSV string for dual-hybrid archival (ADR-0004).
 * - `fileName` and `fileSizeBytes`: optional metadata for the archived resource.
 *
 * @see {@link ResultController.uploadResults} for the consuming endpoint.
 */
export const uploadResultSchema = z.object({
  batchId: z.string().trim().min(1, "Batch ID is required"),
  semesterId: z.string().trim().min(1, "Semester ID is required"),
  results: z
    .array(studentResultItemSchema)
    .min(1, "At least one student result record is required"),
  rawContent: z.string().optional(),
  fileName: z.string().optional(),
  fileSizeBytes: z.number().int().nonnegative().optional(),
});

/**
 * Zod schema for result query parameters (FR-26 public result page).
 *
 * All fields are optional for flexible filtering:
 * - `batchId`, `semesterId`, `universityId`: UUID or ID string filters.
 * - `program`: enum constraint matching Prisma `Program` values.
 * - `search`: free-text search across university ID and student name.
 * - `page` and `limit`: pagination with defaults (page=1, limit=20, max=100).
 */
export const queryResultSchema = z.object({
  batchId: z.string().trim().optional(),
  semesterId: z.string().trim().optional(),
  program: z.enum(["HONOURS", "MASTERS", "PMSCS", "MPHIL", "PHD"]).optional(),
  universityId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Zod schema for the student result lookup `id` path parameter.
 *
 * Validates that a non-empty student University ID or User UUID is provided.
 */
export const studentParamSchema = z.object({
  id: z.string().trim().min(1, "Student / University ID is required"),
});
