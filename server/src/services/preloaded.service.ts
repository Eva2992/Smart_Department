import { prisma } from "../lib/prisma.js";
import type { PreloadedStudent, PreloadedTeacher, Program } from "@prisma/client";

export interface VerifyStudentParams {
  universityId: string;
  email?: string;
  batchId?: string;
  program?: Program;
}

export interface VerifyTeacherParams {
  email: string;
  teacherUniqueId?: string;
}

export interface VerificationResult<T> {
  valid: boolean;
  error?: string;
  preloadedRecord?: T;
}

export class PreloadedService {
  /**
   * Verifies if a student exists in the preloaded roster and matches the admin-provided email.
   */
  async verifyStudentRoster(
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
        error: "Your University ID was not found in the department roster. Please contact the department admin.",
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
        error: "The provided email does not match the official department roster for this University ID.",
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
   * Verifies if a teacher exists in the preloaded roster by institutional email.
   */
  async verifyTeacherRoster(
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
        error: "This email address is not registered in the department faculty directory. Please contact the department admin.",
      };
    }

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
}

export const preloadedService = new PreloadedService();
