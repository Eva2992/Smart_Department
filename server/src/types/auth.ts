import type { Role, Program } from "@prisma/client";

/**
 * Decoded payload stored inside short-lived JWT access tokens (15-minute validity).
 *
 * Contains authenticated user claims required for route authorization, RBAC role checks,
 * and contextual student/teacher identification without secondary database lookups.
 *
 * @example
 * ```ts
 * const payload: AccessTokenPayload = {
 *   userId: "usr_101",
 *   email: "student@juniv.edu",
 *   role: "STUDENT",
 *   name: "Rahim Ahmed",
 *   universityId: "20220654901",
 *   batchId: "batch_52",
 *   program: "HONOURS",
 *   isChairman: false,
 * };
 * ```
 */
export interface AccessTokenPayload {
  /** Unique primary key identifier of the user in the database. */
  userId: string;

  /** Legacy alias for `userId` supported for backward compatibility. */
  id?: string;

  /** User's primary institutional email address. */
  email: string;

  /** System access role (`ADMIN`, `TEACHER`, `CR`, or `STUDENT`). */
  role: Role;

  /** Full display name of the user. */
  name: string;

  /** University student roll/registration ID (e.g., `'20220654955'`). */
  universityId?: string | null;

  /** Unique identifier for faculty members. */
  teacherUniqueId?: string | null;

  /** Unique identifier of the student's assigned academic batch cohort. */
  batchId?: string | null;

  /** Academic program of study (e.g., `HONOURS`, `MASTERS`). */
  program?: Program | null;

  /** Boolean flag indicating if a faculty member holds the Department Chairman designation. */
  isChairman?: boolean;
}

/**
 * Decoded payload stored inside long-lived JWT refresh tokens (7-day validity).
 *
 * @example
 * ```ts
 * const payload: RefreshTokenPayload = {
 *   userId: "usr_101",
 * };
 * ```
 */
export interface RefreshTokenPayload {
  /** Unique primary key identifier of the user who owns this session. */
  userId: string;

  /** Optional token version counter used for bulk session revocation. */
  tokenVersion?: number;
}

/**
 * Data transfer object submitted by users during registration (FR-01, AN-01, AN-02).
 *
 * Students supply their `universityId` and institutional `email` to verify against
 * the preloaded roster. `batchId` and `program` are auto-resolved from the roster (ADR-0006).
 * Teachers verify solely via institutional `email`. Public `ADMIN` registration is forbidden.
 *
 * @example
 * ```ts
 * const studentRegistration: RegisterDto = {
 *   name: "Fatima Khan",
 *   email: "fatima.52@juniv.edu",
 *   password: "securePassword123",
 *   role: "STUDENT",
 *   universityId: "20220654955",
 * };
 * ```
 */
export interface RegisterDto {
  /** Full legal name of the registrant. */
  name: string;

  /** Institutional university email address. */
  email: string;

  /** Plaintext password chosen by the user (minimum 8 characters). */
  password: string;

  /** Requested system access role (`STUDENT`, `CR`, or `TEACHER`). */
  role: Role;

  /** University registration ID required for student and CR registration. */
  universityId?: string;

  /** Optional faculty identifier. */
  teacherUniqueId?: string;

  /** Optional batch identifier (auto-derived from preloaded roster if omitted). */
  batchId?: string;

  /** Optional academic program (auto-derived from preloaded roster if omitted). */
  program?: Program;
}

/**
 * Data transfer object submitted for user authentication (FR-03).
 *
 * @example
 * ```ts
 * const credentials: LoginDto = {
 *   email: "teacher@juniv.edu",
 *   password: "facultySecretPassword",
 * };
 * ```
 */
export interface LoginDto {
  /** User's registered institutional email address. */
  email: string;

  /** User's plaintext password for credential verification. */
  password: string;
}

