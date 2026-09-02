import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { preloadedService } from "../../src/services/preloaded.service.js";
import bcrypt from "bcryptjs";
import { generateAccessToken } from "../../src/utils/token.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    preloadedStudent: {
      findUnique: vi.fn(),
    },
    preloadedTeacher: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/services/preloaded.service.js", () => ({
  preloadedService: {
    verifyStudentRoster: vi.fn(),
    verifyTeacherRoster: vi.fn(),
  },
}));

describe("Auth Integration Routes (/api/v1/auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("returns 400 when validation fails (invalid email or weak password)", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "A",
        email: "not-an-email",
        password: "123",
        role: "STUDENT",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 201 when student registers with valid preloaded data", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(preloadedService.verifyStudentRoster).mockResolvedValue({
        valid: true,
        preloadedRecord: {
          universityId: "2021-1-60-001",
          name: "Tahmid Hasan",
          email: "student52_1@juniv.edu",
          batchId: "batch-52",
          program: "HONOURS",
        },
      });

      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "user-uuid-1",
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        passwordHash: "hashed",
        role: "STUDENT",
        universityId: "2021-1-60-001",
        teacherUniqueId: null,
        batchId: "batch-52",
        program: "HONOURS",
        isChairman: false,
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.refreshToken.create).mockResolvedValue({
        id: "rt-1",
        userId: "user-uuid-1",
        tokenHash: "token-hash",
        expiresAt: new Date(),
        revoked: false,
        createdAt: new Date(),
      });

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        role: "STUDENT",
        universityId: "2021-1-60-001",
        batchId: "batch-52",
        program: "HONOURS",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("student52_1@juniv.edu");
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("authenticates verified user and returns tokens", async () => {
      const passwordHash = await bcrypt.hash("CorrectPassword123!", 10);
      const mockUser = {
        id: "user-1",
        name: "Tahmid",
        email: "student52_1@juniv.edu",
        passwordHash,
        role: "STUDENT",
        universityId: "2021-1-60-001",
        teacherUniqueId: null,
        batchId: "batch-52",
        program: "HONOURS",
        isChairman: false,
        isVerified: true,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as any);

      const res = await request(app).post("/api/v1/auth/login").send({
        email: "student52_1@juniv.edu",
        password: "CorrectPassword123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe("student52_1@juniv.edu");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns 401 Unauthorized when no Bearer token is provided", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 200 with user profile when valid Bearer token is provided", async () => {
      const token = generateAccessToken({
        userId: "user-1",
        email: "student52_1@juniv.edu",
        role: "STUDENT",
        name: "Tahmid",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        name: "Tahmid",
        email: "student52_1@juniv.edu",
        role: "STUDENT",
        universityId: "2021-1-60-001",
        teacherUniqueId: null,
        batchId: "batch-52",
        program: "HONOURS",
        isChairman: false,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("user-1");
      expect(res.body.data.email).toBe("student52_1@juniv.edu");
    });
  });

  describe("POST /api/v1/auth/change-password", () => {
    it("returns 200 when authenticated with correct current password", async () => {
      const passwordHash = await bcrypt.hash("OldPassword123!", 10);
      const token = generateAccessToken({
        userId: "user-1",
        email: "student52_1@juniv.edu",
        role: "STUDENT",
        name: "Tahmid",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "student52_1@juniv.edu",
        passwordHash,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as any);

      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "OldPassword123!",
          newPassword: "NewSecurePass456!",
          confirmPassword: "NewSecurePass456!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    });

    it("returns 401 without auth header", async () => {
      const res = await request(app).post("/api/v1/auth/change-password").send({
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePass456!",
        confirmPassword: "NewSecurePass456!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 with wrong current password", async () => {
      const passwordHash = await bcrypt.hash("CorrectPassword123!", 10);
      const token = generateAccessToken({
        userId: "user-1",
        email: "student52_1@juniv.edu",
        role: "STUDENT",
        name: "Tahmid",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "student52_1@juniv.edu",
        passwordHash,
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "WrongPassword123!",
          newPassword: "NewSecurePass456!",
          confirmPassword: "NewSecurePass456!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    });

    it("returns 400 with weak new password", async () => {
      const token = generateAccessToken({
        userId: "user-1",
        email: "student52_1@juniv.edu",
        role: "STUDENT",
        name: "Tahmid",
      });

      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "OldPassword123!",
          newPassword: "weak",
          confirmPassword: "weak",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/auth/forgot-password", () => {
    it("returns 200 for existing email with generic message", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "student52_1@juniv.edu",
        name: "Tahmid",
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "student52_1@juniv.edu" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("If an account with this email exists");
    });

    it("returns 200 for non-existent email with same generic message (anti-enumeration)", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "nonexistent@juniv.edu" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("If an account with this email exists");
    });

    it("returns 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/auth/reset-password", () => {
    it("returns 200 with valid token and strong password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "student52_1@juniv.edu",
        resetPasswordToken: "valid-token",
        resetPasswordTokenExpiry: new Date(Date.now() + 3600 * 1000),
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 } as any);

      const res = await request(app).post("/api/v1/auth/reset-password").send({
        token: "valid-token",
        newPassword: "BrandNewPassword789!",
        confirmPassword: "BrandNewPassword789!",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    });

    it("returns 400 with invalid/unknown token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app).post("/api/v1/auth/reset-password").send({
        token: "unknown-token",
        newPassword: "BrandNewPassword789!",
        confirmPassword: "BrandNewPassword789!",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_RESET_TOKEN");
    });

    it("returns 400 with expired token", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "student52_1@juniv.edu",
        resetPasswordToken: "expired-token",
        resetPasswordTokenExpiry: new Date(Date.now() - 1000),
      } as any);

      const res = await request(app).post("/api/v1/auth/reset-password").send({
        token: "expired-token",
        newPassword: "BrandNewPassword789!",
        confirmPassword: "BrandNewPassword789!",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TOKEN_EXPIRED");
    });

    it("returns 400 with weak new password", async () => {
      const res = await request(app).post("/api/v1/auth/reset-password").send({
        token: "some-token",
        newPassword: "weak",
        confirmPassword: "weak",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
