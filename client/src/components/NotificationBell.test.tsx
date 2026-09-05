import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationBell } from "./NotificationBell.js";
import * as notificationsApi from "../api/notifications.js";
import { AuthContext } from "../context/authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

vi.mock("../api/notifications.js", () => ({
  fetchUnreadCount: vi.fn(),
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

function renderNotificationBell(authOverrides: Partial<AuthContextType> = {}) {
  const mockAuth: AuthContextType = {
    user: {
      id: "u-1",
      name: "Test User",
      email: "test@juniv.edu",
      role: "STUDENT",
      isVerified: true,
    },
    tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    ...authOverrides,
  };

  return {
    ...render(
      <AuthContext.Provider value={mockAuth}>
        <NotificationBell />
      </AuthContext.Provider>
    ),
    mockAuth,
  };
}

describe("NotificationBell Component (FR-31)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when user is not authenticated", () => {
    vi.mocked(notificationsApi.fetchUnreadCount).mockResolvedValue(0);

    const { container } = renderNotificationBell({ isAuthenticated: false, user: null });
    expect(container.firstChild).toBeNull();
  });

  it("renders bell icon and hides badge when unreadCount is 0", async () => {
    vi.mocked(notificationsApi.fetchUnreadCount).mockResolvedValue(0);

    renderNotificationBell();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("displays badge with count when unreadCount > 0", async () => {
    vi.mocked(notificationsApi.fetchUnreadCount).mockResolvedValue(5);

    renderNotificationBell();

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("toggles notification panel when bell is clicked", async () => {
    vi.mocked(notificationsApi.fetchUnreadCount).mockResolvedValue(2);
    vi.mocked(notificationsApi.fetchNotifications).mockResolvedValue({
      notifications: [
        {
          id: "n-1",
          userId: "u-1",
          type: "CLASS_RESCHEDULED",
          message: "Class rescheduled to 11:30 AM",
          relatedEntityType: "ScheduleEntry",
          relatedEntityId: "e-1",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, page: 1, limit: 15, totalPages: 1 },
    });

    renderNotificationBell();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
    });

    const bellBtn = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Class rescheduled to 11:30 AM")).toBeInTheDocument();
    });
  });
});
