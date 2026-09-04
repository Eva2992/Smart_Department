import { prisma } from "../lib/prisma.js";
import type { PreloadedStudent, PreloadedTeacher, Program } from "@prisma/client";

export type { PreloadedStudent, PreloadedTeacher, Program };

/**
 * Parameter criteria for validating a prospective student or CR against the preloaded roster (AN-01).
 *
 * @example
 * ```ts
 * const params: VerifyStudentParams = {
 *   universityId: "20220654955",
 *   email: "student@juniv.edu",
 * };
 * ```
 */
export interface VerifyStudentParams {
  /** Unique university registration number/roll assigned by JU. */
  universityId: string;

  /** Institutional email provided during registration to match against preloaded roster. */
  email?: string;

  /** Optional academic batch identifier. */
  batchId?: string;

  /** Optional academic program degree. */
  program?: Program;
}

/**
 * Parameter criteria for validating a prospective faculty member against the preloaded directory (AN-02).
 *
 * @example
 * ```ts
 * const params: VerifyTeacherParams = {
 *   email: "faculty@juniv.edu",
 * };
 * ```
 */
export interface VerifyTeacherParams {
  /** Institutional email address of the faculty member. */
  email: string;

  /** Optional legacy unique faculty code. */
  teacherUniqueId?: string;
}

/**
 * Standardized outcome envelope returned by preloaded roster verification operations.
 *
 * @typeParam T - The preloaded record entity type (`PreloadedStudent` or `PreloadedTeacher`).
 *
 * @example
 * ```ts
 * const result: VerificationResult<PreloadedStudent> = {
 *   valid: true,
 *   preloadedRecord: studentRecord,
 * };
 * ```
 */
export interface VerificationResult<T> {
  /** `true` if verification succeeded; `false` if not found or already registered. */
  valid: boolean;

  /** Human-readable explanation if verification failed. */
  error?: string;

  /** The matched preloaded record from the database if verification succeeded. */
  preloadedRecord?: T;
}

/**
 * Preloaded Roster Management and Identity Verification Service.
 *
 * Provides authoritative verification for student and faculty account registrations:
 * - Validates student University IDs and matched institutional emails against preloaded cohorts (AN-01).
 * - Auto-derives batch and academic program directly from preloaded student records (ADR-0006).
 * - Validates teacher registrations against the faculty directory by email (AN-02).
 * - Supports administrative bulk ingestion and paginated browsing of preloaded records.
 */
