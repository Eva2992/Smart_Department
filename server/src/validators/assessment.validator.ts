import { z } from "zod";

export const scheduleCtSchema = z.object({
  scheduleEntryId: z.string().uuid(),
  teacherId: z.string().uuid(),
  topic: z.string().trim().min(1).max(255),
  confirmSameDayConflict: z.boolean().optional().default(false),
});

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

export const listAssignmentsQuerySchema = z.object({
  batchId: z.string().uuid(),
});
