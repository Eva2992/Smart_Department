import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromotionWizard } from "./PromotionWizard.js";
import type { Batch } from "../../types/academic.js";

const mockBatch: Batch = {
  id: "batch-52",
  name: "52nd",
  program: "HONOURS",
  status: "ACTIVE",
  currentSemester: {
    id: "sem-1",
    name: "2nd Year 2nd Semester",
    batchId: "batch-52",
    startDate: "2025-07-01",
    endDate: "2025-12-31",
    status: "ACTIVE",
  },
  cr: {
    id: "cr-1",
    name: "Tahmid Hasan",
    email: "cr52@juniv.edu",
    role: "CR",
  },
  totalStudents: 45,
};

describe("PromotionWizard (React Testing Library Component Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders promotion wizard with CR Role Reset notice (ADR-0004)", () => {
    const onClose = vi.fn();
    const onPromote = vi.fn();

    render(
      <PromotionWizard isOpen={true} onClose={onClose} batch={mockBatch} onPromote={onPromote} />
    );

    expect(screen.getByText(/Batch Promotion Wizard • 52nd Batch/i)).toBeInTheDocument();
    expect(screen.getByText(/CR Role Reset Rule \(ADR-0004\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Next Semester/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Graduation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Execute Promotion/i })).toBeInTheDocument();
  });

  it("submits promotion for next semester with provided name", async () => {
    const onClose = vi.fn();
    const onPromote = vi.fn().mockResolvedValue(undefined);

    render(
      <PromotionWizard isOpen={true} onClose={onClose} batch={mockBatch} onPromote={onPromote} />
    );

    const semesterInput = screen.getByLabelText(/Next Semester Name/i);
    fireEvent.change(semesterInput, {
      target: { value: "3rd Year 1st Semester" },
    });

    const submitBtn = screen.getByRole("button", { name: /Execute Promotion/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onPromote).toHaveBeenCalledWith("batch-52", {
        isGraduation: false,
        nextSemesterName: "3rd Year 1st Semester",
        nextSemesterStartDate: undefined,
        nextSemesterEndDate: undefined,
        promotionRequestId: undefined,
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("switches to Graduation mode and submits graduation payload", async () => {
    const onClose = vi.fn();
    const onPromote = vi.fn().mockResolvedValue(undefined);

    render(
      <PromotionWizard isOpen={true} onClose={onClose} batch={mockBatch} onPromote={onPromote} />
    );

    const graduationRadio = screen.getByDisplayValue("GRADUATE");
    fireEvent.click(graduationRadio);

    const submitBtn = screen.getByRole("button", { name: /Complete & Graduate Batch/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onPromote).toHaveBeenCalledWith("batch-52", {
        isGraduation: true,
        nextSemesterName: undefined,
        nextSemesterStartDate: undefined,
        nextSemesterEndDate: undefined,
        promotionRequestId: undefined,
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
