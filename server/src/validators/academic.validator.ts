import { z } from "zod";

export const ProgramEnum = z.enum(["HONOURS", "MASTERS", "PMSCS", "MPHIL", "PHD"]);
export const BatchStatusEnum = z.enum(["ACTIVE", "COMPLETED"]);
export const SemesterStatusEnum = z.enum(["ACTIVE", "ARCHIVED"]);
export const StudentStatusEnum = z.enum(["ACTIVE", "PROMOTED", "DEMOTED", "DROPOUT", "GRADUATED"]);
export const RoleEnum = z.enum(["STUDENT", "CR", "TEACHER", "ADMIN"]);

export const createBatchSchema = z.object({
  name: z.string().min(1, "Batch name is required").max(50),
  program: ProgramEnum,
});

export const courseAssignmentSchema = z.object({
  name: z.string().min(1, "Course name is required").max(150),
  code: z.string().min(1, "Course code is required").max(30),
  creditHours: z.number().min(0.5, "Credit hours must be at least 0.5").max(10),
  teacherId: z.string().min(1, "Teacher ID is required"),
});

export const createSemesterSchema = z.object({
  name: z.string().min(1, "Semester name is required").max(100),
  batchId: z.string().min(1, "Batch ID is required"),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  courses: z.array(courseAssignmentSchema).default([]),
  isCurrent: z.boolean().optional(),
});

export const updateSemesterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  status: SemesterStatusEnum.optional(),
});

export const requestPromotionSchema = z.object({
  batchId: z.string().min(1, "Batch ID is required"),
  semesterId: z.string().min(1, "Semester ID is required"),
  reason: z.string().max(500).optional(),
});

export const promoteBatchSchema = z.object({
  promotionRequestId: z.string().min(1).optional(),
  nextSemesterName: z.string().max(100).optional(),
  nextSemesterStartDate: z.string().or(z.date()).optional(),
  nextSemesterEndDate: z.string().or(z.date()).optional(),
  isGraduation: z.boolean().optional(),
});

export const rejectPromotionSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

export const overrideStudentSemesterSchema = z.object({
  batchId: z.string().min(1).optional(),
  studentStatus: StudentStatusEnum.optional(),
  role: RoleEnum.optional(),
  reason: z.string().max(500).optional(),
});

export const assignCRSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  reason: z.string().max(500).optional(),
});

export const preloadedStudentItemSchema = z.object({
  universityId: z.string().min(1, "University ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  batchId: z.string().min(1, "Batch ID is required"),
  program: ProgramEnum,
});

export const bulkPreloadedStudentsSchema = z.object({
  students: z.array(preloadedStudentItemSchema).min(1, "At least one student record is required"),
});

export const preloadedTeacherItemSchema = z.object({
  uniqueId: z.string().min(1, "Teacher Unique ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  designation: z.string().min(1, "Designation is required"),
  isChairman: z.boolean().optional().default(false),
});

export const bulkPreloadedTeachersSchema = z.object({
  teachers: z.array(preloadedTeacherItemSchema).min(1, "At least one teacher record is required"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["STUDENT", "CR"], {
    message: "Role must be either STUDENT or CR",
  }),
});
