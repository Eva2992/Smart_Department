import path from "node:path";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { apiV1Router } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// Security and utility middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes mounting
app.use("/api/v1", apiV1Router);

// Catch-all 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export { app };
