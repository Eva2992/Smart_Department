import { ResourceType } from "@prisma/client";

/**
 * Client-facing DTO representing a single study resource or archived result document.
 *
 * Resources serve the dual-hybrid storage model (ADR-0004): study materials
 * (lecture slides, notes, question banks) and archived semester result grade sheets
 * are stored in the same {@link Resource} repository for unified browsing and download.
 *
 * @see {@link resourceService.uploadResource} for creation logic.
 * @see {@link resourceService.getHierarchy} for the Year → Semester → Course navigation tree.
 */
export interface ResourceItem {
  /** Unique resource UUID. */
  id: string;

  /** Human-readable title (e.g. `"CSE 404 Lecture Slides Week 3"`). */
  title: string;

  /** Course name this resource is associated with (e.g. `"Software Engineering"`). */
  courseName: string;

  /** Semester label for categorization (e.g. `"4th Year 1st Semester"`). */
  semesterLabel: string;

  /** Academic year for hierarchical navigation. */
  year: number;

  /** Resource type discriminator (e.g. `SLIDE`, `NOTE`, `QUESTION_BANK`, `OTHER`). */
  type: ResourceType;

  /** Relative URL path to the stored file (e.g. `"/uploads/resources/file.pdf"`). */
  fileUrl: string;

  /** File size in bytes, used for display and validation. */
  fileSizeBytes: number;

  /** UUID of the user who uploaded this resource. */
  uploaderId: string;

  /** Number of times this resource has been downloaded. */
  downloadCount: number;

  /** Timestamp when the resource was created. */
  createdAt: Date;

  /** Uploader profile summary (joined from User), included in list/detail responses. */
  uploader?: {
    /** Uploader's user UUID. */
    id: string;
    /** Uploader's display name. */
    name: string;
    /** Uploader's role (typically `"CR"` or `"ADMIN"`). */
    role: string;
  };
}

/**
 * Metadata payload for uploading a new study resource.
 *
 * Validated by {@link uploadResourceMetadataSchema} before reaching the service layer.
 * The actual file binary is handled separately via multer middleware.
 */
export interface UploadResourceInput {
  /** Resource title (2–200 characters). */
  title: string;

  /** Course name for categorization (2–100 characters). */
  courseName: string;

  /** Semester label for categorization (2–100 characters). */
  semesterLabel: string;

  /** Academic year (1990–2100). */
  year: number;

  /** Resource type discriminator. */
  type: ResourceType;
}

/**
 * Query filter parameters for listing and searching resources.
 *
 * Supports multi-facet filtering by year, semester, course, type,
 * and free-text search with pagination.
 */
export interface ResourceQueryFilter {
  /** Filter by academic year. */
  year?: number;

  /** Case-insensitive partial match on semester label. */
  semesterLabel?: string;

  /** Case-insensitive partial match on course name. */
  courseName?: string;

  /** Filter by resource type. */
  type?: ResourceType;

  /** Free-text search across title, course name, and semester label. */
  search?: string;

  /** Page number (1-indexed, defaults to 1). */
  page?: number;

  /** Results per page (defaults to 20, max 100). */
  limit?: number;
}

/**
 * Paginated response wrapper for resource listings.
 */
export interface PaginatedResourcesResponse {
  /** Array of resource DTOs for the current page. */
  resources: ResourceItem[];

  /** Pagination metadata. */
  pagination: {
    /** Total number of matching resources. */
    total: number;
    /** Current page number (1-indexed). */
    page: number;
    /** Number of resources per page. */
    limit: number;
    /** Total number of pages. */
    totalPages: number;
  };
}

/**
 * Hierarchical category navigation node for the resource browser.
 *
 * Represents a single academic year containing nested semester and course
 * groupings with resource type counts, powering the
 * Year → Semester → Course → Types drill-down navigation.
 */
export interface ResourceHierarchyItem {
  /** Academic year (e.g. `2026`). */
  year: number;

  /** Semesters within this year, each containing course groupings. */
  semesters: {
    /** Semester display label (e.g. `"4th Year 1st Semester"`). */
    semesterLabel: string;

    /** Courses with uploaded resources in this semester. */
    courses: {
      /** Course name. */
      courseName: string;
      /** Distinct resource types available for this course. */
      types: ResourceType[];
      /** Total resource count for this course in this semester. */
      count: number;
    }[];
  }[];
}
