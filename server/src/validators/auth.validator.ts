import { z } from "zod";

/**
 * Zod validation schema for user account registration (FR-01, AN-01, AN-02, ADR-0006).
 *
 * Validates registration payloads for incoming user registration requests.
 *
 * Enforces:
 * - Minimum 2-character display name.
 * - Standard institutional email address format.
 * - Minimum 8-character password with matching confirmation field.
 * - Role restricted to `'STUDENT'`, `'CR'`, or `'TEACHER'` (public `'ADMIN'` registration is prohibited).
 * - Optional preloaded verification identifiers (`universityId`, `teacherUniqueId`, `batchId`, `program`).
 *
 * @example
 * ```ts
 * const parsed = registerSchema.parse({
 *   name: "Tariqul Islam",
 *   email: "tariqul.52@juniv.edu",
 *   password: "mypassword123",
 *   confirmPassword: "mypassword123",
 *   role: "STUDENT",
 *   universityId: "20220654920",
 * });
 * ```
 */
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
    role: z.enum(["STUDENT", "CR", "TEACHER"], {
      message: "Role must be Student, CR, or Teacher",
    }),
    universityId: z.string().trim().optional(),
    teacherUniqueId: z.string().trim().optional(),
    batchId: z.string().trim().optional(),
    program: z.enum(["HONOURS", "MASTERS", "PMSCS", "MPHIL", "PHD"]).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Zod validation schema for user authentication credentials (FR-03).
 *
 * Validates login request bodies, ensuring an institutional email address and non-empty password string are provided.
 *
 * @example
 * ```ts
 * const credentials = loginSchema.parse({
 *   email: "teacher@juniv.edu",
 *   password: "secretPassword",
 * });
 * ```
 */
export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Zod validation schema for token refresh requests (NFR-08).
 *
 * Validates token rotation payloads, requiring a non-empty raw JWT refresh token string.
 *
 * @example
 * ```ts
 * const payload = refreshTokenSchema.parse({
 *   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 * });
 * ```
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required"),
});

/**
 * Zod validation schema for password updates by authenticated users (FR-04).
 *
 * Validates password change requests. Requires current password, a new password
 * of at least 8 characters, and an exact match with the confirmation password field.
 *
 * @example
 * ```ts
 * const payload = changePasswordSchema.parse({
 *   currentPassword: "oldPassword123",
 *   newPassword: "newSecurePassword456",
 *   confirmPassword: "newSecurePassword456",
 * });
 * ```
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Zod validation schema for requesting a password reset email (FR-05).
 *
 * Validates self-service password reset requests, ensuring a syntactically valid institutional email address.
 *
 * @example
 * ```ts
 * const payload = forgotPasswordSchema.parse({
 *   email: "student@juniv.edu",
 * });
 * ```
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

/**
 * Zod validation schema for completing password reset via single-use token (FR-05).
 *
 * Validates password reset redemption requests. Requires the single-use reset token string,
 * a new password satisfying the 8-character minimum policy, and an exact match with confirmation password.
 *
 * @example
 * ```ts
 * const payload = resetPasswordSchema.parse({
 *   token: "a1b2c3d4e5f6...",
 *   newPassword: "freshPassword123",
 *   confirmPassword: "freshPassword123",
 * });
 * ```
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
