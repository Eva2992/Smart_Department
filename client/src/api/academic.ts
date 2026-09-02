import { apiClient } from "./client.js";
import type { ApiResponse } from "../types/auth.js";
import type {
  Batch,
  Semester,
  PromotionRequest,
  StudentSummary,
  CreateBatchPayload,
  CreateSemesterPayload,
  PromoteBatchPayload,
  OverrideSemesterPayload,
  Course,
  Program,
  BatchStatus,
  SemesterStatus,
  PromotionStatus,
  StudentStatus,
  Role,
  PreloadedStudent,
  PreloadedTeacher,
  AuditLogEntry,
} from "../types/academic.js";

export const academicApi = {
  // Batches
  getBatches: async (params?: { program?: Program; status?: BatchStatus; search?: string }) => {
    const res = await apiClient.get<ApiResponse<Batch[]>>("/batches", { params });
    return res.data.data || [];
  },

  getBatchById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Batch>>(`/batches/${id}`);
    return res.data.data;
  },

  createBatch: async (data: CreateBatchPayload) => {
    const res = await apiClient.post<ApiResponse<Batch>>("/admin/batches", data);
    return res.data.data;
  },

  // Semesters
  getSemesters: async (params?: { batchId?: string; status?: SemesterStatus }) => {
    const res = await apiClient.get<ApiResponse<Semester[]>>("/semesters", { params });
    return res.data.data || [];
  },

  getSemesterById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Semester>>(`/semesters/${id}`);
    return res.data.data;
  },

  createSemester: async (data: CreateSemesterPayload) => {
    const res = await apiClient.post<ApiResponse<Semester>>("/admin/semesters", data);
    return res.data.data;
  },

  addCourseToSemester: async (
    semesterId: string,
    data: { name: string; code: string; creditHours: number; teacherId: string }
  ) => {
    const res = await apiClient.post<ApiResponse<Course>>(`/semesters/${semesterId}/courses`, data);
    return res.data.data;
  },

  deleteCourse: async (semesterId: string, courseId: string) => {
    const res = await apiClient.delete<ApiResponse<unknown>>(
      `/semesters/${semesterId}/courses/${courseId}`
    );
    return res.data.data;
  },

  // Promotions
  getPromotionRequests: async (params?: { status?: PromotionStatus; batchId?: string }) => {
    const res = await apiClient.get<ApiResponse<PromotionRequest[]>>("/admin/promotions", {
      params,
    });
    return res.data.data || [];
  },

  requestPromotion: async (data: { batchId: string; semesterId: string; reason?: string }) => {
    const res = await apiClient.post<ApiResponse<PromotionRequest>>("/promotions/request", data);
    return res.data.data;
  },

  promoteBatch: async (batchId: string, data: PromoteBatchPayload) => {
    const res = await apiClient.post<
      ApiResponse<{ success: boolean; message: string; crRolesReset: boolean }>
    >(`/admin/batches/${batchId}/promote`, data);
    return res.data;
  },

  rejectPromotion: async (requestId: string, reason: string) => {
    const res = await apiClient.patch<ApiResponse<PromotionRequest>>(
      `/admin/promotions/${requestId}/reject`,
      { reason }
    );
    return res.data.data;
  },

  // Students & Overrides
  searchStudents: async (params?: {
    q?: string;
    batchId?: string;
    program?: Program;
    studentStatus?: StudentStatus;
    role?: Role;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<
      ApiResponse<{
        students: StudentSummary[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >("/admin/students", { params });
    return res.data.data;
  },

  overrideSemester: async (studentId: string, data: OverrideSemesterPayload) => {
    const res = await apiClient.patch<ApiResponse<StudentSummary>>(
      `/admin/students/${studentId}/semester-override`,
      data
    );
    return res.data.data;
  },

  assignCR: async (batchId: string, studentId: string, reason?: string) => {
    const res = await apiClient.patch<ApiResponse<StudentSummary>>(`/admin/batches/${batchId}/cr`, {
      studentId,
      reason,
    });
    return res.data.data;
  },

  // Role Management (AN-10, C-05)
  updateUserRole: async (userId: string, role: "STUDENT" | "CR") => {
    const res = await apiClient.patch<ApiResponse<StudentSummary>>(`/admin/users/${userId}/role`, {
      role,
    });
    return res.data.data;
  },

  // Preloaded Rosters (AN-01, AN-02)
  importPreloadedStudents: async (students: Partial<PreloadedStudent>[]) => {
    const res = await apiClient.post<ApiResponse<{ createdCount: number }>>(
      "/admin/preloaded-students",
      { students }
    );
    return res.data.data;
  },

  getPreloadedStudents: async (params?: {
    batchId?: string;
    program?: Program;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<
      ApiResponse<{
        students: PreloadedStudent[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >("/admin/preloaded-students", { params });
    return res.data.data;
  },

  importPreloadedTeachers: async (teachers: Partial<PreloadedTeacher>[]) => {
    const res = await apiClient.post<ApiResponse<{ createdCount: number }>>(
      "/admin/preloaded-teachers",
      { teachers }
    );
    return res.data.data;
  },

  getPreloadedTeachers: async (params?: { search?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<
      ApiResponse<{
        teachers: PreloadedTeacher[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >("/admin/preloaded-teachers", { params });
    return res.data.data;
  },

  // Audit Logs (NFR-12, R-02, R-06)
  getAuditLogs: async (params?: {
    action?: string;
    userId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<
      ApiResponse<{
        logs: AuditLogEntry[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >("/admin/audit-logs", { params });
    return res.data.data;
  },

  getTeachers: async () => {
    const res = await apiClient.get<
      ApiResponse<Array<{ id: string; name: string; email: string }>>
    >("/semesters/teachers/list");
    return res.data.data ?? [];
  },
};
