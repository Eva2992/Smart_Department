import { apiClient } from "./client.js";

export const api = apiClient;

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

export interface Room {
  id: string;
  roomNumber: string;
  type: string;
  description?: string;
}

export async function getRooms(): Promise<Room[]> {
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

export interface GetHolidaysParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  batchId?: string;
}

export async function getHolidays(params?: GetHolidaysParams): Promise<Holiday[]> {
  const res = await api.get("/holidays", { params });
  return res.data.data;
}

export async function getUpcomingHolidays(limit = 5, batchId?: string): Promise<Holiday[]> {
  const res = await api.get("/holidays/upcoming", { params: { limit, batchId } });
  return res.data.data;
}

export async function checkIsHoliday(
  date: string,
  batchId?: string
): Promise<{ isHoliday: boolean }> {
  const res = await api.get("/holidays/check", { params: { date, batchId } });
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

export async function updateHoliday(
  id: string,
  data: {
    date?: string;
    reason?: string;
    scope?: "ALL" | "BATCH";
    batchId?: string;
  }
): Promise<{ holiday: Holiday; affectedClassesCount: number; message: string }> {
  const res = await api.patch(`/holidays/${id}`, data);
  return res.data.data;
}

export async function deleteHoliday(
  id: string
): Promise<{ success: boolean; restoredClassesCount: number; message?: string }> {
  const res = await api.delete(`/holidays/${id}`);
  return res.data.data;
}

export async function getClassCounts(params?: { batchId?: string; teacherId?: string }) {
  const token = localStorage.getItem("accessToken");
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.get("/schedules/class-count", { params, headers });
  return res.data.data;
}

export async function createScheduleEntry(data: {
  courseId: string;
  teacherId: string;
  roomId: string;
  batchId?: string;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string;
  type?: string;
}): Promise<ScheduleEntry> {
  const res = await api.post("/schedules", data);
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

// ==========================================
// Section 3.1.5: Class Update & Reschedule
// ==========================================

export interface ClassChangeRequest {
  id: string;
  scheduleEntryId: string;
  type: "CANCEL" | "RESCHEDULE";
  status: "PENDING" | "APPROVED" | "DENIED";
  reason: string;
  preferredDate?: string | null;
  preferredStartTime?: string | null;
  preferredEndTime?: string | null;
  preferredRoomId?: string | null;
  denialReason?: string | null;
  requestedById: string;
  teacherId: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  scheduleEntry?: ScheduleEntry;
  requestedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
    universityId?: string;
  };
  teacher?: {
    id: string;
    name: string;
    email: string;
    teacherUniqueId?: string;
  };
}

export interface SuggestedSlot {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  reason?: string;
  availableRooms: Array<{
    id: string;
    roomNumber: string;
    type: string;
    description?: string | null;
  }>;
}

export interface SuggestedSlotsResult {
  date: string;
  isHoliday: boolean;
  holidayReason?: string;
  slots: SuggestedSlot[];
}

export interface CreateChangeRequestInput {
  type: "CANCEL" | "RESCHEDULE";
  reason: string;
  preferredDate?: string;
  preferredStartTime?: string;
  preferredEndTime?: string;
  preferredRoomId?: string;
}

export interface ReviewChangeRequestInput {
  action: "APPROVE" | "DENY";
  denialReason?: string;
  modifiedDate?: string;
  modifiedStartTime?: string;
  modifiedEndTime?: string;
  modifiedRoomId?: string;
}

/**
 * Change class time on same day with 3-way conflict detection (FR-16).
 */
export async function updateClassTime(
  id: string,
  data: { startTime: string; endTime: string; reason?: string }
): Promise<ScheduleEntry> {
  const res = await api.patch(`/schedules/${id}/time`, data);
  return res.data.data;
}

/**
 * Fetch conflict-free suggested slots and available rooms for reassignment to another day (FR-19).
 */
export async function getSuggestedSlots(id: string, date: string): Promise<SuggestedSlotsResult> {
  const res = await api.get(`/schedules/${id}/suggested-slots`, { params: { date } });
  return res.data.data;
}

/**
 * Submit student/CR-initiated change request (FR-17, FR-18).
 */
export async function submitChangeRequest(
  id: string,
  data: CreateChangeRequestInput
): Promise<ClassChangeRequest> {
  const res = await api.post(`/schedules/${id}/requests`, data);
  return res.data.data;
}

/**
 * Fetch class change requests (FR-17, FR-18).
 */
export async function getChangeRequests(params?: {
  scheduleEntryId?: string;
  status?: "PENDING" | "APPROVED" | "DENIED";
  type?: "CANCEL" | "RESCHEDULE";
  teacherId?: string;
  requestedById?: string;
  batchId?: string;
}): Promise<ClassChangeRequest[]> {
  const res = await api.get("/schedules/change-requests", { params });
  return res.data.data;
}

/**
 * Review (Approve or Deny) a class change request (FR-17, FR-18).
 */
export async function reviewChangeRequest(
  requestId: string,
  data: ReviewChangeRequestInput
): Promise<ClassChangeRequest> {
  const res = await api.patch(`/schedules/change-requests/${requestId}`, data);
  return res.data.data;
}
