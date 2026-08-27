import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultQueryView } from "./ResultQueryView.js";
import * as resultApi from "../api/result.js";
import type { ApiResponse } from "../types/auth.js";
import type { ResultQueryResponse } from "../types/result.js";

vi.mock("../api/result.js", () => ({
  queryResultsApi: vi.fn(),
}));

describe("ResultQueryView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockQueryResult: ApiResponse<ResultQueryResponse> = {
    success: true,
    data: {
      results: [
        {
          id: "res-1",
          batchId: "batch-52",
          semesterId: "sem-1",
          universityId: "2020101",
          studentId: "s1",
          gpa: 3.92,
          cgpa: 3.88,
          publishedAt: new Date().toISOString(),
          student: { id: "s1", name: "Rahim Ahmed", email: "rahim@juniv.edu" },
          batch: { id: "b1", name: "52nd", program: "HONOURS" },
          semester: { id: "sem-1", name: "4th Year 1st Semester" },
          courseMarks: [
            {
              courseCode: "CSE 401",
              courseTitle: "Distributed Systems",
              creditHours: 3.0,
              marks: 85,
              letterGrade: "A+",
              gradePoint: 4.0,
            },
          ],
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    },
  };

  it("fetches and renders published examination results with GPA badges", async () => {
    vi.mocked(resultApi.queryResultsApi).mockResolvedValue(mockQueryResult);

    render(<ResultQueryView />);

    await waitFor(() => {
      expect(screen.getByText("Rahim Ahmed")).toBeInTheDocument();
      expect(screen.getByText("Roll: 2020101")).toBeInTheDocument();
      expect(screen.getByText("3.92")).toBeInTheDocument();
    });
  });

  it("toggles and reveals detailed GradeSheetTable breakdown on click", async () => {
    vi.mocked(resultApi.queryResultsApi).mockResolvedValue(mockQueryResult);
    const user = userEvent.setup();

    render(<ResultQueryView />);

    await waitFor(() => {
      expect(screen.getByText("Rahim Ahmed")).toBeInTheDocument();
    });

    const viewBreakdownBtn = screen.getByRole("button", { name: /View Breakdown/i });
    await user.click(viewBreakdownBtn);

    await waitFor(() => {
      expect(screen.getByText("Distributed Systems")).toBeInTheDocument();
      expect(screen.getByText("CSE 401")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Hide Breakdown/i })).toBeInTheDocument();
    });
  });

  it("triggers search with updated filters when search is submitted", async () => {
    vi.mocked(resultApi.queryResultsApi).mockResolvedValue(mockQueryResult);
    const user = userEvent.setup();

    render(<ResultQueryView />);

    const searchInput = screen.getByLabelText(/Search Roll or Name/i);
    fireEvent.change(searchInput, { target: { value: "2020101" } });

    const searchBtn = screen.getByRole("button", { name: /Search Results/i });
    await user.click(searchBtn);

    await waitFor(() => {
      expect(resultApi.queryResultsApi).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "2020101",
        })
      );
    });
  });
});
