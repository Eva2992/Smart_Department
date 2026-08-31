import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AssignmentsPanel } from "../components/assessments/AssignmentsPanel";

// ── Mock the API module ───────────────────────────────────────────────────────
vi.mock("../api/assessments.js", () => ({
  assignmentApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { assignmentApi } from "../api/assessments.js";

const mockList   = vi.mocked(assignmentApi.list);
const mockDelete = vi.mocked(assignmentApi.delete);

// ── Shared fixtures ───────────────────────────────────────────────────────────
const mockAssignment = {
  id: "assign-1",
  title: "Project Phase 1",
  description: "Implement the authentication module.",
  dueDate: "2026-09-20T23:59:00.000Z",
  course: { code: "CSE301", name: "Algorithms" },
  batch: { name: "Batch 51" },
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("AssignmentsPanel Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading indicator while fetching data", async () => {
    mockList.mockReturnValue(new Promise(() => {}));
    render(<AssignmentsPanel />);
    expect(screen.getByText(/loading assignments/i)).toBeInTheDocument();
  });

  it("renders the Assignments heading and Create Assignment button", async () => {
    mockList.mockResolvedValue({ data: [] });
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByText(/^assignments$/i)).toBeInTheDocument()
    );
    expect(
      screen.getByRole("button", { name: /\+ create assignment/i })
    ).toBeInTheDocument();
  });

  it("shows empty state message when no assignments exist", async () => {
    mockList.mockResolvedValue({ data: [] });
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByText(/no assignments found/i)).toBeInTheDocument()
    );
  });

  it("renders an assignment card with title, description and course code", async () => {
    mockList.mockResolvedValue({ data: [mockAssignment] });
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByText("Project Phase 1")).toBeInTheDocument()
    );
    expect(
      screen.getByText("Implement the authentication module.")
    ).toBeInTheDocument();
    expect(screen.getByText("CSE301")).toBeInTheDocument();
  });

  it("opens the Create Assignment modal when button is clicked", async () => {
    mockList.mockResolvedValue({ data: [] });
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /\+ create assignment/i })
      ).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /\+ create assignment/i }));
    expect(screen.getByText("Create Assignment")).toBeInTheDocument();
  });

  it("opens the Edit Assignment modal when Edit is clicked", async () => {
    mockList.mockResolvedValue({ data: [mockAssignment] });
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByText("Edit Assignment")).toBeInTheDocument();
  });

  it("opens the delete confirmation dialog when Delete is clicked", async () => {
    mockList.mockResolvedValue({ data: [mockAssignment] });
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(
      screen.getByText(/are you sure you want to delete this assignment/i)
    ).toBeInTheDocument();
  });

  it("closes the delete dialog when Cancel is clicked", async () => {
    mockList.mockResolvedValue({ data: [mockAssignment] });
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(
      screen.queryByText(/are you sure you want to delete this assignment/i)
    ).not.toBeInTheDocument();
  });

  it("calls assignmentApi.delete and reloads data on confirm", async () => {
    mockDelete.mockResolvedValue(undefined);
    mockList
      .mockResolvedValueOnce({ data: [mockAssignment] }) // initial load
      .mockResolvedValueOnce({ data: [] }); // after delete

    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    // Dialog now also has a "Delete" button — pick the last one
    const allDeleteButtons = screen.getAllByRole("button", { name: /^delete$/i });
    fireEvent.click(allDeleteButtons[allDeleteButtons.length - 1]);

    await waitFor(() =>
      expect(assignmentApi.delete).toHaveBeenCalledWith("assign-1", "teacher-1")
    );
    await waitFor(() =>
      expect(screen.getByText(/no assignments found/i)).toBeInTheDocument()
    );
  });

  it("shows an error alert when the list API call fails", async () => {
    const apiError = Object.assign(new Error("Failed to fetch"), {
      response: { data: { message: "Failed to fetch" } },
    });
    mockList.mockRejectedValue(apiError);
    render(<AssignmentsPanel />);
    await waitFor(() =>
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument()
    );
  });
});
