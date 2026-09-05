import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreloadedManagement } from "../components/academic/PreloadedManagement.js";
import { academicApi } from "../api/academic.js";

vi.mock("../api/academic.js", () => ({
  academicApi: {
    getPreloadedStudents: vi.fn(),
    getPreloadedTeachers: vi.fn(),
    importPreloadedStudents: vi.fn(),
    importPreloadedTeachers: vi.fn(),
  },
}));

describe("PreloadedManagement Component (AN-01, AN-02)", () => {
  const mockBatches = [
    {
      id: "batch-1",
      name: "51st Batch",
      program: "HONOURS" as const,
      status: "ACTIVE" as const,
      currentSemesterId: null,
      createdAt: "",
      updatedAt: "",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders preloaded students tab and displays students list", async () => {
    vi.mocked(academicApi.getPreloadedStudents).mockResolvedValue({
      students: [
        {
          universityId: "20201001",
          name: "Alice Johnson",
          email: "alice@juniv.edu",
          program: "HONOURS",
          batch: { id: "batch-1", name: "51st Batch" },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<PreloadedManagement batches={mockBatches} />);

    expect(screen.getByText("Preloaded Students")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("20201001")).toBeInTheDocument();
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });
  });

  it("switches to teachers tab and displays preloaded teachers", async () => {
    vi.mocked(academicApi.getPreloadedStudents).mockResolvedValue({
      students: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    vi.mocked(academicApi.getPreloadedTeachers).mockResolvedValue({
      teachers: [
        {
          uniqueId: "T-101",
          name: "Dr. Karim",
          email: "karim@juniv.edu",
          designation: "Professor",
          isChairman: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<PreloadedManagement batches={mockBatches} />);

    const teachersTab = screen.getByText("Preloaded Teachers");
    await userEvent.click(teachersTab);

    await waitFor(() => {
      expect(screen.getByText("T-101")).toBeInTheDocument();
      expect(screen.getByText("Dr. Karim")).toBeInTheDocument();
    });
  });
});
