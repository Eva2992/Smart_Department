import { createContext } from "react";
import type { AuthContextType } from "../types/auth.js";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
