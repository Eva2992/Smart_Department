import { Router } from "express";
import { assessmentsRouter } from "./assessments.route.js";
import { healthRouter } from "./health.route.js";
import { scheduleRouter } from "./schedule.routes.js";
import { roomRouter } from "./room.routes.js";
import { holidayRouter } from "./holiday.routes.js";
import { routineRouter } from "./routine.routes.js";
import { authRouter } from "./auth.route.js";
import { resultRouter } from "./result.route.js";
import { batchRouter } from "./batch.route.js";
import { semesterRouter } from "./semester.route.js";
import { promotionRouter } from "./promotion.route.js";
import { adminRouter } from "./admin.route.js";
import { resourceRouter } from "./resource.route.js";
import { examRouter } from "./exam.routes.js";


const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/schedules", scheduleRouter);
apiV1Router.use("/rooms", roomRouter);
apiV1Router.use("/holidays", holidayRouter);
apiV1Router.use("/admin/holidays", holidayRouter); // Alias for SRS path compatibility
apiV1Router.use("/routines", routineRouter);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/results", resultRouter);
apiV1Router.use("/batches", batchRouter);
apiV1Router.use("/semesters", semesterRouter);
apiV1Router.use("/promotions", promotionRouter);
apiV1Router.use("/admin", adminRouter);
apiV1Router.use("/assessments", assessmentsRouter);
apiV1Router.use("/resources", resourceRouter);
apiV1Router.use("/exams", examRouter);

export { apiV1Router };

