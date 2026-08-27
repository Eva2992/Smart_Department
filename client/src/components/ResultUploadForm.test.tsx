import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultUploadForm } from "./ResultUploadForm.js";
import * as resultApi from "../api/result.js";
import { AuthContext } from "../context/authContextDef.js";
import type { Role, AuthContextType } from "../types/auth.js";

vi.mock("../api/result.js", () => ({
  uploadResultsApi: vi.fn(),
}));

describe("ResultUploadForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (role: Role = "CR", batchId = "batch-52") => {
    const mockAuthContext: AuthContextType = {
      user: {
        id: "user-cr",
        name: "Test CR",
        email: "cr@juniv.edu",
        role,
        batchId,
        isVerified: true,
      },
      tokens: { accessToken: "tok", refreshToken: "ref" },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <ResultUploadForm />
      </AuthContext.Provider>
    );
  };

  it("renders CR role tag and form inputs with initial batch prefilled", () => {
    renderWithAuth("CR", "batch-52");

    expect(screen.getByText(/CR Upload Portal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Batch Identifier/i)).toHaveValue("batch-52");
    expect(screen.getByText(/Upload Semester Final Results/i)).toBeInTheDocument();
  });

  it("parses raw CSV text and displays live preview table with calculated GPAs", async () => {
    renderWithAuth("CR", "batch-52");

    const rawCsvText = `University ID,Student Name,CSE401,CSE402
2020101,Rahim Ahmed,85,78`;

    const textarea = screen.getByLabelText(/Or Paste Raw CSV Data/i);
    fireEvent.change(textarea, { target: { value: rawCsvText } });

    await waitFor(() => {
      expect(screen.getByText(/Live Preview & Calculated GPAs/i)).toBeInTheDocument();
      expect(screen.getByText("Rahim Ahmed")).toBeInTheDocument();
      expect(screen.getByText("Roll: 2020101")).toBeInTheDocument();
    });
  });

  it("submits valid results payload when form is submitted", async () => {
    vi.mocked(resultApi.uploadResultsApi).mockResolvedValue({
      success: true,
      message: "Results published successfully",
      data: {
        publishedCount: 1,
        resourceArchived: true,
        batchName: "52nd",
        semesterName: "4th Year 1st Semester",
      },
    });

    renderWithAuth("CR", "batch-52");
    const user = userEvent.setup();

    const semInput = screen.getByLabelText(/Semester Identifier/i);
    await user.type(semInput, "sem-1");

    const rawCsvText = `University ID,Student Name,CSE401,CSE402\n2020101,Rahim Ahmed,85,78`;
    const textarea = screen.getByLabelText(/Or Paste Raw CSV Data/i);
    fireEvent.change(textarea, { target: { value: rawCsvText } });

    const submitBtn = await screen.findByRole("button", { name: /Publish Results/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(resultApi.uploadResultsApi).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Results published successfully/i)).toBeInTheDocument();
    });
  });
});
