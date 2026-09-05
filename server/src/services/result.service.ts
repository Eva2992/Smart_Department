import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { auditService } from "./audit.service.js";
import { Role, ResourceType } from "@prisma/client";
import { notificationService, NotificationType } from "./notification.service.js";
import type {
  CourseMarkItem,
  ParsedStudentResult,
  UploadResultPayload,
  ResultQueryParams,
  UploaderContext,
} from "../types/result.js";

/**
 * Mapping entry within the JU CSE Grading Scale.
 *
 * Associates a minimum percentage threshold with the corresponding
 * letter grade and numeric grade point on the 4.0 scale.
 */
export interface GradeScaleMapping {
  /** Minimum percentage score required for this grade (inclusive). */
  minPercentage: number;

  /** Official JU CSE letter grade (e.g. `"A+"`, `"B-"`, `"F"`). */
  letterGrade: string;

  /** Numeric grade point on the JU 4.0 scale. */
  gradePoint: number;
}

/**
 * Official Jahangirnagar University (JU) CSE Department Grading Scale.
 *
 * The scale maps percentage marks to letter grades and grade points,
 * ordered from highest to lowest threshold for first-match lookup:
 *
 * | Marks Range | Letter Grade | Grade Point |
 * |-------------|-------------|-------------|
 * | 80–100      | A+          | 4.00        |
 * | 75–79       | A           | 3.75        |
 * | 70–74       | A-          | 3.50        |
 * | 65–69       | B+          | 3.25        |
 * | 60–64       | B           | 3.00        |
 * | 55–59       | B-          | 2.75        |
 * | 50–54       | C+          | 2.50        |
 * | 45–49       | C           | 2.25        |
 * | 40–44       | D           | 2.00        |
 * | 0–39        | F           | 0.00        |
 *
 * @see {@link ResultService.getGradeFromMarks} for lookup usage.
 */
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

/**
 * Service handling semester final result processing, GPA calculation,
 * grade sheet parsing, and result publication with dual-hybrid persistence.
 *
 * Implements:
 * - **FR-25**: Result Upload by Class Representative (CR).
 * - **FR-26**: Public Result Page for student dashboard access.
 * - **ADR-0004 §3**: Dual-Hybrid Semester Result Storage — structured relational
 *   `Result` records paired with raw document archival in the {@link Resource} repository.
 *
 * @see {@link JU_GRADING_SCALE} for the official grading scale table.
 * @see {@link CourseMarkItem} for per-course mark structure.
 * @see {@link ParsedStudentResult} for parsed grade sheet row structure.
 */
