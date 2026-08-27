import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { authService } from "../../src/services/auth.service.js";
import { prisma } from "../../src/lib/prisma.js";
import { preloadedService } from "../../src/services/preloaded.service.js";
import { AppError } from "../../src/middleware/errorHandler.js";

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
  },
}));

vi.mock("../../src/services/preloaded.service.js", () => ({
  preloadedService: {
    verifyStudentRoster: vi.fn(),
    verifyTeacherRoster: vi.fn(),
  },
}));

describe("AuthService (Unit Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("successfully registers a student when preloaded roster verification passes", async () => {
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

      const mockCreatedUser = {
        id: "user-1",
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        passwordHash: "hashed-pw",
        role: "STUDENT" as const,
        universityId: "2021-1-60-001",
        teacherUniqueId: null,
        batchId: "batch-52",
        program: "HONOURS" as const,
        isChairman: false,
        isVerified: false,
        verificationToken: "token-123",
        verificationTokenExpiry: new Date(Date.now() + 24 * 3600 * 1000),
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as any);

      const result = await authService.register({
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        password: "SecurePassword123!",
        role: "STUDENT",
        universityId: "2021-1-60-001",
        batchId: "batch-52",
        program: "HONOURS",
      });

      expect(result.user.email).toBe("student52_1@juniv.edu");
      expect(result.user.isVerified).toBe(false);
      expect(result.verificationToken).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("rejects registration if email already exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "existing-id",
        email: "existing@juniv.edu",
      } as any);

      await expect(
        authService.register({
          name: "Existing",
          email: "existing@juniv.edu",
          password: "password123",
          role: "STUDENT",
          universityId: "2021-1-60-001",
        })
      ).rejects.toThrow(AppError);
    });

    it("rejects registration if preloaded verification fails", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(preloadedService.verifyStudentRoster).mockResolvedValue({
        valid: false,
        error: "Your information does not match our records. Please contact the department admin.",
      });

      await expect(
        authService.register({
          name: "Wrong Student",
          email: "wrong@juniv.edu",
          password: "password123",
          role: "STUDENT",
          universityId: "9999-9-99-999",
        })
      ).rejects.toThrow(/does not match our records/);
    });
  });

  describe("verifyEmail", () => {
    it("successfully verifies email with valid token", async () => {
      const mockUser = {
        id: "user-1",
        name: "Tahmid",
        email: "student52_1@juniv.edu",
        role: "STUDENT" as const,
        universityId: "2021-1-60-001",
        teacherUniqueId: null,
        batchId: "batch-52",
        program: "HONOURS" as const,
        isChairman: false,
        isVerified: false,
        verificationToken: "valid-token",
        verificationTokenExpiry: new Date(Date.now() + 100000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockUser,
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      } as any);

      const result = await authService.verifyEmail("valid-token");
      expect(result.success).toBe(true);
      expect(result.user.isVerified).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });
    });

    it("throws TOKEN_EXPIRED if verification token has expired", async () => {
      const mockUser = {
        id: "user-1",
        isVerified: false,
        verificationToken: "expired-token",
        verificationTokenExpiry: new Date(Date.now() - 1000),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(authService.verifyEmail("expired-token")).rejects.toThrow(/expired/);
    });
  });

  describe("login & lockout", () => {
    it("successfully logs in verified user with correct credentials and issues tokens", async () => {
      const hashed = await bcrypt.hash("CorrectPassword123!", 10);
      const mockUser = {
        id: "user-1",
        name: "Tahmid",
        email: "student52_1@juniv.edu",
        passwordHash: hashed,
        role: "STUDENT" as const,
        universityId: "2021-1-60-001",
        teacherUniqueId: null,
        batchId: "batch-52",
        program: "HONOURS" as const,
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

      const result = await authService.login({
        email: "student52_1@juniv.edu",
        password: "CorrectPassword123!",
      });

      expect(result.user.email).toBe("student52_1@juniv.edu");
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it("throws EMAIL_NOT_VERIFIED if user account is not yet verified", async () => {
      const hashed = await bcrypt.hash("CorrectPassword123!", 10);
      const mockUser = {
        id: "user-1",
        email: "unverified@juniv.edu",
        passwordHash: hashed,
        isVerified: false,
        failedAttempts: 0,
        lockedUntil: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(
        authService.login({
          email: "unverified@juniv.edu",
          password: "CorrectPassword123!",
        })
      ).rejects.toThrow(/verify your email/);
    });

    it("locks account after 5 consecutive failed attempts", async () => {
      const hashed = await bcrypt.hash("CorrectPassword123!", 10);
      const mockUser = {
        id: "user-1",
        email: "student52_1@juniv.edu",
        passwordHash: hashed,
        isVerified: true,
        failedAttempts: 4, // 5th attempt will lock
        lockedUntil: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      await expect(
        authService.login({
          email: "student52_1@juniv.edu",
          password: "WrongPassword!",
        })
      ).rejects.toThrow(/account has been locked/);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            lockedUntil: expect.any(Date),
          }),
        })
      );
    });
  });
});
