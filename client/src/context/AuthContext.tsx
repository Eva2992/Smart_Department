import {
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { AuthContext } from "./authContextDef.js";
import { apiClient } from "../api/client.js";
import type {
  User,
  AuthTokens,
  AuthContextType,
  LoginPayload,
  RegisterPayload,
  ApiResponse,
} from "../types/auth.js";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [tokens, setTokens] = useState<AuthTokens | null>(() => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync profile on mount
  useEffect(() => {
    async function loadUser() {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        try {
          const res = await apiClient.get<ApiResponse<User>>("/auth/me");
          if (res.data.success && res.data.data) {
            setUser(res.data.data);
            localStorage.setItem("user", JSON.stringify(res.data.data));
          }
        } catch {
          // Handled by axios interceptor
        }
      }
      setIsLoading(false);
    }

    loadUser();
  }, []);

  const login = async (credentials: LoginPayload): Promise<void> => {
    const res = await apiClient.post<
      ApiResponse<{ user: User; accessToken: string; refreshToken: string }>
    >("/auth/login", credentials);

    if (res.data.success && res.data.data) {
      const { user: loggedInUser, accessToken, refreshToken } = res.data.data;
      setUser(loggedInUser);
      setTokens({ accessToken, refreshToken });
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    }
  };

  const register = async (
    data: RegisterPayload
  ): Promise<{ verificationToken?: string; message?: string }> => {
    const res = await apiClient.post<
      ApiResponse<{ user: User; verificationToken: string }>
    >("/auth/register", data);

    return {
      verificationToken: res.data.data?.verificationToken,
      message: res.data.message,
    };
  };

  const verifyEmail = async (
    token: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<User>>("/auth/verify-email", {
      token,
    });
    return {
      success: res.data.success,
      message: res.data.message || "Email verified successfully",
    };
  };

  const resendVerification = async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<ApiResponse<{ verificationToken?: string }>>(
      "/auth/resend-verification",
      { email }
    );
    return {
      success: res.data.success,
      message: res.data.message || "Verification email sent",
    };
  };

  const logout = async (): Promise<void> => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Ignore logout network failure
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated: !!user && !!tokens,
    login,
    register,
    verifyEmail,
    resendVerification,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
