import { describe, it, expect, vi, beforeEach } from "vitest";
import { resultService } from "../../src/services/result.service.js";
import { prisma } from "../../src/lib/prisma.js";
import { AppError } from "../../src/middleware/errorHandler.js";
import { Role } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    result: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
    resource: {
      create: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    semester: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === "function") {
        return callback(prisma);
      }
      return Promise.all(callback);
    }),
  },
}));

describe("Result Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateGPA & Grade Mapping", () => {
    it("correctly maps percentage marks to JU letter grades and grade points", () => {
      const scaleTests = [
        { marks: 85, expectedGrade: "A+", expectedPoint: 4.0 },
        { marks: 80, expectedGrade: "A+", expectedPoint: 4.0 },
        { marks: 79.9, expectedGrade: "A", expectedPoint: 3.75 },
        { marks: 75, expectedGrade: "A", expectedPoint: 3.75 },
        { marks: 74.9, expectedGrade: "A-", expectedPoint: 3.5 },
        { marks: 70, expectedGrade: "A-", expectedPoint: 3.5 },
        { marks: 65, expectedGrade: "B+", expectedPoint: 3.25 },
        { marks: 60, expectedGrade: "B", expectedPoint: 3.0 },
        { marks: 55, expectedGrade: "B-", expectedPoint: 2.75 },
        { marks: 50, expectedGrade: "C+", expectedPoint: 2.5 },
        { marks: 45, expectedGrade: "C", expectedPoint: 2.25 },
        { marks: 40, expectedGrade: "D", expectedPoint: 2.0 },
        { marks: 39.9, expectedGrade: "F", expectedPoint: 0.0 },
        { marks: 0, expectedGrade: "F", expectedPoint: 0.0 },
      ];

      for (const t of scaleTests) {
        const mapped = resultService.getGradeFromMarks(t.marks);
        expect(mapped.letterGrade).toBe(t.expectedGrade);
        expect(mapped.gradePoint).toBe(t.expectedPoint);
      }
    });

    it("calculates weighted GPA accurately across variable course credits", () => {
      // Course 1: 3.0 credits, A+ (4.00) -> 12.0
      // Course 2: 3.0 credits, A (3.75) -> 11.25
      // Course 3: 1.5 credits, B+ (3.25) -> 4.875
      // Course 4: 0.75 credits, A+ (4.00) -> 3.0
      // Total points = 31.125 / 8.25 credits = 3.7727... -> 3.77
      const courseMarks = [
        {
          courseCode: "CSE 401",
          courseTitle: "Distributed Systems",
          creditHours: 3.0,
          marks: 85,
          letterGrade: "A+",
          gradePoint: 4.0,
        },
        {
          courseCode: "CSE 402",
          courseTitle: "Machine Learning",
          creditHours: 3.0,
          marks: 77,
          letterGrade: "A",
          gradePoint: 3.75,
        },
        {
          courseCode: "CSE 403",
          courseTitle: "ML Lab",
          creditHours: 1.5,
          marks: 68,
          letterGrade: "B+",
          gradePoint: 3.25,
        },
        {
          courseCode: "CSE 404",
          courseTitle: "Project",
          creditHours: 0.75,
          marks: 90,
          letterGrade: "A+",
          gradePoint: 4.0,
        },
      ];

      const gpa = resultService.calculateGPA(courseMarks);
      expect(gpa).toBe(3.77);
    });

    it("returns 0.00 when total credit hours is 0 or all courses are failed", () => {
      const failedCourses = [
        {
          courseCode: "CSE 101",
          courseTitle: "Structured Programming",
          creditHours: 3.0,
          marks: 30,
          letterGrade: "F",
          gradePoint: 0.0,
        },
      ];
      expect(resultService.calculateGPA(failedCourses)).toBe(0.0);
    });
  });

  describe("parseAndValidateGradeSheet", () => {
    it("parses CSV grade sheet string correctly into structured student records", () => {
      const csvData = `University ID,Student Name,CSE 401 Marks,CSE 402 Marks
2020101,Rahim Ahmed,85,75
2020102,Karim Ullah,65,55`;

      const courseCatalog = [
        { code: "CSE 401", title: "Distributed Systems", creditHours: 3.0 },
        { code: "CSE 402", title: "Compiler Design", creditHours: 3.0 },
      ];

      const parsed = resultService.parseAndValidateGradeSheet(csvData, courseCatalog);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].universityId).toBe("2020101");
      expect(parsed[0].studentName).toBe("Rahim Ahmed");
      expect(parsed[0].courseMarks).toHaveLength(2);
      expect(parsed[0].courseMarks[0].letterGrade).toBe("A+");
      expect(parsed[0].courseMarks[1].letterGrade).toBe("A");
      expect(parsed[0].gpa).toBe(3.88); // (4.0*3 + 3.75*3) / 6 = 23.25 / 6 = 3.875 -> 3.88
    });

    it("throws AppError when CSV content has missing university IDs", () => {
      const invalidCsv = `University ID,Student Name,CSE 401 Marks
,Rahim Ahmed,85`;

      const courseCatalog = [
        { code: "CSE 401", title: "Distributed Systems", creditHours: 3.0 },
      ];

      expect(() =>
        resultService.parseAndValidateGradeSheet(invalidCsv, courseCatalog)
      ).toThrow(AppError);
    });
  });

  describe("publishResult (Dual-Hybrid Persistence & RBAC)", () => {
    const mockBatch = {
      id: "batch-52",
      name: "52nd Batch",
      program: "HONOURS",
    };

    const mockSemester = {
      id: "sem-1",
      name: "4th Year 1st Semester",
      batchId: "batch-52",
    };

    const mockStudents = [
      { id: "user-1", universityId: "2020101", name: "Rahim Ahmed" },
    ];

    it("allows CR to upload and publish results for their own batch", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.semester.findUnique).mockResolvedValue(mockSemester as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockStudents as any);
      vi.mocked(prisma.result.upsert).mockResolvedValue({ id: "res-1" } as any);
      vi.mocked(prisma.resource.create).mockResolvedValue({ id: "resource-1" } as any);

      const payload = {
        batchId: "batch-52",
        semesterId: "sem-1",
        results: [
          {
            universityId: "2020101",
            studentName: "Rahim Ahmed",
            courseMarks: [
              {
                courseCode: "CSE 401",
                courseTitle: "Distributed Systems",
                creditHours: 3.0,
                marks: 85,
                letterGrade: "A+",
                gradePoint: 4.0,
              },
            ],
            gpa: 4.0,
            cgpa: 3.9,
          },
        ],
        rawContent: "University ID,Student Name...",
        fileName: "results_52nd_4th_1st.csv",
        fileSizeBytes: 1024,
      };

      const crUser = {
        id: "cr-user-id",
        role: Role.CR,
        batchId: "batch-52",
      };

      const result = await resultService.publishResult(payload, crUser);

      expect(result.publishedCount).toBe(1);
      expect(result.resourceArchived).toBe(true);
      expect(prisma.result.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.resource.create).toHaveBeenCalledTimes(1);
    });

    it("rejects CR upload when batch does not match CR's assigned batch", async () => {
      const payload = {
        batchId: "batch-51", // Different batch
        semesterId: "sem-1",
        results: [],
      };

      const crUser = {
        id: "cr-user-id",
        role: Role.CR,
        batchId: "batch-52",
      };

      await expect(
        resultService.publishResult(payload, crUser)
      ).rejects.toThrow(AppError);
    });

    it("allows ADMIN to publish results for any batch", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.semester.findUnique).mockResolvedValue(mockSemester as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockStudents as any);
      vi.mocked(prisma.result.upsert).mockResolvedValue({ id: "res-1" } as any);
      vi.mocked(prisma.resource.create).mockResolvedValue({ id: "resource-1" } as any);

      const adminUser = {
        id: "admin-id",
        role: Role.ADMIN,
        batchId: null,
      };

      const payload = {
        batchId: "batch-52",
        semesterId: "sem-1",
        results: [
          {
            universityId: "2020101",
            courseMarks: [
              {
                courseCode: "CSE 401",
                courseTitle: "Distributed Systems",
                creditHours: 3.0,
                marks: 85,
                letterGrade: "A+",
                gradePoint: 4.0,
              },
            ],
            gpa: 4.0,
          },
        ],
      };

      const result = await resultService.publishResult(payload, adminUser);
      expect(result.publishedCount).toBe(1);
    });
  });

  describe("queryResults & getStudentResults", () => {
    it("queries results with batch, semester, and pagination filters", async () => {
      vi.mocked(prisma.result.findMany).mockResolvedValue([
        {
          id: "r1",
          batchId: "batch-52",
          semesterId: "sem-1",
          universityId: "2020101",
          gpa: 3.9,
          cgpa: 3.85,
          courseMarks: [],
          publishedAt: new Date(),
          student: { name: "Rahim Ahmed", email: "rahim@juniv.edu" },
          batch: { name: "52nd", program: "HONOURS" },
          semester: { name: "4th Year 1st Semester" },
        },
      ] as any);
      vi.mocked(prisma.result.count).mockResolvedValue(1);

      const res = await resultService.queryResults({
        batchId: "batch-52",
        semesterId: "sem-1",
        page: 1,
        limit: 10,
      });

      expect(res.results).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
      expect(res.results[0].universityId).toBe("2020101");
    });

    it("retrieves full semester result history for a given student", async () => {
      vi.mocked(prisma.result.findMany).mockResolvedValue([
        {
          id: "r1",
          semesterId: "sem-1",
          universityId: "2020101",
          gpa: 3.9,
          courseMarks: [],
          semester: { name: "1st Year 1st Semester" },
          batch: { name: "52nd" },
        },
        {
          id: "r2",
          semesterId: "sem-2",
          universityId: "2020101",
          gpa: 3.8,
          courseMarks: [],
          semester: { name: "1st Year 2nd Semester" },
          batch: { name: "52nd" },
        },
      ] as any);

      const history = await resultService.getStudentResults("2020101");
      expect(history).toHaveLength(2);
      expect(history[0].gpa).toBe(3.9);
      expect(history[1].gpa).toBe(3.8);
    });
  });
});
