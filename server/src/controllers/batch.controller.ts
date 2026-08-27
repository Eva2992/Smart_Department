import type { Request, Response } from "express";
import { batchService } from "../services/batch.service.js";
import { createBatchSchema } from "../validators/academic.validator.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import type { Program, BatchStatus } from "@prisma/client";

export class BatchController {
  async createBatch(req: Request, res: Response) {
    const validated = createBatchSchema.parse(req.body);
    const batch = await batchService.createBatch(validated);
    return sendCreated(res, batch, "Batch created successfully");
  }

  async getBatches(req: Request, res: Response) {
    const { program, status, search } = req.query;
    const batches = await batchService.getBatches({
      program: program ? (program as Program) : undefined,
      status: status ? (status as BatchStatus) : undefined,
      search: search ? String(search) : undefined,
    });
    return sendSuccess(res, batches);
  }

  async getBatchById(req: Request, res: Response) {
    const id = req.params.id as string;
    const batch = await batchService.getBatchById(id);
    return sendSuccess(res, batch);
  }
}

export const batchController = new BatchController();
