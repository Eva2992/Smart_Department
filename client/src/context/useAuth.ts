import { useContext } from "react";
import { AuthContext } from "./authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
