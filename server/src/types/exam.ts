/**
 * Exam Routine Management — TypeScript domain types
 * FR-22: Semester Final Exam Routine Generation
 */

export interface CreateExamEntryInput {
  /** Batch to which this exam belongs */
  batchId: string;
  /** Optional course reference (nullable per SRS) */
  courseId?: string;
  /** Human-readable course name for display */
  courseName: string;
  /** Room assigned for this exam */
  roomId: string;
  /** Exam date (ISO 8601 date string, e.g. "2026-12-15") */
  date: string;
  /** Start time (ISO 8601 datetime or "HH:mm" string) */
  startTime: string;
  /** End time (ISO 8601 datetime or "HH:mm" string) */
  endTime: string;
  /** Optional teacher/proctor user ID */
  teacherId?: string;
  /** Optional notes or exam topic */
  topic?: string;
}

export interface BulkCreateExamInput {
  /** Semester the exams belong to (for validation context) */
  semesterId?: string;
  /** List of individual exam entries */
  entries: CreateExamEntryInput[];
}

export interface UpdateExamEntryInput {
  courseId?: string;
  courseName?: string;
  roomId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  teacherId?: string;
  topic?: string;
}

export interface ExamQueryFilter {
  batchId?: string;
  semesterId?: string;
  /** ISO date range start */
  startDate?: string;
  /** ISO date range end */
  endDate?: string;
  page?: number;
  limit?: number;
}

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

export interface PaginatedExamResponse {
  exams: ExamEntryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
