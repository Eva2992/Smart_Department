import type { Role, Program } from "@prisma/client";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  universityId?: string | null;
  teacherUniqueId?: string | null;
  batchId?: string | null;
  program?: Program | null;
  isChairman?: boolean;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion?: number;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role: Role;
  universityId?: string;
  teacherUniqueId?: string;
  batchId?: string;
  program?: Program;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  universityId: string | null;
  teacherUniqueId: string | null;
  batchId: string | null;
  program: Program | null;
  isChairman: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSessionResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
