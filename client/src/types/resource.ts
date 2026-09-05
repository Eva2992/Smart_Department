export type ResourceType = "NOTES" | "SLIDES" | "PAST_PAPER" | "OTHER";

export interface ResourceUploader {
  id: string;
  name: string;
  role: string;
}

export interface Resource {
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
  createdAt: string;
  uploader?: ResourceUploader;
}

export interface ResourceQuery {
  year?: number;
  semesterLabel?: string;
  courseName?: string;
  type?: ResourceType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResourcesResponse {
  resources: Resource[];
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
