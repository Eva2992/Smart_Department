import { Router } from "express";
import { assessmentsRouter } from "./assessments.route.js";
import { healthRouter } from "./health.route.js";
import { authRouter } from "./auth.route.js";
import { batchRouter } from "./batch.route.js";
import { semesterRouter } from "./semester.route.js";
import { promotionRouter } from "./promotion.route.js";
import { adminRouter } from "./admin.route.js";

const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/batches", batchRouter);
apiV1Router.use("/semesters", semesterRouter);
apiV1Router.use("/promotions", promotionRouter);
apiV1Router.use("/admin", adminRouter);
apiV1Router.use("/assessments", assessmentsRouter);

export { apiV1Router };

