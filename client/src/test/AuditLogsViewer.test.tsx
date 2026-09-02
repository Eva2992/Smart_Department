import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuditLogsViewer } from "../components/academic/AuditLogsViewer.js";
import { academicApi } from "../api/academic.js";

vi.mock("../api/academic.js", () => ({
  academicApi: {
    getAuditLogs: vi.fn(),
  },
}));

describe("AuditLogsViewer Component (NFR-12, R-02, R-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders audit logs table with entries", async () => {
    vi.mocked(academicApi.getAuditLogs).mockResolvedValue({
      logs: [
        {
          id: "log-1",
          createdAt: "2026-09-01T12:00:00.000Z",
          action: "LOGIN_SUCCESS",
          user: { name: "Admin", email: "admin@juniv.edu" },
          entityType: "USER",
          entityId: "u-12345678",
          ipAddress: "192.168.1.1",
          details: { role: "ADMIN" },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<AuditLogsViewer />);

    expect(screen.getByText(/Security Audit Logs/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("LOGIN_SUCCESS")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
    });
  });
});
