import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResourceCard } from "./ResourceCard.js";
import { AuthContext } from "../../context/authContextDef.js";
import type { Resource } from "../../types/resource.js";
import type { Role, AuthContextType } from "../../types/auth.js";
import * as resourceApi from "../../api/resource.js";

vi.mock("../../api/resource.js", () => ({
  downloadResourceApi: vi.fn(),
  deleteResourceApi: vi.fn(),
}));

const mockResource: Resource = {
  id: "res-1",
  title: "Operating Systems Lecture 3",
  courseName: "CSE 301: Operating Systems",
  semesterLabel: "3rd Year 1st Semester",
  year: 2026,
  type: "SLIDES",
  fileUrl: "/uploads/resources/os-lecture3.pdf",
  fileSizeBytes: 2.5 * 1024 * 1024,
  uploaderId: "user-cr-1",
  downloadCount: 42,
  createdAt: "2026-08-15T10:00:00.000Z",
  uploader: {
    id: "user-cr-1",
    name: "Tariqul Islam",
    role: "CR",
  },
};

describe("ResourceCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (role: Role = "STUDENT", userId = "user-student-1") => {
    const mockAuthContext: AuthContextType = {
      user: {
        id: userId,
        name: "Test User",
        email: "user@juniv.edu",
        role,
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
      changePassword: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <ResourceCard resource={mockResource} onDelete={vi.fn()} />
      </AuthContext.Provider>
    );
  };

  it("renders metadata, badges, and download counter correctly", () => {
    renderWithAuth("STUDENT");

    expect(screen.getByText("Operating Systems Lecture 3")).toBeInTheDocument();
    expect(screen.getByText("CSE 301: Operating Systems")).toBeInTheDocument();
    expect(screen.getByText("3rd Year 1st Semester")).toBeInTheDocument();
    expect(screen.getByText("Year 2026")).toBeInTheDocument();
    expect(screen.getByText("Lecture Slides")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Tariqul Islam")).toBeInTheDocument();
    expect(screen.getByText("2.5 MB")).toBeInTheDocument();
  });

  it("hides delete button when logged in as a normal student", () => {
    renderWithAuth("STUDENT", "user-student-2");
    expect(screen.queryByLabelText(/Delete resource/i)).not.toBeInTheDocument();
  });

  it("shows delete button when logged in as the CR who uploaded it", () => {
    renderWithAuth("CR", "user-cr-1");
    expect(screen.getByLabelText(/Delete resource/i)).toBeInTheDocument();
  });

  it("shows delete button when logged in as Admin", () => {
    renderWithAuth("ADMIN", "admin-user-id");
    expect(screen.getByLabelText(/Delete resource/i)).toBeInTheDocument();
  });

  it("increments download counter when download button is clicked", async () => {
    vi.mocked(resourceApi.downloadResourceApi).mockResolvedValue({
      ...mockResource,
      downloadCount: 43,
    });

    // Mock window.open
    const originalOpen = window.open;
    window.open = vi.fn();

    renderWithAuth("STUDENT");
    const downloadBtn = screen.getByRole("button", { name: /Download/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(resourceApi.downloadResourceApi).toHaveBeenCalledWith("res-1");
      expect(screen.getByText("43")).toBeInTheDocument();
    });

    window.open = originalOpen;
  });

  it("confirms and triggers delete callback", async () => {
    const onDeleteMock = vi.fn().mockResolvedValue(undefined);

    const mockAuthContext: AuthContextType = {
      user: {
        id: "user-cr-1",
        name: "Tariqul Islam",
        email: "cr@juniv.edu",
        role: "CR",
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
      changePassword: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ResourceCard resource={mockResource} onDelete={onDeleteMock} />
      </AuthContext.Provider>
    );

    const trashBtn = screen.getByLabelText(/Delete resource/i);
    fireEvent.click(trashBtn);

    const confirmBtn = screen.getByRole("button", { name: /Confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onDeleteMock).toHaveBeenCalledWith("res-1");
    });
  });
});
