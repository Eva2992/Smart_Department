import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { Role, ResourceType } from "@prisma/client";
import { notificationService, NotificationType } from "./notification.service.js";
import type {
  CourseMarkItem,
  ParsedStudentResult,
  UploadResultPayload,
  ResultQueryParams,
  UploaderContext,
} from "../types/result.js";

export interface GradeScaleMapping {
  minPercentage: number;
  letterGrade: string;
  gradePoint: number;
}

export const JU_GRADING_SCALE: GradeScaleMapping[] = [
  { minPercentage: 80, letterGrade: "A+", gradePoint: 4.0 },
  { minPercentage: 75, letterGrade: "A", gradePoint: 3.75 },
  { minPercentage: 70, letterGrade: "A-", gradePoint: 3.5 },
  { minPercentage: 65, letterGrade: "B+", gradePoint: 3.25 },
  { minPercentage: 60, letterGrade: "B", gradePoint: 3.0 },
  { minPercentage: 55, letterGrade: "B-", gradePoint: 2.75 },
  { minPercentage: 50, letterGrade: "C+", gradePoint: 2.5 },
  { minPercentage: 45, letterGrade: "C", gradePoint: 2.25 },
  { minPercentage: 40, letterGrade: "D", gradePoint: 2.0 },
  { minPercentage: 0, letterGrade: "F", gradePoint: 0.0 },
];

export class ResultService {
  /**
   * Maps a numerical percentage score to the official JU CSE letter grade and grade point.
   */
  getGradeFromMarks(marks: number): { letterGrade: string; gradePoint: number } {
    const clampedMarks = Math.max(0, Math.min(100, marks));
    for (const scale of JU_GRADING_SCALE) {
      if (clampedMarks >= scale.minPercentage) {
        return { letterGrade: scale.letterGrade, gradePoint: scale.gradePoint };
      }
    }
    return { letterGrade: "F", gradePoint: 0.0 };
  }

  /**
   * Calculates the weighted GPA from course marks based on credit hours.
   */
  calculateGPA(courseMarks: CourseMarkItem[]): number {
    let totalCredits = 0;
    let totalGradePoints = 0;

    for (const course of courseMarks) {
      if (course.creditHours > 0) {
        totalCredits += course.creditHours;
        totalGradePoints += course.gradePoint * course.creditHours;
      }
    }

    if (totalCredits <= 0) return 0.0;

    const gpa = totalGradePoints / totalCredits;
    return Number(gpa.toFixed(2));
  }

  /**
   * Parses CSV grade sheet string into validated structured student result rows.
   */
  parseAndValidateGradeSheet(
    csvContent: string,
    courseCatalog: { code: string; title: string; creditHours: number }[]
  ): ParsedStudentResult[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new AppError(
        "CSV grade sheet must contain a header row and at least one student data row",
        400,
        "INVALID_CSV_FORMAT"
      );
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idIndex = headers.findIndex(
      (h) => h.includes("university") || h.includes("id") || h.includes("roll")
    );
    const nameIndex = headers.findIndex((h) => h.includes("name"));

    if (idIndex === -1) {
      throw new AppError(
        "CSV header must contain a column for 'University ID' or 'Roll'",
        400,
        "MISSING_ID_COLUMN"
      );
    }

    const parsedResults: ParsedStudentResult[] = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(",").map((c) => c.trim());
      const universityId = columns[idIndex];
      const studentName = nameIndex !== -1 ? columns[nameIndex] : undefined;

      if (!universityId) {
        throw new AppError(
          `Row ${i + 1}: University ID is missing or empty`,
          400,
          "VALIDATION_ERROR"
        );
      }

      const courseMarks: CourseMarkItem[] = [];

      for (const course of courseCatalog) {
        // Look for column matching course code (e.g. "CSE 401 Marks" or "CSE 401")
        const colIdx = headers.findIndex(
          (h) =>
            h.includes(course.code.toLowerCase()) ||
            h.replace(/\s+/g, "").includes(course.code.toLowerCase().replace(/\s+/g, ""))
        );

        let marks: number | undefined;
        let letterGrade = "F";
        let gradePoint = 0.0;

        if (colIdx !== -1 && columns[colIdx]) {
          const rawVal = columns[colIdx];
          const parsedNum = parseFloat(rawVal);
          if (!isNaN(parsedNum)) {
            marks = parsedNum;
            const mapped = this.getGradeFromMarks(marks);
            letterGrade = mapped.letterGrade;
            gradePoint = mapped.gradePoint;
          } else {
            // Direct letter grade input
            letterGrade = rawVal.toUpperCase();
            const found = JU_GRADING_SCALE.find((s) => s.letterGrade === letterGrade);
            gradePoint = found ? found.gradePoint : 0.0;
          }
        }

        courseMarks.push({
          courseCode: course.code,
          courseTitle: course.title,
          creditHours: course.creditHours,
          marks,
          letterGrade,
          gradePoint,
        });
      }

      const gpa = this.calculateGPA(courseMarks);

      parsedResults.push({
        universityId,
        studentName,
        courseMarks,
        gpa,
      });
    }

