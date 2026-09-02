import type { Role, Program } from "./auth.js";
export type { Role, Program };

export type BatchStatus = "ACTIVE" | "COMPLETED";
export type SemesterStatus = "ACTIVE" | "ARCHIVED";
export type StudentStatus = "ACTIVE" | "PROMOTED" | "DEMOTED" | "DROPOUT" | "GRADUATED";
export type PromotionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Course {
  id: string;
  name: string;
  code: string;
  creditHours: number;
  semesterId: string;
  teacherId: string;
  teacher?: {
    id: string;
    name: string;
    email: string;
    teacherUniqueId?: string | null;
  };
}

export interface Semester {
  id: string;
  name: string;
  batchId: string;
  startDate: string;
  endDate: string;
  status: SemesterStatus;
  archivedAt?: string | null;
  courses?: Course[];
  batch?: {
    id: string;
    name: string;
    program: Program;
    status: BatchStatus;
  };
  _count?: {
    courses: number;
    results: number;
  };
}

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  universityId?: string | null;
  role: Role;
  studentStatus?: StudentStatus;
  program?: Program | null;
  batchId?: string | null;
  batch?: {
    id: string;
    name: string;
    program: Program;
    status: BatchStatus;
    currentSemester?: {
      id: string;
      name: string;
    } | null;
  } | null;
  isVerified?: boolean;
}

export interface Batch {
  id: string;
  name: string;
  program: Program;
  status: BatchStatus;
  currentSemesterId?: string | null;
  currentSemester?: Semester | null;
  semesters?: Semester[];
  students?: StudentSummary[];
  cr?: StudentSummary | null;
  totalStudents?: number;
  totalSemesters?: number;
}

export interface PromotionRequest {
  id: string;
  batchId: string;
  semesterId: string;
  requestedById: string;
  status: PromotionStatus;
  reason?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  batch?: {
    id: string;
    name: string;
    program: Program;
    status: BatchStatus;
  };
  semester?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    universityId?: string | null;
  };
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface CreateBatchPayload {
  name: string;
  program: Program;
}

export interface CourseInput {
  name: string;
  code: string;
  creditHours: number;
  teacherId: string;
}

export interface CreateSemesterPayload {
  name: string;
  batchId: string;
  startDate: string;
  endDate: string;
  courses: CourseInput[];
  isCurrent?: boolean;
}

export interface PromoteBatchPayload {
  promotionRequestId?: string;
  nextSemesterName?: string;
  nextSemesterStartDate?: string;
  nextSemesterEndDate?: string;
  isGraduation?: boolean;
}

export interface OverrideSemesterPayload {
  batchId?: string;
  studentStatus?: StudentStatus;
  role?: Role;
  reason?: string;
}

export interface PreloadedStudent {
  id?: string;
  universityId: string;
  name: string;
  email: string;
  program: Program;
  batchId?: string;
  batch?: { id: string; name: string };
  isRegistered?: boolean;
}

export interface PreloadedTeacher {
  id?: string;
  uniqueId: string;
  name: string;
  email: string;
  designation?: string | null;
  department?: string;
  isChairman?: boolean;
  isRegistered?: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  userId?: string | null;
  user?: { name: string; email: string } | null;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}