export class PreloadedService {
  /**
   * Verifies whether a student exists in the preloaded roster and matches the admin-provided email (AN-01).
   *
   * Checks:
   * 1. Existence of `universityId` in the `PreloadedStudent` table.
   * 2. Absence of an already registered account with this `universityId` or `email`.
   * 3. Exact match between provided `email` and the preloaded record's email.
   * 4. Consistency with optional `batchId` and `program` if supplied.
   *
   * @param params - Verification criteria containing `universityId` and institutional `email`.
   * @returns A {@link VerificationResult} containing `valid: true` and the matched {@link PreloadedStudent} record on success.
   *
   * @example
   * ```ts
   * const check = await preloadedService.verifyStudentRoster({
   *   universityId: "20220654955",
   *   email: "student@juniv.edu",
   * });
   * if (!check.valid) {
   *   throw new Error(check.error);
   * }
   * ```
   */
  public async verifyStudentRoster(
    params: VerifyStudentParams
  ): Promise<VerificationResult<PreloadedStudent>> {
    const { universityId, email, batchId, program } = params;
    const normalizedEmail = email ? email.trim().toLowerCase() : undefined;

    const preloaded = await prisma.preloadedStudent.findUnique({
      where: { universityId: universityId.trim() },
    });

    if (!preloaded) {
      return {
        valid: false,
        error:
          "Your University ID was not found in the department roster. Please contact the department admin.",
      };
    }

    // Check if university ID or email is already registered
    const orConditions: Array<{ universityId: string } | { email: string }> = [
      { universityId: universityId.trim() },
    ];
    if (normalizedEmail) {
      orConditions.push({ email: normalizedEmail });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (existingUser) {
      return {
        valid: false,
        error: "An account is already registered with this University ID or Email address.",
      };
    }

    // Verify email matches the one provided by admin
    if (normalizedEmail && normalizedEmail !== preloaded.email.trim().toLowerCase()) {
      return {
        valid: false,
        error:
          "The provided email does not match the official department roster for this University ID.",
      };
    }

    // Optional batch check if provided
    if (batchId && batchId !== preloaded.batchId) {
      return {
        valid: false,
        error: "Selected batch does not match the department roster.",
      };
    }

    // Optional program check if provided
    if (program && program !== preloaded.program) {
      return {
        valid: false,
        error: "Selected program does not match the department roster.",
      };
    }

    return {
      valid: true,
      preloadedRecord: preloaded,
    };
  }

  /**
   * Verifies whether a faculty member exists in the preloaded teacher directory by email (AN-02, ADR-0006).
   *
   * Verifies:
   * 1. Existence of the normalized email in `PreloadedTeacher` directory.
   * 2. Absence of an existing registered account with the same email.
   *
   * @param params - Verification criteria containing the faculty member's institutional email.
   * @returns A {@link VerificationResult} containing `valid: true` and the matched {@link PreloadedTeacher} record on success.
   *
   * @example
   * ```ts
   * const check = await preloadedService.verifyTeacherRoster({
   *   email: "teacher@juniv.edu",
   * });
   * if (!check.valid) {
   *   throw new Error(check.error);
   * }
   * ```
   */
  public async verifyTeacherRoster(
    params: VerifyTeacherParams
  ): Promise<VerificationResult<PreloadedTeacher>> {
    const { email } = params;
    const normalizedEmail = email.trim().toLowerCase();

    const preloaded = await prisma.preloadedTeacher.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (!preloaded) {
      return {
        valid: false,
        error:
          "This email address is not registered in the department faculty directory. Please contact the department admin.",
      };
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        valid: false,
        error: "An account is already registered with this faculty email address.",
      };
    }

    return {
      valid: true,
      preloadedRecord: preloaded,
    };
  }

