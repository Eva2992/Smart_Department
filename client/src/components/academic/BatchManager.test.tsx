import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BatchCard } from "./BatchCard.js";
import type { Batch } from "../../types/academic.js";

const mockBatch: Batch = {
  id: "batch-52",
  name: "52nd",
  program: "HONOURS",
  status: "ACTIVE",
  currentSemester: {
    id: "sem-1",
    name: "3rd Year 1st Semester",
    batchId: "batch-52",
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    status: "ACTIVE",
  },
  cr: {
    id: "cr-1",
    name: "Tahmid Hasan",
    email: "cr52@juniv.edu",
    universityId: "2021-1-60-001",
    role: "CR",
  },
  totalStudents: 45,
  totalSemesters: 3,
};

describe("BatchCard (React Testing Library Component Seam)", () => {
  it("renders batch name, program badge, active semester status, and CR info", () => {
    const onCreateSemester = vi.fn();
    const onPromote = vi.fn();
    const onManageCR = vi.fn();

    render(
      <BatchCard
        batch={mockBatch}
        onCreateSemester={onCreateSemester}
        onPromote={onPromote}
        onManageCR={onManageCR}
      />
    );

    expect(screen.getByText("52nd Batch")).toBeInTheDocument();
    expect(screen.getByText("HONOURS")).toBeInTheDocument();
    expect(screen.getByText("Active Cohort")).toBeInTheDocument();
    expect(screen.getByText("3rd Year 1st Semester")).toBeInTheDocument();
    expect(screen.getByText(/Tahmid Hasan/)).toBeInTheDocument();
    expect(screen.getByText("45 Students")).toBeInTheDocument();
  });

  it("calls onPromote when Promote Batch button is clicked", () => {
    const onCreateSemester = vi.fn();
    const onPromote = vi.fn();
    const onManageCR = vi.fn();

    render(
      <BatchCard
        batch={mockBatch}
        onCreateSemester={onCreateSemester}
        onPromote={onPromote}
        onManageCR={onManageCR}
      />
    );

    const promoteBtn = screen.getByRole("button", { name: /Promote Batch/i });
    fireEvent.click(promoteBtn);

    expect(onPromote).toHaveBeenCalledWith(mockBatch);
  });

  it("calls onCreateSemester when New Semester button is clicked", () => {
    const onCreateSemester = vi.fn();
    const onPromote = vi.fn();
    const onManageCR = vi.fn();

    render(
      <BatchCard
        batch={mockBatch}
        onCreateSemester={onCreateSemester}
        onPromote={onPromote}
        onManageCR={onManageCR}
      />
    );

    const newSemBtn = screen.getByRole("button", { name: /New Semester/i });
    fireEvent.click(newSemBtn);

    expect(onCreateSemester).toHaveBeenCalledWith(mockBatch);
  });
});
