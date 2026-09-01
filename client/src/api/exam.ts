/**
 * Exam Routine API client
 * FR-22: Semester Final Exam Routine Management
 */

import { apiClient } from "./client.js";
import type { ApiResponse } from "../types/auth.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExamEntryItem {
  id: string;
  type: "EXAM";
  status: string;
  courseId: string | null;
  courseName: string | null;
  batchId: string;
  batchName: string | null;
  teacherId: string;
  teacherName: string | null;
  roomId: string;
  roomNumber: string | null;
  date: string;
  startTime: string;
  endTime: string;
  topic: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExamEntryInput {
  batchId: string;
  courseId?: string;
  courseName: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
  topic?: string;
}

export interface BulkCreateExamPayload {
  semesterId?: string;
  entries: CreateExamEntryInput[];
}

export interface UpdateExamEntryPayload {
  courseId?: string;
  courseName?: string;
  roomId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  teacherId?: string;
  topic?: string | null;
}

export interface PaginatedExamResponse {
  exams: ExamEntryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ExamQueryParams {
  batchId?: string;
  semesterId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ── API ────────────────────────────────────────────────────────────────────────

export const examApi = {
  /** Admin: bulk-create exam routine entries */
  create: async (payload: BulkCreateExamPayload) => {
    const res = await apiClient.post<ApiResponse<ExamEntryItem[]>>(
      "/exams/routine",
      payload
    );
    return res.data;
  },

  /** All authenticated users: list exam schedule */
  list: async (params?: ExamQueryParams) => {
    const res = await apiClient.get<ApiResponse<PaginatedExamResponse>>(
      "/exams/routine",
      { params }
    );
    return res.data;
  },

  /** All authenticated users: single exam entry */
  getById: async (id: string) => {
    const res = await apiClient.get<ApiResponse<ExamEntryItem>>(
      `/exams/routine/${id}`
    );
    return res.data;
  },

  /** Admin: update exam entry */
  update: async (id: string, payload: UpdateExamEntryPayload) => {
    const res = await apiClient.patch<ApiResponse<ExamEntryItem>>(
      `/exams/routine/${id}`,
      payload
    );
    return res.data;
  },

  /** Admin: cancel (soft-delete) exam entry */
  cancel: async (id: string) => {
    const res = await apiClient.delete<ApiResponse<ExamEntryItem>>(
      `/exams/routine/${id}`
    );
    return res.data;
  },
};
