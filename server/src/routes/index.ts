import { Router } from "express";
import { assessmentsRouter } from "./assessments.route.js";
import { healthRouter } from "./health.route.js";
import { authRouter } from "./auth.route.js";

const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/assessments", assessmentsRouter);

export { apiV1Router };

