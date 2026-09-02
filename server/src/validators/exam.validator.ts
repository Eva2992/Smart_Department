/**
 * Zod validation schemas for Exam Routine endpoints.
 * FR-22: Semester Final Exam Routine Generation
 */

import { z } from "zod";

/** Single exam entry input schema */
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

/** Bulk create payload — one or many exam entries */
export const bulkCreateExamSchema = z.object({
  semesterId: z.string().trim().min(1).optional(),
  entries: z
    .array(createExamEntrySchema)
    .min(1, "At least one exam entry is required")
    .max(100, "Cannot create more than 100 exam entries at once"),
});

/** PATCH payload — all fields optional */
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

/** Query filter schema for GET exam list */
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

/** ID param schema */
export const examIdParamSchema = z.object({
  id: z.string().trim().min(1, "Exam entry ID is required"),
});