  /**
   * Bulk imports or updates preloaded student records within a database transaction (AN-01).
   *
   * Validates that all referenced `batchId` records exist before upserting by `universityId`
   * and records an audit log entry on success.
   *
   * @param students - Array of student records containing universityId, name, email, batchId, and program.
   * @param adminUserId - Optional identifier of the administrator executing the import.
   * @param ipAddress - Optional client IP address for the audit log trail.
   * @returns An object containing the count of successfully created/updated student records.
   * @throws {Error} Thrown if any referenced `batchId` cannot be found in the database.
   *
   * @example
   * ```ts
   * const result = await preloadedService.bulkCreateStudents([
   *   {
   *     universityId: "20220654901",
   *     name: "Tanvir Ahmed",
   *     email: "tanvir.52@juniv.edu",
   *     batchId: "batch_52",
   *     program: "HONOURS",
   *   },
   * ], adminId, "192.168.1.1");
   * ```
   */
  public async bulkCreateStudents(
    students: Array<{
      universityId: string;
      name: string;
      email: string;
      batchId: string;
      program: Program;
    }>,
    adminUserId?: string,
    ipAddress?: string
  ): Promise<{ createdCount: number }> {
    if (!students || students.length === 0) {
      return { createdCount: 0 };
    }

    let createdCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of students) {
        // Validate batch exists
        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });
        if (!batch) {
          throw new Error(`Batch '${item.batchId}' not found`);
        }

        await tx.preloadedStudent.upsert({
          where: { universityId: item.universityId },
          create: {
            universityId: item.universityId,
            name: item.name,
            email: item.email.trim().toLowerCase(),
            batchId: item.batchId,
            program: item.program,
          },
          update: {
            name: item.name,
            email: item.email.trim().toLowerCase(),
            batchId: item.batchId,
            program: item.program,
          },
        });
        createdCount++;
      }

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: "PRELOADED_STUDENTS_IMPORT",
            entityType: "PRELOADED_STUDENT",
            entityId: "BULK",
            ipAddress: ipAddress || "127.0.0.1",
            details: { count: createdCount },
          },
        });
      }
    });

    return { createdCount };
  }

  /**
   * Retrieves paginated preloaded student records with optional cohort, program, and keyword filtering.
   *
   * @param params - Search and pagination options including `batchId`, `program`, `search`, `page`, and `limit`.
   * @returns Paginated result object containing student list, total count, and page numbers.
   *
   * @example
   * ```ts
   * const pageData = await preloadedService.getPreloadedStudents({
   *   batchId: "batch_52",
   *   page: 1,
   *   limit: 25,
   * });
   * ```
   */
  public async getPreloadedStudents(params: {
    batchId?: string;
    program?: Program;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.batchId) where.batchId = params.batchId;
    if (params.program) where.program = params.program;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { universityId: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.preloadedStudent.findMany({
        where,
        skip,
        take: limit,
        include: { batch: { select: { id: true, name: true } } },
        orderBy: { universityId: "asc" },
      }),
      prisma.preloadedStudent.count({ where }),
    ]);

    return {
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Bulk imports or updates preloaded faculty directory entries within a transaction (AN-02).
   *
   * Upserts records by `uniqueId` and captures an administrative audit trail.
   *
   * @param teachers - Array of faculty records containing uniqueId, name, email, designation, and chairman status.
   * @param adminUserId - Optional identifier of the administrator performing the bulk import.
   * @param ipAddress - Optional client IP address for audit logging.
   * @returns An object containing the count of successfully created/updated faculty records.
   *
   * @example
   * ```ts
   * const result = await preloadedService.bulkCreateTeachers([
   *   {
   *     uniqueId: "T-101",
   *     name: "Dr. Mohammad Zahir",
   *     email: "zahir@juniv.edu",
   *     designation: "Professor",
   *     isChairman: true,
   *   },
   * ], adminId);
   * ```
   */
  public async bulkCreateTeachers(
    teachers: Array<{
      uniqueId: string;
      name: string;
      email: string;
      designation: string;
      isChairman?: boolean;
    }>,
    adminUserId?: string,
    ipAddress?: string
  ): Promise<{ createdCount: number }> {
    if (!teachers || teachers.length === 0) {
      return { createdCount: 0 };
    }

    let createdCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of teachers) {
        await tx.preloadedTeacher.upsert({
          where: { uniqueId: item.uniqueId },
          create: {
            uniqueId: item.uniqueId,
            name: item.name,
            email: item.email.trim().toLowerCase(),
            designation: item.designation,
            isChairman: Boolean(item.isChairman),
          },
          update: {
            name: item.name,
            email: item.email.trim().toLowerCase(),
            designation: item.designation,
            isChairman: Boolean(item.isChairman),
          },
        });
        createdCount++;
      }

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: "PRELOADED_TEACHERS_IMPORT",
            entityType: "PRELOADED_TEACHER",
            entityId: "BULK",
            ipAddress: ipAddress || "127.0.0.1",
            details: { count: createdCount },
          },
        });
      }
    });

    return { createdCount };
  }

  /**
   * Retrieves paginated preloaded faculty records with optional keyword search.
   *
   * @param params - Search and pagination options (`search`, `page`, `limit`).
   * @returns Paginated result object containing faculty list, total count, and page numbers.
   *
   * @example
   * ```ts
   * const teachers = await preloadedService.getPreloadedTeachers({
   *   search: "Professor",
   *   page: 1,
   *   limit: 20,
   * });
   * ```
   */
  public async getPreloadedTeachers(params: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { uniqueId: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { designation: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [teachers, total] = await Promise.all([
      prisma.preloadedTeacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uniqueId: "asc" },
      }),
      prisma.preloadedTeacher.count({ where }),
    ]);

    return {
      teachers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

/**
 * Singleton instance of {@link PreloadedService} exported for roster verification and management.
 */
export const preloadedService = new PreloadedService();
