import { z } from "zod";

export const validLetterGrades = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "D",
  "F",
] as const;

export const courseMarkItemSchema = z.object({
  courseCode: z.string().trim().min(2, "Course code is required (min 2 chars)"),
  courseTitle: z.string().trim().min(2, "Course title is required"),
  creditHours: z.number().positive("Credit hours must be positive"),
  marks: z.number().min(0, "Marks cannot be negative").max(100, "Marks cannot exceed 100").optional(),
  letterGrade: z.string().trim().refine((val) => (validLetterGrades as readonly string[]).includes(val.toUpperCase()), {
    message: "Invalid letter grade. Must be one of: A+, A, A-, B+, B, B-, C+, C, D, F",
  }),
  gradePoint: z.number().min(0, "Grade point cannot be negative").max(4.0, "Grade point cannot exceed 4.0"),
});

export const studentResultItemSchema = z.object({
  universityId: z.string().trim().min(1, "University ID / Roll is required"),
  studentName: z.string().trim().optional(),
  courseMarks: z.array(courseMarkItemSchema).min(1, "At least one course is required"),
  gpa: z.number().min(0, "GPA cannot be negative").max(4.0, "GPA cannot exceed 4.0"),
  cgpa: z.number().min(0, "CGPA cannot be negative").max(4.0, "CGPA cannot exceed 4.0").optional(),
});

export const uploadResultSchema = z.object({
  batchId: z.string().trim().min(1, "Batch ID is required"),
  semesterId: z.string().trim().min(1, "Semester ID is required"),
  results: z.array(studentResultItemSchema).min(1, "At least one student result record is required"),
  rawContent: z.string().optional(),
  fileName: z.string().optional(),
  fileSizeBytes: z.number().int().nonnegative().optional(),
});

export const queryResultSchema = z.object({
  batchId: z.string().trim().optional(),
  semesterId: z.string().trim().optional(),
  program: z.enum(["HONOURS", "MASTERS", "PMSCS", "MPHIL", "PHD"]).optional(),
  universityId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const studentParamSchema = z.object({
  id: z.string().trim().min(1, "Student / University ID is required"),
});
