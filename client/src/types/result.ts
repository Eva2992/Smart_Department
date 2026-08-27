export interface CourseMark {
  courseCode: string;
  courseTitle: string;
  creditHours: number;
  marks?: number;
  letterGrade: string;
  gradePoint: number;
}

export interface StudentResult {
  id: string;
  batchId: string;
  semesterId: string;
  studentId: string;
  universityId: string;
  courseMarks: CourseMark[];
  gpa: number;
  cgpa?: number;
  publishedAt: string;
  student?: {
    id: string;
    name: string;
    email: string;
    universityId?: string;
  };
  batch?: {
    id: string;
    name: string;
    program: string;
  };
  semester?: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
  };
  uploadedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface ResultQueryResponse {
  results: StudentResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadResultRow {
  universityId: string;
  studentName?: string;
  courseMarks: CourseMark[];
  gpa: number;
  cgpa?: number;
}

export interface UploadResultPayload {
  batchId: string;
  semesterId: string;
  results: UploadResultRow[];
  rawContent?: string;
  fileName?: string;
  fileSizeBytes?: number;
}

export interface BatchSummary {
  batchId: string;
  semesterId: string;
  totalStudents: number;
  averageGpa: number;
  highestGpa: number;
  passRate: number;
  results: StudentResult[];
}
