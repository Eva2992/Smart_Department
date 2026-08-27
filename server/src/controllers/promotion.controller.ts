import type { Request, Response } from "express";
import { promotionService } from "../services/promotion.service.js";
import {
  requestPromotionSchema,
  promoteBatchSchema,
  rejectPromotionSchema,
} from "../validators/academic.validator.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import type { PromotionStatus } from "@prisma/client";

export class PromotionController {
  async requestPromotion(req: Request, res: Response) {
    const validated = requestPromotionSchema.parse(req.body);
    const crUser = req.user!;
    const request = await promotionService.requestPromotion(validated, crUser);
    return sendCreated(res, request, "Promotion request submitted successfully");
  }

  async promoteBatch(req: Request, res: Response) {
    const batchId = req.params.id as string;
    const validated = promoteBatchSchema.parse(req.body);
    const adminUser = req.user!;
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";

    const result = await promotionService.promoteBatch(
      {
        batchId,
        ...validated,
      },
      adminUser.userId,
      ipAddress
    );

    return sendSuccess(res, result, result.message);
  }

  async rejectPromotion(req: Request, res: Response) {
    const id = req.params.id as string;
    const validated = rejectPromotionSchema.parse(req.body);
    const adminUser = req.user!;

    const rejected = await promotionService.rejectPromotion(id, validated.reason, adminUser.userId);
    return sendSuccess(res, rejected, "Promotion request rejected");
  }

  async getPromotionRequests(req: Request, res: Response) {
    const { status, batchId } = req.query;
    const requests = await promotionService.getPromotionRequests({
      status: status ? (status as PromotionStatus) : undefined,
      batchId: batchId ? String(batchId) : undefined,
    });
    return sendSuccess(res, requests);
  }
}

export const promotionController = new PromotionController();
