import { prisma } from "../lib/prisma.js";
import type { PreloadedStudent, PreloadedTeacher, Program } from "@prisma/client";

export interface VerifyStudentParams {
  universityId: string;
  email?: string;
  batchId?: string;
  program?: Program;
}

export interface VerifyTeacherParams {
  teacherUniqueId: string;
  email: string;
}

export interface VerificationResult<T> {
  valid: boolean;
  error?: string;
  preloadedRecord?: T;
}

export class PreloadedService {
  /**
   * Verifies if a student exists in the preloaded roster and is not yet registered.
   */
  async verifyStudentRoster(params: VerifyStudentParams): Promise<VerificationResult<PreloadedStudent>> {
    const { universityId, email, batchId, program } = params;

    const preloaded = await prisma.preloadedStudent.findUnique({
      where: { universityId },
    });

    if (!preloaded) {
      return {
        valid: false,
        error: "Your information does not match our records. Please contact the department admin.",
      };
    }

    // Check if already registered
    const existingUser = await prisma.user.findUnique({
      where: { universityId },
    });

    if (existingUser) {
      return {
        valid: false,
        error: "An account is already registered with this university ID.",
      };
    }

    // Verify email match if provided
    if (email && email.trim().toLowerCase() !== preloaded.email.trim().toLowerCase()) {
      return {
        valid: false,
        error: "Email does not match preloaded record for this university ID.",
      };
    }

    // Verify batch match if provided
    if (batchId && batchId !== preloaded.batchId) {
      return {
        valid: false,
        error: "Batch does not match preloaded record.",
      };
    }

    // Verify program match if provided
    if (program && program !== preloaded.program) {
      return {
        valid: false,
        error: "Program does not match preloaded record.",
      };
    }

    return {
      valid: true,
      preloadedRecord: preloaded,
    };
  }

  /**
   * Verifies if a teacher exists in the preloaded roster and is not yet registered.
   */
  async verifyTeacherRoster(params: VerifyTeacherParams): Promise<VerificationResult<PreloadedTeacher>> {
    const { teacherUniqueId, email } = params;

    const preloaded = await prisma.preloadedTeacher.findUnique({
      where: { uniqueId: teacherUniqueId },
    });

    if (!preloaded) {
      return {
        valid: false,
        error: "Teacher ID not found in department roster. Please contact the department admin.",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { teacherUniqueId },
    });

    if (existingUser) {
      return {
        valid: false,
        error: "An account is already registered with this Teacher ID.",
      };
    }

    if (email.trim().toLowerCase() !== preloaded.email.trim().toLowerCase()) {
      return {
        valid: false,
        error: "Email does not match the official teacher record.",
      };
    }

    return {
      valid: true,
      preloadedRecord: preloaded,
    };
  }
}

export const preloadedService = new PreloadedService();
