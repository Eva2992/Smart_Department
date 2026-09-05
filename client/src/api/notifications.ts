import { apiClient } from "./client.js";
import type { ApiResponse } from "../types/auth.js";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  notifications: NotificationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function fetchNotifications(
  page = 1,
  limit = 20
): Promise<PaginatedNotifications> {
  const res = await apiClient.get<ApiResponse<PaginatedNotifications>>(
    `/notifications?page=${page}&limit=${limit}`
  );
  return res.data.data!;
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await apiClient.get<ApiResponse<{ count: number }>>(
    "/notifications/unread-count"
  );
  return res.data.data!.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/notifications/mark-all-read");
}
