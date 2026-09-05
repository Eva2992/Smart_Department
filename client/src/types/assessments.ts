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

/**
 * Server model: CT is created by converting an existing CLASS schedule slot.
 * The teacher selects a slot (scheduleEntryId) and provides a topic.
 */
export interface ScheduleCTPayload {
  scheduleEntryId: string;
  teacherId: string;
  topic: string;
  confirmSameDayConflict?: boolean;
}

export interface UpdateCTPayload {
  teacherId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  roomNumber?: string;
  topic?: string | null;
  confirmSameDayConflict?: boolean; // needed to break same-day warning loop on edit
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

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submissionUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  notes?: string | null;
  submittedAt: string;
  student?: {
    id: string;
    name: string;
    email: string;
    universityId?: string | null;
  };
}
