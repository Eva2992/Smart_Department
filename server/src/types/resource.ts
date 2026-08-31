import { ResourceType } from "@prisma/client";

export interface ResourceItem {
  id: string;
  title: string;
  courseName: string;
  semesterLabel: string;
  year: number;
  type: ResourceType;
  fileUrl: string;
  fileSizeBytes: number;
  uploaderId: string;
  downloadCount: number;
  createdAt: Date;
  uploader?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface UploadResourceInput {
  title: string;
  courseName: string;
  semesterLabel: string;
  year: number;
  type: ResourceType;
}

export interface ResourceQueryFilter {
  year?: number;
  semesterLabel?: string;
  courseName?: string;
  type?: ResourceType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResourcesResponse {
  resources: ResourceItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ResourceHierarchyItem {
  year: number;
  semesters: {
    semesterLabel: string;
    courses: {
      courseName: string;
      types: ResourceType[];
      count: number;
    }[];
  }[];
}
