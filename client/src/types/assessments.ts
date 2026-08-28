export interface CTEntry {
  id: string;
  topic: string | null;
  date: string;
  startTime: string;
  endTime: string;
  room: { roomNumber: string };
  course: { code: string; name: string } | null;
  batch: { name: string };
  teacher: { name: string };
}

export interface ScheduleCTPayload {
  teacherId: string;
  batchId: string;
  courseId: string;
  roomNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  topic?: string;
  confirmSameDayConflict?: boolean;
}

export interface UpdateCTPayload {
  teacherId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  roomNumber?: string;
  topic?: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  course: { code: string; name: string };
  batch: { name: string };
}

export interface CreateAssignmentPayload {
  teacherId: string;
  batchId: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
}

export interface UpdateAssignmentPayload {
  teacherId: string;
  title?: string;
  description?: string;
  dueDate?: string;
}
