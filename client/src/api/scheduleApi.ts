import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Set user context headers for role simulation & auth
export function setAuthHeaders(headers: {
  userId?: string;
  role?: string;
  teacherId?: string;
  batchId?: string;
  name?: string;
}) {
  if (headers.userId) api.defaults.headers.common["x-user-id"] = headers.userId;
  if (headers.role) api.defaults.headers.common["x-user-role"] = headers.role;
  if (headers.teacherId) api.defaults.headers.common["x-user-teacher-id"] = headers.teacherId;
  if (headers.batchId) api.defaults.headers.common["x-user-batch-id"] = headers.batchId;
  if (headers.name) api.defaults.headers.common["x-user-name"] = headers.name;
}

export interface ScheduleEntry {
  id: string;
  type: string;
  status: "SCHEDULED" | "CANCELLED" | "RESCHEDULED" | "HOLIDAY";
  courseId?: string;
  batchId: string;
  teacherId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string;
  course?: {
    id: string;
    name: string;
    code: string;
    creditHours?: number;
  };
  teacher?: {
    id: string;
    name: string;
    email: string;
    teacherUniqueId?: string;
  };
  room?: {
    id: string;
    roomNumber: string;
    type: string;
    description?: string;
  };
  batch?: {
    id: string;
    name: string;
  };
}

export interface ConflictDetail {
  type: "ROOM" | "TEACHER" | "BATCH";
  message: string;
  conflictingEntry: {
    id: string;
    courseName?: string;
    courseCode?: string;
    teacherName?: string;
    roomNumber?: string;
    batchName?: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
  };
}

export interface ConflictCheckResponse {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  summaryMessage?: string;
}

export interface RoomAvailabilitySlot {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  booking?: {
    id: string;
    courseName?: string;
    courseCode?: string;
    teacherName?: string;
    batchName?: string;
    type?: string;
  } | null;
}

export interface RoomAvailabilityMatrixItem {
  room: {
    id: string;
    roomNumber: string;
    type: string;
    description?: string;
  };
  date: string;
  slots: RoomAvailabilitySlot[];
}

export interface Holiday {
  id: string;
  date: string;
  reason: string;
  scope: "ALL" | "BATCH";
  batchId?: string | null;
  batch?: { id: string; name: string } | null;
}

// API functions
export async function getSchedules(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  batchId?: string;
  teacherId?: string;
  roomId?: string;
  status?: string;
}): Promise<ScheduleEntry[]> {
  const res = await api.get("/schedules", { params });
  return res.data.data;
}

export async function getMySchedule(): Promise<ScheduleEntry[]> {
  const res = await api.get("/schedules/me");
  return res.data.data;
}

export async function checkConflict(params: {
  date: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  teacherId?: string;
  batchId?: string;
  excludeScheduleEntryId?: string;
}): Promise<ConflictCheckResponse> {
  const res = await api.post("/schedules/check-conflict", params);
  return res.data.data;
}

export async function rescheduleClass(
  id: string,
  data: {
    date: string;
    startTime: string;
    endTime: string;
    roomId?: string;
    reason?: string;
  }
): Promise<ScheduleEntry> {
  const res = await api.patch(`/schedules/${id}/reschedule`, data);
  return res.data.data;
}

export async function cancelClass(id: string, data?: { reason?: string }): Promise<ScheduleEntry> {
  const res = await api.patch(`/schedules/${id}/cancel`, data);
  return res.data.data;
}

export async function getRooms(): Promise<
  Array<{ id: string; roomNumber: string; type: string; description?: string }>
> {
  const res = await api.get("/rooms");
  return res.data.data;
}

export async function getRoomAvailability(
  date: string,
  roomId?: string
): Promise<RoomAvailabilityMatrixItem[]> {
  const res = await api.get("/rooms/availability", { params: { date, roomId } });
  return res.data.data;
}

export async function getHolidays(): Promise<Holiday[]> {
  const res = await api.get("/holidays");
  return res.data.data;
}

export async function declareHoliday(data: {
  date: string;
  reason: string;
  scope?: "ALL" | "BATCH";
  batchId?: string;
}): Promise<{ holiday: Holiday; affectedClassesCount: number; message: string }> {
  const res = await api.post("/holidays", data);
  return res.data.data;
}

export async function deleteHoliday(
  id: string
): Promise<{ success: boolean; restoredClassesCount: number; message?: string }> {
  const res = await api.delete(`/holidays/${id}`);
  return res.data.data;
}

// New types for Slice 3
export interface RoomScheduleSlot {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  booking: {
    id: string;
    courseName?: string;
    courseCode?: string;
    teacherName?: string;
    batchName?: string;
    title?: string;
    type: string;
  } | null;
}

export interface RoomScheduleGrid {
  rooms: Array<{ id: string; roomNumber: string; type: string; description?: string }>;
  dates: string[];
  grid: Record<string, Record<string, RoomScheduleSlot[]>>;
}

export interface CreateSeminarInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  teacherId: string;
  batchId: string;
  courseId?: string;
}

// New API functions for Slice 3 & 4
export async function getRoomScheduleGrid(
  startDate: string,
  endDate: string
): Promise<RoomScheduleGrid> {
  const res = await api.get("/rooms/schedule", { params: { startDate, endDate } });
  return res.data.data;
}

export async function createSeminar(data: CreateSeminarInput): Promise<ScheduleEntry> {
  const res = await api.post("/schedules/seminar", data);
  return res.data.data;
}
