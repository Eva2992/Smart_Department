import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SemesterModal } from "./SemesterModal.js";
import type { Batch } from "../../types/academic.js";

const mockBatches: Batch[] = [
  {
    id: "batch-52",
    name: "52nd",
    program: "HONOURS",
    status: "ACTIVE",
  },
];

const mockTeachers = [
  { id: "teacher-1", name: "Dr. Kamrul Hasan", email: "kamrul@juniv.edu" },
  { id: "teacher-2", name: "Dr. Imdadul Islam", email: "imdadul@juniv.edu" },
];

describe("SemesterModal (React Testing Library Component Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders semester creation form fields with teacher options", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <SemesterModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        batches={mockBatches}
        teachers={mockTeachers}
      />
    );

    expect(screen.getByLabelText(/Semester Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Batch/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Course/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Semester/i })).toBeInTheDocument();
  });

  it("adds a new course row when Add Course button is clicked", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <SemesterModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        batches={mockBatches}
        teachers={mockTeachers}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Course/i });
    fireEvent.click(addBtn);

    const courseInputs = screen.getAllByPlaceholderText(/Course Title/i);
    expect(courseInputs).toHaveLength(2);
  });

  it("validates required fields and displays error message on empty submit", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <SemesterModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        batches={mockBatches}
        teachers={mockTeachers}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Create Semester/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Semester name is required/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid semester payload with course mapping", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SemesterModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        batches={mockBatches}
        teachers={mockTeachers}
      />
    );

    fireEvent.change(screen.getByLabelText(/Semester Name/i), {
      target: { value: "3rd Year 1st Semester" },
    });
    fireEvent.change(screen.getByLabelText(/Start Date/i), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText(/End Date/i), {
      target: { value: "2026-06-30" },
    });

    fireEvent.change(screen.getByPlaceholderText(/Course Title/i), {
      target: { value: "Database Management Systems" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Code/i), {
      target: { value: "CSE 301" },
    });

    const teacherSelect = screen.getByDisplayValue(/Select Faculty/i);
    fireEvent.change(teacherSelect, {
      target: { value: "teacher-1" },
    });

    const submitBtn = screen.getByRole("button", { name: /Create Semester/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "3rd Year 1st Semester",
        batchId: "batch-52",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        courses: [
          {
            name: "Database Management Systems",
            code: "CSE 301",
            creditHours: 3.0,
            teacherId: "teacher-1",
          },
        ],
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