export class ResultService {
  /**
   * Maps a numerical percentage score to the official JU CSE letter grade and grade point.
   *
   * Performs a linear scan of {@link JU_GRADING_SCALE} (ordered highest-first)
   * and returns the first match where `marks >= minPercentage`. Input is clamped
   * to the 0–100 range before lookup.
   *
   * @param marks - Percentage score (0–100). Values outside this range are clamped.
   * @returns Object containing the `letterGrade` (e.g. `"A+"`) and `gradePoint` (e.g. `4.0`).
   *
   * @example
   * ```ts
   * const service = new ResultService();
   * service.getGradeFromMarks(85);  // { letterGrade: "A+", gradePoint: 4.0 }
   * service.getGradeFromMarks(62);  // { letterGrade: "B",  gradePoint: 3.0 }
   * service.getGradeFromMarks(30);  // { letterGrade: "F",  gradePoint: 0.0 }
   * ```
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
   * Calculates the credit-weighted GPA from an array of course marks.
   *
   * Uses the standard credit-weighted formula:
   *
   * ```
   * GPA = Σ(gradePoint × creditHours) / Σ(creditHours)
   * ```
   *
   * Courses with zero or negative credit hours are excluded from the calculation.
   * The result is rounded to two decimal places.
   *
   * @param courseMarks - Array of {@link CourseMarkItem} entries with `gradePoint` and `creditHours`.
   * @returns Credit-weighted GPA rounded to 2 decimal places, or `0.0` if total credits are zero.
   *
   * @example
   * ```ts
   * const service = new ResultService();
   * const gpa = service.calculateGPA([
   *   { courseCode: "CSE 401", courseTitle: "AI", creditHours: 3, letterGrade: "A+", gradePoint: 4.0 },
   *   { courseCode: "CSE 402", courseTitle: "DB", creditHours: 3, letterGrade: "B+", gradePoint: 3.25 },
   * ]);
   * // gpa = (4.0*3 + 3.25*3) / (3+3) = 3.63
   * ```
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
   * Parses a CSV grade sheet string into validated structured student result rows.
   *
   * Expects a CSV format with:
   * - **Header row**: Must contain a column identifiable as University ID (via keywords
   *   `"university"`, `"id"`, or `"roll"`) and optionally a `"name"` column.
   * - **Data rows**: Each row represents one student's marks for the semester.
   * - **Course columns**: Matched against the provided `courseCatalog` by course code.
   *   Values can be numeric percentages (auto-mapped via {@link getGradeFromMarks})
   *   or direct letter grades (looked up in {@link JU_GRADING_SCALE}).
   *
   * @param csvContent - Raw CSV string content (supports `\r\n` and `\n` line endings).
   * @param courseCatalog - Array of course definitions with `code`, `title`, and `creditHours`
   *   used to identify and weight each course column.
   * @returns Array of {@link ParsedStudentResult} with computed GPA per student.
   * @throws {AppError} `INVALID_CSV_FORMAT` (400) if CSV has fewer than 2 lines.
   * @throws {AppError} `MISSING_ID_COLUMN` (400) if no University ID column is found in headers.
   * @throws {AppError} `VALIDATION_ERROR` (400) if any data row is missing a University ID.
   *
   * @example
   * ```ts
   * const service = new ResultService();
   * const catalog = [{ code: "CSE 401", title: "AI", creditHours: 3 }];
   * const results = service.parseAndValidateGradeSheet(
   *   "University ID,Name,CSE 401\n2021-001,Alice,85\n2021-002,Bob,62",
   *   catalog
   * );
   * // results[0].gpa = 4.0 (A+ for 85%), results[1].gpa = 3.0 (B for 62%)
   * ```
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
   * Publishes semester final results for a batch with dual-hybrid persistence (ADR-0004 §3).
   *
   * Implements two concurrent storage strategies within a single transaction:
   * 1. **Relational Result records**: Individual `Result` rows upserted per student's
   *    `universityId`, containing `gpa`, `cgpa`, and `courseMarks` JSON for personalized
   *    dashboard access (FR-26).
   * 2. **Resource archive**: The raw CSV/PDF grade sheet is stored as a {@link Resource}
   *    entry for full-batch download.
   *
   * After persistence, triggers batch-wide notifications (FR-31) and an audit log entry.
   *
   * @param payload - Upload payload containing batch/semester IDs, parsed student results,
   *   and optional raw file content for archival.
   * @param uploader - Authenticated user context for RBAC enforcement and audit trail.
   * @returns Object with `publishedCount`, `resourceArchived` flag, and batch/semester names.
   * @throws {AppError} `FORBIDDEN_BATCH_MISMATCH` (403) if CR attempts to upload for a different batch.
   * @throws {AppError} `BATCH_NOT_FOUND` (404) if the specified batch does not exist.
   * @throws {AppError} `SEMESTER_NOT_FOUND` (404) if the specified semester does not exist.
   * @throws {AppError} `SEMESTER_BATCH_MISMATCH` (400) if the semester does not belong to the batch.
   *
   * @example
   * ```ts
   * const result = await resultService.publishResult(
   *   {
   *     batchId: "batch-uuid",
   *     semesterId: "semester-uuid",
   *     results: [{ universityId: "2021-001", courseMarks: [...], gpa: 3.75 }],
   *     rawContent: "University ID,CSE401\n2021-001,85",
   *   },
   *   { id: "cr-user-uuid", role: "CR", batchId: "batch-uuid" }
   * );
   * // result.publishedCount = 1, result.resourceArchived = true
   * ```
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

    await auditService.logAction({
      userId: uploader.id,
      action: "RESULT_UPLOAD",
      entityType: "RESULT",
      entityId: payload.semesterId,
      details: {
        batchId: payload.batchId,
        semesterId: payload.semesterId,
        recordCount: createdResults.count,
      },
    });

    return {
      success: true,
      publishedCount: createdResults.count,
      resourceArchived: createdResults.resourceCreated,
      batchName: batch.name,
      semesterName: semester.name,
    };
  }

  /**
   * Queries published semester final results with paginated, multi-facet filtering.
   *
   * Supports filtering by batch, semester, program, university ID, and free-text search
   * across student name and university ID. Results include joined batch, semester,
   * student, and uploader details.
   *
   * Used by the public result page (FR-26) and authenticated student dashboards.
   *
   * @param params - Query parameters including filters and pagination.
   * @returns Object containing `results` array and `pagination` metadata.
   *
   * @example
   * ```ts
   * const data = await resultService.queryResults({
   *   batchId: "batch-uuid",
   *   search: "2021-001",
   *   page: 1,
   *   limit: 20,
   * });
   * // data.results — array of result records with student/batch/semester joins
   * // data.pagination — { page: 1, limit: 20, total: 45, totalPages: 3 }
   * ```
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
   * Fetches the full semester-wise result history for a specific student.
   *
   * Looks up results by either the student's `universityId` (roll number) or
   * the internal `studentId` (User UUID), returning all semesters in
   * reverse chronological order with batch and semester details.
   *
   * @param universityIdOrStudentId - Student's university ID (e.g. `"2021-001"`) or User UUID.
   * @returns Array of result records with joined batch, semester, and student profile data.
   *
   * @example
   * ```ts
   * const history = await resultService.getStudentResults("2021-001");
   * // history[0].gpa, history[0].semester.name, etc.
   * ```
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
   * Retrieves summary analytics for a specific batch and semester's published results.
   *
   * Computes aggregate statistics including average GPA, highest GPA, and pass rate
   * (percentage of students with GPA ≥ 2.0, i.e. grade D or above).
   *
   * @param batchId - Batch UUID to filter results.
   * @param semesterId - Semester UUID to filter results.
   * @returns Summary object with `totalStudents`, `averageGpa`, `highestGpa`, `passRate`,
   *   and the full `results` array, or `null` if no results exist for the combination.
   *
   * @example
   * ```ts
   * const summary = await resultService.getBatchSemesterSummary("batch-uuid", "semester-uuid");
   * // summary.averageGpa = 3.42, summary.passRate = 95.5, summary.totalStudents = 44
   * ```
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