/**
 * Sanitized user entity representation returned to client consumers.
 *
 * Strips sensitive internal fields including `passwordHash`, `verificationToken`,
 * and temporary lockout tokens.
 *
 * @example
 * ```ts
 * const profile: UserResponse = {
 *   id: "usr_202",
 *   name: "Dr. Anisur Rahman",
 *   email: "anis@juniv.edu",
 *   role: "TEACHER",
 *   universityId: null,
 *   teacherUniqueId: "T-042",
 *   batchId: null,
 *   program: null,
 *   isChairman: true,
 *   isVerified: true,
 *   createdAt: new Date("2026-01-15T08:00:00Z"),
 *   updatedAt: new Date("2026-02-01T10:30:00Z"),
 * };
 * ```
 */
export interface UserResponse {
  /** Unique primary key identifier of the user. */
  id: string;

  /** Full display name of the user. */
  name: string;

  /** User's institutional email address. */
  email: string;

  /** User's access role in the system. */
  role: Role;

  /** University student ID, or `null` for faculty/admin. */
  universityId: string | null;

  /** Teacher unique ID, or `null` for students. */
  teacherUniqueId: string | null;

  /** Assigned batch ID, or `null` for faculty/admin. */
  batchId: string | null;

  /** Academic program, or `null` for non-students. */
  program: Program | null;

  /** True if the user is a teacher serving as the Department Chairman. */
  isChairman: boolean;

  /** Indicates whether the account is verified and active (always true per ADR-0006). */
  isVerified: boolean;

  /** Timestamp when the account was registered. */
  createdAt: Date;

  /** Timestamp when the account details were last updated. */
  updatedAt: Date;
}

/**
 * Pair of JSON Web Tokens issued upon successful login, registration, or token refresh.
 *
 * @example
 * ```ts
 * const tokens: AuthTokens = {
 *   accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 * };
 * ```
 */
export interface AuthTokens {
  /** Short-lived JWT access token (15-minute validity) passed in the `Authorization: Bearer` header. */
  accessToken: string;

  /** Long-lived JWT refresh token (7-day validity) stored hashed in the database. */
  refreshToken: string;
}

/**
 * Comprehensive authentication session response returned upon login or registration.
 *
 * @example
 * ```ts
 * const session: AuthSessionResponse = {
 *   user: userProfile,
 *   tokens: sessionTokens,
 * };
 * ```
 */
export interface AuthSessionResponse {
  /** The authenticated user's sanitized profile. */
  user: UserResponse;

  /** The issued access and refresh token pair. */
  tokens: AuthTokens;
}

/**
 * Data transfer object for updating the authenticated user's password (FR-04).
 *
 * @example
 * ```ts
 * const changeRequest: ChangePasswordDto = {
 *   currentPassword: "oldPassword123",
 *   newPassword: "newSecurePassword456",
 *   confirmPassword: "newSecurePassword456",
 * };
 * ```
 */
export interface ChangePasswordDto {
  /** Current password for identity verification. */
  currentPassword: string;

  /** New password meeting the minimum 8-character length policy. */
  newPassword: string;

  /** Confirmation string identical to `newPassword`. */
  confirmPassword: string;
}

/**
 * Data transfer object for initiating a self-service password reset request (FR-05).
 *
 * @example
 * ```ts
 * const request: ForgotPasswordDto = {
 *   email: "user@juniv.edu",
 * };
 * ```
 */
export interface ForgotPasswordDto {
  /** Institutional email address associated with the account. */
  email: string;
}

/**
 * Data transfer object for finalizing password reset using a single-use token (FR-05).
 *
 * @example
 * ```ts
 * const resetRequest: ResetPasswordDto = {
 *   token: "c3f8a9e1b2d4...",
 *   newPassword: "freshPassword789",
 *   confirmPassword: "freshPassword789",
 * };
 * ```
 */
export interface ResetPasswordDto {
  /** Cryptographically generated single-use reset token from the reset URL. */
  token: string;

  /** New password meeting the minimum 8-character length policy. */
  newPassword: string;

  /** Confirmation string identical to `newPassword`. */
  confirmPassword: string;
}
