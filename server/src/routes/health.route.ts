import { Router } from "express";
import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: "1.0.0",
  };

  sendSuccess(res, healthData, "JU CSE Smart Schedular API is healthy");
});

export const healthRouter = router;
