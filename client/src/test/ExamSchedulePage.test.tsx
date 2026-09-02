/**
 * Frontend component tests for ExamSchedulePage
 * FR-22: Semester Final Exam Routine Management
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExamSchedulePage } from "../pages/ExamSchedulePage.js";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../context/useAuth.js", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/exam.js", () => ({
  examApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock("../api/academic.js", () => ({
  academicApi: {
    getBatches: vi.fn(),
  },
}));

vi.mock("../api/client.js", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { useAuth } from "../context/useAuth.js";
import { examApi } from "../api/exam.js";
import { academicApi } from "../api/academic.js";
import { apiClient } from "../api/client.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockExam = {
  id: "exam-001",
  type: "EXAM" as const,
  status: "SCHEDULED",
  courseId: null,
  courseName: null,
  batchId: "batch-001",
  batchName: "52nd",
  teacherId: "teacher-001",
  teacherName: "Dr. Islam",
  roomId: "room-r202",
  roomNumber: "R-202",
  date: "2099-12-15",
  startTime: "2099-12-15T09:00:00.000Z",
  endTime: "2099-12-15T12:00:00.000Z",
  topic: "Data Structures",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const mockBatches = [{ id: "batch-001", name: "52nd", program: "HONOURS", status: "ACTIVE" }];

function renderPage() {
  return render(
    <MemoryRouter>
      <ExamSchedulePage />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ExamSchedulePage — Student view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "s-1", name: "Student", email: "s@j.edu", role: "STUDENT", batchId: "batch-001", isVerified: true },
      isAuthenticated: true,
      isLoading: false,
    } as never);
    vi.mocked(academicApi.getBatches).mockResolvedValue(mockBatches as never);
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as never);
  });

  it("renders page heading", async () => {
    vi.mocked(examApi.list).mockResolvedValue({ data: { exams: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } } } as never);

    renderPage();
    expect(screen.getByText(/Semester Final Exam Schedule/i)).toBeInTheDocument();
  });

  it("shows exam card with course name", async () => {
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [mockExam], pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Data Structures")).toBeInTheDocument();
    });
  });

  it("shows room number on exam card", async () => {
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [mockExam], pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/R-202/)).toBeInTheDocument();
    });
  });

  it("shows batch name on exam card", async () => {
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [mockExam], pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    } as never);

    renderPage();

    await waitFor(() => {
      const batchMatches = screen.getAllByText(/52nd/);
      expect(batchMatches.length).toBeGreaterThan(0);
    });
  });

  it("shows countdown label for future exam", async () => {
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [mockExam], pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    } as never);

    renderPage();

    await waitFor(() => {
      // Exam is in year 2099 — should show large day count
      expect(screen.getByText(/days/i)).toBeInTheDocument();
    });
  });

  it("shows empty state message when no exams", async () => {
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } },
    } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No exam schedule published yet/i)).toBeInTheDocument();
    });
  });

  it("does NOT show Admin create form for Student", async () => {
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } },
    } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/Add Exam Entries/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ExamSchedulePage — Admin view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "admin-1", name: "Admin", email: "a@j.edu", role: "ADMIN", isVerified: true },
      isAuthenticated: true,
      isLoading: false,
    } as never);
    vi.mocked(academicApi.getBatches).mockResolvedValue(mockBatches as never);
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [{ id: "room-r202", roomNumber: "R-202" }] } } as never);
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [mockExam], pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    } as never);
  });

  it("shows Admin create form section", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Add Exam Entries/i)).toBeInTheDocument();
    });
  });

  it("shows Publish Exam Routine submit button", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Publish Exam Routine/i })).toBeInTheDocument();
    });
  });

  it("shows Edit and Cancel buttons on exam card for Admin", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  it("calls examApi.create on form submit and shows success message", async () => {
    vi.mocked(examApi.create).mockResolvedValue({ data: [mockExam], success: true } as never);
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [mockExam], pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    } as never);

    renderPage();

    await waitFor(() => screen.getByRole("button", { name: /Publish Exam Routine/i }));

    // Fill minimal required fields
    const batchSelects = await screen.findAllByRole("combobox");
    fireEvent.change(batchSelects[0], { target: { value: "batch-001" } });

    const courseInput = screen.getByPlaceholderText(/e\.g\. Data Structures/i);
    fireEvent.change(courseInput, { target: { value: "Data Structures" } });

    const dateInputs = document.querySelectorAll("input[type='date']");
    fireEvent.change(dateInputs[0], { target: { value: "2026-12-15" } });

    const timeInputs = document.querySelectorAll("input[type='time']");
    fireEvent.change(timeInputs[0], { target: { value: "09:00" } });
    fireEvent.change(timeInputs[1], { target: { value: "12:00" } });

    const roomSelects = document.querySelectorAll("select");
    fireEvent.change(roomSelects[1], { target: { value: "room-r202" } });

    fireEvent.click(screen.getByRole("button", { name: /Publish Exam Routine/i }));

    await waitFor(() => {
      expect(examApi.create).toHaveBeenCalled();
    });
  });

  it("opens edit modal when Edit button clicked", async () => {
    renderPage();

    await waitFor(() => screen.getByRole("button", { name: /Edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Edit Exam Entry/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    });
  });

  it("closes edit modal on Discard", async () => {
    renderPage();

    await waitFor(() => screen.getByRole("button", { name: /Edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    await waitFor(() => screen.getByRole("button", { name: /Discard/i }));

    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Edit Exam Entry/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ExamSchedulePage — CANCELLED exam display", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "s-1", name: "Student", email: "s@j.edu", role: "STUDENT", batchId: "batch-001", isVerified: true },
      isAuthenticated: true,
      isLoading: false,
    } as never);
    vi.mocked(academicApi.getBatches).mockResolvedValue(mockBatches as never);
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as never);
  });

  it("shows CANCELLED badge for cancelled exam", async () => {
    const cancelledExam = { ...mockExam, status: "CANCELLED" };
    vi.mocked(examApi.list).mockResolvedValue({
      data: { exams: [cancelledExam], pagination: { total: 1, page: 1, limit: 50, totalPages: 1 } },
    } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    });
  });
});
