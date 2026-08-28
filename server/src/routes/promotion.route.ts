import { Router } from "express";
import { promotionController } from "../controllers/promotion.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const promotionRouter = Router();

// CR submits promotion request (FR-07)
promotionRouter.post("/request", authenticate, authorize("CR", "ADMIN"), (req, res, next) => {
  promotionController.requestPromotion(req, res).catch(next);
});

// Admin views and manages promotion requests
promotionRouter.get("/", authenticate, authorize("ADMIN"), (req, res, next) => {
  promotionController.getPromotionRequests(req, res).catch(next);
});

promotionRouter.patch("/:id/reject", authenticate, authorize("ADMIN"), (req, res, next) => {
  promotionController.rejectPromotion(req, res).catch(next);
});

export { promotionRouter };
