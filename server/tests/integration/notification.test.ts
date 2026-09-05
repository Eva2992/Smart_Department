import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe("Notification API Integration (/api/v1/notifications)", () => {
  const studentToken = generateAccessToken({
    userId: "student-1",
    email: "student@juniv.edu",
    role: "STUDENT",
    name: "Student User",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/notifications requires authentication", async () => {
    const res = await request(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/notifications returns paginated notifications for authenticated user", async () => {
    const mockNotifications = [
      {
        id: "notif-1",
        userId: "student-1",
        type: "CLASS_RESCHEDULED",
        message: "Class rescheduled",
        relatedEntityType: "ScheduleEntry",
        relatedEntityId: "entry-1",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    (prisma.notification.findMany as any).mockResolvedValue(mockNotifications);
    (prisma.notification.count as any).mockResolvedValue(1);

    const res = await request(app)
      .get("/api/v1/notifications?page=1&limit=10")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  it("GET /api/v1/notifications/unread-count returns badge count", async () => {
    (prisma.notification.count as any).mockResolvedValue(3);

    const res = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(3);
  });

  it("PATCH /api/v1/notifications/:id/read marks notification as read", async () => {
    (prisma.notification.findUnique as any).mockResolvedValue({
      id: "notif-1",
      userId: "student-1",
      isRead: false,
    });
    (prisma.notification.update as any).mockResolvedValue({
      id: "notif-1",
      userId: "student-1",
      isRead: true,
    });

    const res = await request(app)
      .patch("/api/v1/notifications/notif-1/read")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRead).toBe(true);
  });

  it("PATCH /api/v1/notifications/:id/read returns 403 when marking other's notification", async () => {
    (prisma.notification.findUnique as any).mockResolvedValue({
      id: "notif-1",
      userId: "other-user",
      isRead: false,
    });

    const res = await request(app)
      .patch("/api/v1/notifications/notif-1/read")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("PATCH /api/v1/notifications/mark-all-read marks all as read", async () => {
    (prisma.notification.updateMany as any).mockResolvedValue({ count: 5 });

    const res = await request(app)
      .patch("/api/v1/notifications/mark-all-read")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(5);
  });
});
