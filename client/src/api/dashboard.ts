import { apiClient } from "./client.js";
import type { ApiResponse } from "../types/auth.js";

export interface StudentDashboardData {
  batch: { id: string; name: string; program: string };
  semester: { id: string; name: string } | null;
  todaySchedule: ScheduleEntryItem[];
  weekSchedule: ScheduleEntryItem[];
  upcomingCTs: ScheduleEntryItem[];
  upcomingAssignments: AssignmentItem[];
  ctMarksGrouped: CTMarksGroup[];
  classCount: ClassCountItem[];
  courses: CourseItem[];
}

export interface TeacherDashboardData {
  teacher: { id: string; name: string; teacherUniqueId: string | null };
  todaySchedule: ScheduleEntryItem[];
  upcomingClasses: ScheduleEntryItem[];
  assignedBatches: AssignedBatch[];
  classCountByBatch: BatchClassCount[];
}

export interface AdminDashboardData {
  systemOverview: SystemOverview;
  pendingPromotions: PendingPromotion[];
  upcomingHolidays: HolidayItem[];
  todayRoomUsage: RoomUsageItem[];
  auditLogs: AuditLogItem[];
}

export interface ScheduleEntryItem {
  id: string;
  type: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string | null;
  course?: { id: string; code: string; name: string } | null;
  teacher?: { id: string; name: string } | null;
  batch?: { id: string; name: string } | null;
  room?: { id: string; roomNumber: string } | null;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "UPCOMING" | "DUE_SOON" | "PAST_DUE";
  course: { id: string; code: string; name: string };
  teacher: { id: string; name: string };
}

export interface CTMarksGroup {
  courseId: string;
  courseCode: string | null;
  courseName: string | null;
  marks: Array<{
    id: string;
    marksObtained: number;
    maxMarks: number;
    date: string;
    topic: string | null;
  }>;
}

export interface ClassCountItem {
  courseCode: string;
  courseName: string;
  teacherName: string;
  count: number;
}

export interface CourseItem {
  id: string;
  code: string;
  name: string;
  teacher: { id: string; name: string };
}

export interface AssignedBatch {
  id: string;
  name: string;
  program: string;
  courses: Array<{ id: string; code: string; name: string; semesterName: string }>;
}

export interface BatchClassCount {
  batchId: string;
  batchName: string;
  count: number;
}

export interface SystemOverview {
  totalStudents: number;
  totalTeachers: number;
  activeBatches: number;
  activeSemesters: number;
  upcomingEvents: number;
  unverifiedUsers: number;
}

export interface PendingPromotion {
  id: string;
  batch: { id: string; name: string; program: string };
  semester: { id: string; name: string };
  requestedBy: { id: string; name: string; role: string };
  createdAt: string;
}

export interface HolidayItem {
  id: string;
  date: string;
  reason: string;
  scope: string;
  batch?: { id: string; name: string } | null;
}

export interface RoomUsageItem {
  roomId: string;
  room: { roomNumber: string; type: string };
  startTime: string;
  endTime: string;
  type: string;
  course?: { code: string; name: string } | null;
  batch?: { name: string } | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

export async function fetchStudentDashboard(): Promise<StudentDashboardData> {
  const res = await apiClient.get<ApiResponse<StudentDashboardData>>("/dashboard/student");
  return res.data.data!;
}

export async function fetchTeacherDashboard(): Promise<TeacherDashboardData> {
  const res = await apiClient.get<ApiResponse<TeacherDashboardData>>("/dashboard/teacher");
  return res.data.data!;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const res = await apiClient.get<ApiResponse<AdminDashboardData>>("/dashboard/admin");
  return res.data.data!;
}
