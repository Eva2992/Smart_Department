import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitAssignment,
  getAssignmentSubmissions,
} from "../../src/services/assignment.service.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    assignment: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    assignmentSubmission: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("Assignment Submission Support (FR-21, ADR-0005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAssignment = {
    id: "assign-1",
    batchId: "batch-51",
    dueDate: new Date(Date.now() + 86400000),
  };

  const mockStudent = {
    id: "student-1",
    batchId: "batch-51",
    role: "STUDENT",
  };

  it("submits an assignment with an external URL", async () => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);
    vi.mocked(prisma.assignmentSubmission.upsert).mockResolvedValue({
      id: "sub-1",
      submissionType: "URL",
      submissionUrl: "https://github.com/student/project",
    } as any);

    const result = await submitAssignment({
      assignmentId: "assign-1",
      studentId: "student-1",
      submissionUrl: "https://github.com/student/project",
    });

    expect(result.id).toBe("sub-1");
    expect(prisma.assignmentSubmission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          assignmentId_studentId: {
            assignmentId: "assign-1",
            studentId: "student-1",
          },
        },
      })
    );
  });

  it("submits an assignment with a direct document file attachment", async () => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);
    vi.mocked(prisma.assignmentSubmission.upsert).mockResolvedValue({
      id: "sub-2",
      submissionType: "FILE",
      fileUrl: "/uploads/assignments/report.pdf",
    } as any);

    const result = await submitAssignment({
      assignmentId: "assign-1",
      studentId: "student-1",
      fileUrl: "/uploads/assignments/report.pdf",
      fileName: "report.pdf",
      fileSizeBytes: 2048,
    });

    expect(result.id).toBe("sub-2");
    expect(prisma.assignmentSubmission.upsert).toHaveBeenCalledTimes(1);
  });

  it("rejects submission when neither URL nor file is provided", async () => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);

    await expect(
      submitAssignment({
        assignmentId: "assign-1",
        studentId: "student-1",
      })
    ).rejects.toThrow("Submission must contain an external URL or an attached file");
  });

  it("rejects submission if student belongs to a different batch", async () => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockStudent,
      batchId: "batch-52",
    } as any);

    await expect(
      submitAssignment({
        assignmentId: "assign-1",
        studentId: "student-1",
        submissionUrl: "https://github.com/student/project",
      })
    ).rejects.toThrow("You do not belong to the batch assigned to this task");
  });

  it("retrieves submissions list for teachers", async () => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
    vi.mocked(prisma.assignmentSubmission.findMany).mockResolvedValue([
      { id: "sub-1", studentId: "student-1" } as any,
    ]);

    const res = await getAssignmentSubmissions("assign-1", {
      id: "teacher-1",
      role: "TEACHER",
    });

    expect(res).toHaveLength(1);
    expect(prisma.assignmentSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assignmentId: "assign-1" } })
    );
  });
});
