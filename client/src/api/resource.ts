import { apiClient } from "./client.js";
import type { ApiResponse } from "../types/auth.js";
import type {
  Resource,
  ResourceQuery,
  PaginatedResourcesResponse,
  ResourceHierarchyItem,
} from "../types/resource.js";

export async function fetchResourcesApi(
  query: ResourceQuery = {}
): Promise<PaginatedResourcesResponse> {
  const response = await apiClient.get<ApiResponse<PaginatedResourcesResponse>>("/resources", {
    params: query,
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch study resources");
  }
  return response.data.data;
}

export async function fetchHierarchyApi(): Promise<ResourceHierarchyItem[]> {
  const response =
    await apiClient.get<ApiResponse<ResourceHierarchyItem[]>>("/resources/hierarchy");
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch resource hierarchy");
  }
  return response.data.data;
}

export async function fetchResourceByIdApi(id: string): Promise<Resource> {
  const response = await apiClient.get<ApiResponse<Resource>>(`/resources/${id}`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch resource details");
  }
  return response.data.data;
}

export async function uploadResourceApi(
  formData: FormData,
  onUploadProgress?: (progress: number) => void
): Promise<Resource> {
  const response = await apiClient.post<ApiResponse<Resource>>("/resources", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percent);
      }
    },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to upload study resource");
  }
  return response.data.data;
}

export async function downloadResourceApi(id: string): Promise<Resource> {
  const response = await apiClient.get<ApiResponse<Resource>>(
    `/resources/${id}/download?json=true`
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to register download");
  }
  return response.data.data;
}

export async function deleteResourceApi(id: string): Promise<void> {
  const response = await apiClient.delete<ApiResponse<null>>(`/resources/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete study resource");
  }
}
