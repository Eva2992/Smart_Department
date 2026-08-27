import { Router } from "express";
import { healthRouter } from "./health.route.js";

const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);

export { apiV1Router };
