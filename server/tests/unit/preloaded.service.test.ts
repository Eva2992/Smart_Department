import { describe, it, expect, vi, beforeEach } from "vitest";
import { preloadedService } from "../../src/services/preloaded.service.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    preloadedStudent: {
      findUnique: vi.fn(),
    },
    preloadedTeacher: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe("PreloadedService (Unit Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyStudentRoster", () => {
    it("returns valid: true when university ID matches unassigned preloaded student", async () => {
      vi.mocked(prisma.preloadedStudent.findUnique).mockResolvedValue({
        universityId: "2021-1-60-001",
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        batchId: "batch-52",
        program: "HONOURS",
      });
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const result = await preloadedService.verifyStudentRoster({
        universityId: "2021-1-60-001",
        email: "student52_1@juniv.edu",
        batchId: "batch-52",
        program: "HONOURS",
      });

      expect(result.valid).toBe(true);
      expect(result.preloadedRecord?.name).toBe("Tahmid Hasan");
    });

    it("fails when university ID is not in preloaded roster", async () => {
      vi.mocked(prisma.preloadedStudent.findUnique).mockResolvedValue(null);

      const result = await preloadedService.verifyStudentRoster({
        universityId: "9999-9-99-999",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("was not found");
    });

    it("fails when university ID is already registered by an existing user", async () => {
      vi.mocked(prisma.preloadedStudent.findUnique).mockResolvedValue({
        universityId: "2021-1-60-001",
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        batchId: "batch-52",
        program: "HONOURS",
      });
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "existing-user-id",
        universityId: "2021-1-60-001",
      } as any);

      const result = await preloadedService.verifyStudentRoster({
        universityId: "2021-1-60-001",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("already registered");
    });

    it("fails when provided email does not match preloaded record", async () => {
      vi.mocked(prisma.preloadedStudent.findUnique).mockResolvedValue({
        universityId: "2021-1-60-001",
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        batchId: "batch-52",
        program: "HONOURS",
      });
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const result = await preloadedService.verifyStudentRoster({
        universityId: "2021-1-60-001",
        email: "wrong_email@gmail.com",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not match the official");
    });
  });

  describe("verifyTeacherRoster", () => {
    it("returns valid: true when institutional email matches preloaded teacher", async () => {
      vi.mocked(prisma.preloadedTeacher.findFirst).mockResolvedValue({
        uniqueId: "T-JU-001",
        name: "Prof. Dr. Md. Golam Moazzam",
        email: "moazzam@juniv.edu",
        designation: "Professor & Chairman",
        isChairman: true,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await preloadedService.verifyTeacherRoster({
        email: "moazzam@juniv.edu",
      });

      expect(result.valid).toBe(true);
      expect(result.preloadedRecord?.isChairman).toBe(true);
    });

    it("fails when teacher email is not in preloaded roster", async () => {
      vi.mocked(prisma.preloadedTeacher.findFirst).mockResolvedValue(null);

      const result = await preloadedService.verifyTeacherRoster({
        email: "random@juniv.edu",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("not registered in the department faculty directory");
    });

    it("fails when teacher email is already registered", async () => {
      vi.mocked(prisma.preloadedTeacher.findFirst).mockResolvedValue({
        uniqueId: "T-JU-001",
        name: "Prof. Dr. Md. Golam Moazzam",
        email: "moazzam@juniv.edu",
        designation: "Professor",
        isChairman: false,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "existing-user",
        email: "moazzam@juniv.edu",
      } as any);

      const result = await preloadedService.verifyTeacherRoster({
        email: "moazzam@juniv.edu",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("already registered");
    });
  });
});
