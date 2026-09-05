import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationPanel } from "./NotificationPanel.js";
import * as notificationsApi from "../api/notifications.js";

vi.mock("../api/notifications.js", () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  fetchUnreadCount: vi.fn(),
}));

const mockNotifications = [
  {
    id: "n-1",
    userId: "u-1",
    type: "CT_SCHEDULED",
    message: "New CT scheduled for Software Engineering",
    relatedEntityType: "ScheduleEntry",
    relatedEntityId: "e-1",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "n-2",
    userId: "u-1",
    type: "HOLIDAY_DECLARED",
    message: "Holiday declared on 2026-09-15: Department Day",
    relatedEntityType: "Holiday",
    relatedEntityId: "h-1",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

describe("NotificationPanel Component (FR-31)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders notification items with read and unread styles", async () => {
    vi.mocked(notificationsApi.fetchNotifications).mockResolvedValue({
      notifications: mockNotifications,
      pagination: { total: 2, page: 1, limit: 15, totalPages: 1 },
    });

    render(<NotificationPanel onClose={vi.fn()} onCountUpdate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("New CT scheduled for Software Engineering")).toBeInTheDocument();
      expect(screen.getByText("Holiday declared on 2026-09-15: Department Day")).toBeInTheDocument();
    });

    expect(screen.getByText("Mark All as Read")).toBeInTheDocument();
  });

  it("marks individual unread notification as read on click", async () => {
    vi.mocked(notificationsApi.fetchNotifications).mockResolvedValue({
      notifications: mockNotifications,
      pagination: { total: 2, page: 1, limit: 15, totalPages: 1 },
    });
    vi.mocked(notificationsApi.markNotificationRead).mockResolvedValue(undefined);
    vi.mocked(notificationsApi.fetchUnreadCount).mockResolvedValue(0);

    const onCountUpdate = vi.fn();
    render(<NotificationPanel onClose={vi.fn()} onCountUpdate={onCountUpdate} />);

    await waitFor(() => {
      expect(screen.getByText("New CT scheduled for Software Engineering")).toBeInTheDocument();
    });

    const unreadItem = screen.getByText("New CT scheduled for Software Engineering").closest("button");
    if (unreadItem) {
      fireEvent.click(unreadItem);
    }

    await waitFor(() => {
      expect(notificationsApi.markNotificationRead).toHaveBeenCalledWith("n-1");
      expect(onCountUpdate).toHaveBeenCalledWith(0);
    });
  });

  it("marks all notifications as read when clicking Mark All as Read", async () => {
    vi.mocked(notificationsApi.fetchNotifications).mockResolvedValue({
      notifications: mockNotifications,
      pagination: { total: 2, page: 1, limit: 15, totalPages: 1 },
    });
    vi.mocked(notificationsApi.markAllNotificationsRead).mockResolvedValue(undefined);

    const onCountUpdate = vi.fn();
    render(<NotificationPanel onClose={vi.fn()} onCountUpdate={onCountUpdate} />);

    await waitFor(() => {
      expect(screen.getByText("Mark All as Read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark All as Read"));

    await waitFor(() => {
      expect(notificationsApi.markAllNotificationsRead).toHaveBeenCalled();
      expect(onCountUpdate).toHaveBeenCalledWith(0);
    });
  });

  it("shows empty state when there are no notifications", async () => {
    vi.mocked(notificationsApi.fetchNotifications).mockResolvedValue({
      notifications: [],
      pagination: { total: 0, page: 1, limit: 15, totalPages: 0 },
    });

    render(<NotificationPanel onClose={vi.fn()} onCountUpdate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No new notifications")).toBeInTheDocument();
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });
  });
});
