import { apiClient } from "./client.js";
import type { ApiResponse } from "../types/auth.js";
import type {
  CTEntry,
  ScheduleCTPayload,
  UpdateCTPayload,
  Assignment,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
} from "../types/assessments.js";

// ── CT API ────────────────────────────────────────────────────────────────────

export const ctApi = {
  schedule: async (payload: ScheduleCTPayload) => {
    const response = await apiClient.post<ApiResponse<CTEntry>>("/assessments/ct", payload);
    return response.data;
  },

  update: async (ctId: string, payload: UpdateCTPayload) => {
    const response = await apiClient.patch<ApiResponse<CTEntry>>(
      `/assessments/ct/${ctId}`,
      payload
    );
    return response.data;
  },

  cancel: async (ctId: string, teacherId: string) => {
    const response = await apiClient.delete<ApiResponse<CTEntry>>(`/assessments/ct/${ctId}`, {
      data: { teacherId },
    });
    return response.data;
  },

  getStudentMarks: async (studentId: string) => {
    const response = await apiClient.get<
      ApiResponse<{
        student: {
          id: string;
          name: string;
          universityId: string | null;
          batchId: string | null;
          batchName: string | null;
          semesterId: string | null;
          semesterName: string | null;
        };
        groups: Array<{
          courseId: string | null;
          courseCode: string | null;
          courseName: string | null;
          marks: Array<{
            scheduleEntryId: string;
            ctTitle: string;
            topic: string | null;
            date: string;
            startTime: string;
            endTime: string;
            roomNumber: string;
            teacherName: string;
            marksObtained: number | null;
            maxMarks: number | null;
            status: "PENDING" | "RECORDED";
          }>;
        }>;
      }>
    >(`/assessments/ct/student/${studentId}`);
    return response.data;
  },
};

// ── Assignment API ────────────────────────────────────────────────────────────

export const assignmentApi = {
  create: async (payload: CreateAssignmentPayload) => {
    const response = await apiClient.post<ApiResponse<Assignment>>(
      "/assessments/assignments",
      payload
    );
    return response.data;
  },

  list: async (batchId?: string, courseId?: string) => {
    const response = await apiClient.get<ApiResponse<Assignment[]>>("/assessments/assignments", {
      params: { batchId, courseId },
    });
    return response.data;
  },

  update: async (assignmentId: string, payload: UpdateAssignmentPayload) => {
    const response = await apiClient.patch<ApiResponse<Assignment>>(
      `/assessments/assignments/${assignmentId}`,
      payload
    );
    return response.data;
  },

  delete: async (assignmentId: string, teacherId: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/assessments/assignments/${assignmentId}`,
      { data: { teacherId } }
    );
    return response.data;
  },
};
