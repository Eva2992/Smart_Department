import { useContext } from "react";
import { AuthContext } from "./authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      tokens: null,
      isLoading: false,
      isAuthenticated: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      changePassword: async () => ({ success: true, message: "" }),
      forgotPassword: async () => ({ success: true, message: "" }),
      resetPassword: async () => ({ success: true, message: "" }),
    };
  }
  return context;
}
