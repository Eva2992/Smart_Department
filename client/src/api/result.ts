import { apiClient } from "./client.js";
import type { ApiResponse } from "../types/auth.js";
import type {
  StudentResult,
  ResultQueryResponse,
  UploadResultPayload,
  BatchSummary,
} from "../types/result.js";

export async function uploadResultsApi(payload: UploadResultPayload) {
  const res = await apiClient.post<
    ApiResponse<{
      publishedCount: number;
      resourceArchived: boolean;
      batchName: string;
      semesterName: string;
    }>
  >("/results/upload", payload);
  return res.data;
}

export async function queryResultsApi(params?: {
  batchId?: string;
  semesterId?: string;
  program?: string;
  universityId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const res = await apiClient.get<ApiResponse<ResultQueryResponse>>("/results/query", {
    params,
  });
  return res.data;
}

export async function getStudentResultsApi(id: string) {
  const res = await apiClient.get<ApiResponse<StudentResult[]>>(`/results/student/${id}`);
  return res.data;
}

export async function getMyResultsApi() {
  const res = await apiClient.get<ApiResponse<StudentResult[]>>("/results/me");
  return res.data;
}

export async function getBatchSemesterSummaryApi(batchId: string, semesterId: string) {
  const res = await apiClient.get<ApiResponse<BatchSummary>>(
    `/results/batch/${batchId}/semester/${semesterId}`
  );
  return res.data;
}
