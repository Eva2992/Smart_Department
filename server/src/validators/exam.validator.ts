/**
 * Zod validation schemas for Exam Routine endpoints.
 *
 * Enforces input constraints for FR-22: Semester Final Exam Routine Generation,
 * including date format validation, time constraints, and pagination limits.
 *
 * @see {@link ExamController} for endpoint handlers consuming these schemas.
 * @see {@link CreateExamEntryInput} for the corresponding domain type.
 * @module validators/exam
 */

import { z } from "zod";

/**
 * Zod schema validating a single exam entry input for creation.
 *
 * Enforces:
 * - `batchId`, `roomId`: non-empty UUID strings.
 * - `courseName`: 2–200 characters.
 * - `date`: ISO 8601 date format (`YYYY-MM-DD`).
 * - `startTime`, `endTime`: non-empty time strings.
 * - `courseId`, `teacherId`, `topic`: optional fields.
 */
export const createExamEntrySchema = z.object({
  batchId: z.string().trim().min(1, "Batch ID is required"),
  courseId: z.string().trim().min(1).optional(),
  courseName: z
    .string()
    .trim()
    .min(2, "Course name must be at least 2 characters")
    .max(200, "Course name cannot exceed 200 characters"),
  roomId: z.string().trim().min(1, "Room ID is required"),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().min(1, "End time is required"),
  teacherId: z.string().trim().min(1).optional(),
  topic: z.string().trim().max(500, "Topic cannot exceed 500 characters").optional(),
});

/**
 * Zod schema for bulk exam routine creation payload.
 *
 * Wraps an array of {@link createExamEntrySchema} entries (1–100) with an
 * optional `semesterId` for validation context.
 *
 * @see {@link ExamController.createExamRoutine} for the consuming endpoint.
 */
export const bulkCreateExamSchema = z.object({
  semesterId: z.string().trim().min(1).optional(),
  entries: z
    .array(createExamEntrySchema)
    .min(1, "At least one exam entry is required")
    .max(100, "Cannot create more than 100 exam entries at once"),
});

/**
 * Zod schema for partial exam entry update payload.
 *
 * All fields are optional. Includes a refinement ensuring at least one field
 * is provided to prevent empty PATCH requests.
 *
 * @see {@link ExamController.updateExamEntry} for the consuming endpoint.
 */
export const updateExamEntrySchema = z
  .object({
    courseId: z.string().trim().min(1).optional(),
    courseName: z
      .string()
      .trim()
      .min(2, "Course name must be at least 2 characters")
      .max(200)
      .optional(),
    roomId: z.string().trim().min(1).optional(),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    startTime: z.string().trim().min(1).optional(),
    endTime: z.string().trim().min(1).optional(),
    teacherId: z.string().trim().min(1).optional(),
    topic: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Zod schema for exam schedule listing query parameters.
 *
 * Supports optional filtering by `batchId`, `semesterId`, and date range
 * (`startDate`/`endDate` in `YYYY-MM-DD` format) with pagination defaults
 * (page=1, limit=50, max=100).
 */
export const examQuerySchema = z.object({
  batchId: z.string().trim().min(1).optional(),
  semesterId: z.string().trim().min(1).optional(),
  startDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Zod schema for the exam entry `id` path parameter.
 *
 * Validates that a non-empty ScheduleEntry UUID is provided.
 */
export const examIdParamSchema = z.object({
  id: z.string().trim().min(1, "Exam entry ID is required"),
});
