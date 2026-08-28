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
  Program,
  BatchStatus,
  SemesterStatus,
  PromotionStatus,
  StudentStatus,
  Role,
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
};
