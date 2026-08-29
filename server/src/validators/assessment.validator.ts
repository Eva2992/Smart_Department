import { z } from "zod";

export const scheduleCtSchema = z.object({
  scheduleEntryId: z.string().uuid(),
  teacherId: z.string().uuid(),
  topic: z.string().trim().min(1).max(255),
  confirmSameDayConflict: z.boolean().optional().default(false),
});

export const updateCtParamsSchema = z.object({ ctId: z.string().uuid() });
export const updateCtSchema = z.object({
  teacherId: z.string().uuid(),
  date: z.coerce.date().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  roomNumber: z.string().optional(),
  topic: z.string().optional(),
});

export const cancelCtParamsSchema = z.object({ ctId: z.string().uuid() });
export const cancelCtSchema = z.object({ teacherId: z.string().uuid() });

export const studentCtMarksParamsSchema = z.object({
  studentId: z.string().uuid(),
});

export const createAssignmentSchema = z.object({
  teacherId: z.string().uuid(),
  courseId: z.string().uuid(),
  batchId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(5000),
  dueDate: z.coerce.date(),
});

// courseId filter is intentionally omitted until the service implements it
export const listAssignmentsQuerySchema = z.object({
  batchId: z.string().uuid(),
});

export const updateAssignmentParamsSchema = z.object({ assignmentId: z.string().uuid() });
export const updateAssignmentSchema = z.object({
  teacherId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export const deleteAssignmentParamsSchema = z.object({ assignmentId: z.string().uuid() });
export const deleteAssignmentSchema = z.object({ teacherId: z.string().uuid() });
