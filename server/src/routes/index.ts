import { Router } from "express";
import { healthRouter } from "./health.route.js";
import { scheduleRouter } from "./schedule.routes.js";
import { roomRouter } from "./room.routes.js";
import { holidayRouter } from "./holiday.routes.js";
import { routineRouter } from "./routine.routes.js";

const apiV1Router = Router();

apiV1Router.use("/health", healthRouter);
apiV1Router.use("/schedules", scheduleRouter);
apiV1Router.use("/rooms", roomRouter);
apiV1Router.use("/holidays", holidayRouter);
apiV1Router.use("/admin/holidays", holidayRouter); // Alias for SRS path compatibility
apiV1Router.use("/routines", routineRouter);

export { apiV1Router };
