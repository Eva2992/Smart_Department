import type { Role, Program } from "@prisma/client";

/**
 * Course mark entry within a student's semester final result.
 */
export interface CourseMarkItem {
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  marks?: number;
  letterGrade: string;
  gradePoint: number;
}

/**
 * Validated student result row parsed from grade sheets.
 */
export interface ParsedStudentResult {
  universityId: string;
  studentName?: string;
  courseMarks: CourseMarkItem[];
  gpa: number;
  cgpa?: number;
}

/**
 * Payload for uploading semester final results.
 */
export interface UploadResultPayload {
  batchId: string;
  semesterId: string;
  results: ParsedStudentResult[];
  rawContent?: string;
  fileName?: string;
  fileSizeBytes?: number;
}

/**
 * Parameters for querying results.
 */
export interface ResultQueryParams {
  batchId?: string;
  semesterId?: string;
  program?: Program;
  universityId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Authenticated uploader context.
 */
export interface UploaderContext {
  id: string;
  role: Role;
  batchId?: string | null;
}
