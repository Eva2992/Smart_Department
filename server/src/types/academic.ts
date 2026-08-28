import type {
  Program,
  BatchStatus,
  SemesterStatus,
  StudentStatus,
  Role,
  PromotionStatus,
} from "@prisma/client";

export interface CreateBatchDto {
  name: string;
  program: Program;
}

export interface GetBatchesQuery {
  program?: Program;
  status?: BatchStatus;
  search?: string;
}

export interface CourseAssignmentInput {
  name: string;
  code: string;
  creditHours: number;
  teacherId: string;
}

export interface CreateSemesterDto {
  name: string;
  batchId: string;
  startDate: Date | string;
  endDate: Date | string;
  courses: CourseAssignmentInput[];
  isCurrent?: boolean;
}

export interface UpdateSemesterDto {
  name?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: SemesterStatus;
}

export interface RequestPromotionDto {
  batchId: string;
  semesterId: string;
  reason?: string;
}

export interface PromoteBatchDto {
  batchId: string;
  promotionRequestId?: string;
  nextSemesterName?: string;
  nextSemesterStartDate?: Date | string;
  nextSemesterEndDate?: Date | string;
  isGraduation?: boolean;
}

export interface RejectPromotionDto {
  reason: string;
}

export interface OverrideStudentSemesterDto {
  batchId?: string;
  studentStatus?: StudentStatus;
  role?: Role;
  reason?: string;
}

export interface AssignCRDto {
  studentId: string;
  reason?: string;
}

export interface SearchStudentsQuery {
  q?: string;
  batchId?: string;
  program?: Program;
  studentStatus?: StudentStatus;
  role?: Role;
  page?: number;
  limit?: number;
}