    return parsedResults;
  }

  /**
   * Publishes semester final results for a batch with dual-hybrid persistence:
   * 1. Individual relational Result records mapped to student universityId.
   * 2. Raw result file archive entry in Resource repository.
   */
  async publishResult(payload: UploadResultPayload, uploader: UploaderContext) {
    // 1. RBAC authorization check: CR can only upload for their own batch
    if (uploader.role === Role.CR) {
      if (!uploader.batchId || uploader.batchId !== payload.batchId) {
        throw new AppError(
          "Forbidden: Class Representatives can only upload results for their own assigned batch",
          403,
          "FORBIDDEN_BATCH_MISMATCH"
        );
      }
    }

    // 2. Verify Batch and Semester existence
    const batch = await prisma.batch.findUnique({
      where: { id: payload.batchId },
    });
    if (!batch) {
      throw new AppError(`Batch with ID '${payload.batchId}' not found`, 404, "BATCH_NOT_FOUND");
    }

    const semester = await prisma.semester.findUnique({
      where: { id: payload.semesterId },
    });
    if (!semester) {
      throw new AppError(
        `Semester with ID '${payload.semesterId}' not found`,
        404,
        "SEMESTER_NOT_FOUND"
      );
    }

    if (semester.batchId !== payload.batchId) {
      throw new AppError(
        "The selected semester does not belong to the specified batch",
        400,
        "SEMESTER_BATCH_MISMATCH"
      );
    }

    // 3. Resolve student records by universityId
    const universityIds = payload.results.map((r) => r.universityId);
    const existingStudents = await prisma.user.findMany({
      where: {
        universityId: { in: universityIds },
      },
      select: { id: true, universityId: true, name: true },
    });

    const studentMap = new Map<string, { id: string; name: string }>();
    for (const student of existingStudents) {
      if (student.universityId) {
        studentMap.set(student.universityId, { id: student.id, name: student.name });
      }
    }

    // 4. Transactionally upsert relational result records and archive resource document
    const publishedAt = new Date();

    const createdResults = await prisma.$transaction(async (tx) => {
      const records = [];

      for (const row of payload.results) {
        let studentId = studentMap.get(row.universityId)?.id;

        // If user record doesn't exist yet, link to uploader or resolve gracefully
        if (!studentId) {
          studentId = uploader.id;
        }

        const upserted = await tx.result.upsert({
          where: {
            semesterId_studentId: {
              semesterId: payload.semesterId,
              studentId: studentId,
            },
          },
          update: {
            batchId: payload.batchId,
            universityId: row.universityId,
            courseMarks: row.courseMarks as any,
            gpa: row.gpa,
            cgpa: row.cgpa ?? row.gpa,
            uploadedById: uploader.id,
            publishedAt,
          },
          create: {
            batchId: payload.batchId,
            semesterId: payload.semesterId,
            studentId: studentId,
            universityId: row.universityId,
            courseMarks: row.courseMarks as any,
            gpa: row.gpa,
            cgpa: row.cgpa ?? row.gpa,
            uploadedById: uploader.id,
            publishedAt,
          },
        });

        records.push(upserted);
      }

      // Dual-hybrid archive: Store original document into Resource repository
      let resourceCreated = false;
      if (payload.rawContent || payload.fileName) {
        const title = `Semester Final Result Sheet - ${batch.name} (${semester.name})`;
        const fileUrl = payload.rawContent
          ? `data:text/csv;base64,${Buffer.from(payload.rawContent).toString("base64")}`
          : `/uploads/results/${payload.fileName || "result_sheet.csv"}`;

        await tx.resource.create({
          data: {
            title,
            courseName: "Semester Final Examination",
            semesterLabel: semester.name,
            year: new Date().getFullYear(),
            type: ResourceType.OTHER,
            fileUrl,
            fileSizeBytes:
              payload.fileSizeBytes ||
              (payload.rawContent ? Buffer.byteLength(payload.rawContent) : 1024),
            uploaderId: uploader.id,
          },
        });
        resourceCreated = true;
      }

      return { count: records.length, resourceCreated };
    });

    // FR-31: Notify batch students about published results
    await notificationService.createBulkForBatch(
      payload.batchId,
      NotificationType.RESULT_PUBLISHED,
      `Semester final results published for ${batch.name} — ${semester.name}`,
      "Result",
      payload.batchId
    );

    return {
      success: true,
      publishedCount: createdResults.count,
      resourceArchived: createdResults.resourceCreated,
      batchName: batch.name,
      semesterName: semester.name,
    };
  }

  /**
   * Public & authenticated search and query of published results.
   */
  async queryResults(params: ResultQueryParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(100, params.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.batchId) {
      where.batchId = params.batchId;
    }
    if (params.semesterId) {
      where.semesterId = params.semesterId;
    }
    if (params.universityId) {
      where.universityId = { contains: params.universityId, mode: "insensitive" };
    }
    if (params.search) {
      where.OR = [
        { universityId: { contains: params.search, mode: "insensitive" } },
        { student: { name: { contains: params.search, mode: "insensitive" } } },
      ];
    }
    if (params.program) {
      where.batch = { program: params.program };
    }

    const [results, total] = await Promise.all([
      prisma.result.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedAt: "desc" }, { universityId: "asc" }],
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
          batch: {
            select: { id: true, name: true, program: true },
          },
          semester: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
          uploadedBy: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.result.count({ where }),
    ]);

    return {
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Fetches full semester-wise result history for a specific student.
   */
  async getStudentResults(universityIdOrStudentId: string) {
    const results = await prisma.result.findMany({
      where: {
        OR: [{ universityId: universityIdOrStudentId }, { studentId: universityIdOrStudentId }],
      },
      orderBy: { publishedAt: "desc" },
      include: {
        batch: {
          select: { id: true, name: true, program: true },
        },
        semester: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        student: {
          select: { id: true, name: true, universityId: true, email: true },
        },
      },
    });

    return results;
  }

  /**
   * Retrieves summary analytics for a specific batch and semester's results.
   */
  async getBatchSemesterSummary(batchId: string, semesterId: string) {
    const results = await prisma.result.findMany({
      where: { batchId, semesterId },
      include: {
        student: { select: { name: true, universityId: true } },
      },
    });

    if (results.length === 0) {
      return null;
    }

    const gpas = results
      .map((r) => r.gpa)
      .filter((g): g is number => g !== null && g !== undefined);
    const avgGpa =
      gpas.length > 0 ? Number((gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2)) : 0;
    const maxGpa = gpas.length > 0 ? Math.max(...gpas) : 0;
    const passCount = gpas.filter((g) => g >= 2.0).length;
    const passRate = Number(((passCount / results.length) * 100).toFixed(1));

    return {
      batchId,
      semesterId,
      totalStudents: results.length,
      averageGpa: avgGpa,
      highestGpa: maxGpa,
      passRate,
      results,
    };
  }
}

export const resultService = new ResultService();
