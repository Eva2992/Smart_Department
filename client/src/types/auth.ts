export type Role = "STUDENT" | "CR" | "TEACHER" | "ADMIN";
export type Program = "HONOURS" | "MASTERS" | "PMSCS" | "MPHIL" | "PHD";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  universityId?: string | null;
  teacherUniqueId?: string | null;
  batchId?: string | null;
  program?: Program | null;
  isChairman?: boolean;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    details?: unknown;
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  universityId?: string;
  teacherUniqueId?: string;
  batchId?: string;
  program?: Program;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<{ verificationToken?: string; message?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  changePassword: (data: ChangePasswordPayload) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
  resetPassword: (data: ResetPasswordPayload) => Promise<{ success: boolean; message: string }>;
}
