import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z
    .string()
    .optional()
    .default("postgresql://postgres:postgres@localhost:5432/smart_department"),
  // DIRECT_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().default("smart_department_default_access_secret_2026"),
  JWT_REFRESH_SECRET: z.string().default("smart_department_default_refresh_secret_2026"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("*"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM: z.string().default("20220654963nirob@juniv.edu"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
