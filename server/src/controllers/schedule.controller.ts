import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { scheduleService } from "../services/scheduleService.js";
import { conflictService } from "../services/conflictService.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

// Validation Schemas
const createSeminarSchema = z.object({
  title: z.string().min(1, "Seminar title is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  roomId: z.string().min(1, "Room selection is required"),
  teacherId: z.string().optional().default(""),
  batchId: z.string().optional().default(""),
  courseId: z.string().optional(),
});

const createScheduleSchema = z.object({
  courseId: z.string().min(1, "Course is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  roomId: z.string().min(1, "Room is required"),
  batchId: z.string().optional().default(""),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  topic: z.string().optional(),
  type: z.enum(["CLASS", "LAB", "MAKEUP", "SEMINAR", "EXAM", "CT"]).optional(),
});

const checkConflictSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  roomId: z.string().optional(),
  teacherId: z.string().optional(),
  batchId: z.string().optional(),
  excludeScheduleEntryId: z.string().optional(),
});

const rescheduleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  roomId: z.string().optional(),
  reason: z.string().optional(),
});

const updateTimeSchema = z.object({
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  reason: z.string().optional(),
});

const cancelClassSchema = z.object({
  reason: z.string().optional(),
});

const createChangeRequestSchema = z.object({
  type: z.enum(["CANCEL", "RESCHEDULE"]),
  reason: z.string().min(1, "Reason is required"),
  preferredDate: z.string().optional(),
  preferredStartTime: z.string().optional(),
  preferredEndTime: z.string().optional(),
  preferredRoomId: z.string().optional(),
});

const reviewChangeRequestSchema = z.object({
  action: z.enum(["APPROVE", "DENY"]),
  denialReason: z.string().optional(),
  modifiedDate: z.string().optional(),
  modifiedStartTime: z.string().optional(),
  modifiedEndTime: z.string().optional(),
  modifiedRoomId: z.string().optional(),
});

const suggestedSlotsQuerySchema = z.object({
  date: z.string().min(1, "Target date is required"),
});

export class ScheduleController {
  async getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, startDate, endDate, batchId, teacherId, roomId, status, type } = req.query;
      const data = await scheduleService.getSchedule({
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        batchId: batchId as string,
        teacherId: teacherId as string,
        roomId: roomId as string,
        status: status as any,
        type: type as any,
      });
      sendSuccess(res, data, "Schedule retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const data = await scheduleService.getMySchedule(req.user, req.query as any);
      sendSuccess(res, data, "Personal schedule retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async getScheduleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scheduleService.getScheduleById(req.params.id as string);
      sendSuccess(res, data, "Schedule entry retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async checkConflict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = checkConflictSchema.parse(req.body);
      const data = await conflictService.checkConflict(body);
      sendSuccess(res, data, "Conflict check evaluated");
    } catch (err) {
      next(err);
    }
  }

  async rescheduleClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = rescheduleSchema.parse(req.body);
      const data = await scheduleService.rescheduleClass(req.params.id as string, body, req.user);
      sendSuccess(res, data, "Class rescheduled successfully");
    } catch (err) {
      next(err);
    }
  }

  async updateClassTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = updateTimeSchema.parse(req.body);
      const data = await scheduleService.updateClassTime(req.params.id as string, body, req.user);
      sendSuccess(res, data, "Class time updated successfully");
    } catch (err) {
      next(err);
    }
  }

  async cancelClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = cancelClassSchema.parse(req.body || {});
      const data = await scheduleService.cancelClass(req.params.id as string, body, req.user);
      sendSuccess(res, data, "Class cancelled successfully");
    } catch (err) {
      next(err);
    }
  }
  async getClassCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const { batchId, teacherId } = req.query;
      const data = await scheduleService.getClassCounts(req.user, {
        batchId: batchId as string,
        teacherId: teacherId as string,
      });
      sendSuccess(res, data, "Class counts retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Creates a new seminar schedule entry.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async createSeminar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = createSeminarSchema.parse(req.body);
      const data = await scheduleService.createSeminarEntry(body, req.user);
      sendCreated(res, data, "Seminar scheduled successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Creates an ad-hoc class schedule (e.g. makeup or extra class).
   */
  async createScheduleEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = createScheduleSchema.parse(req.body);
      const data = await scheduleService.createScheduleEntry(body as any, req.user);
      sendCreated(res, data, "Class session scheduled successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves suggested conflict-free slots and rooms for reassigning a class to a specific date (FR-19).
   */
  async getSuggestedSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = suggestedSlotsQuerySchema.parse(req.query);
      const data = await scheduleService.getSuggestedSlots(req.params.id as string, date);
      sendSuccess(res, data, "Suggested slots retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Submits a student/CR initiated class change request (FR-17, FR-18).
   */
  async submitChangeRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = createChangeRequestSchema.parse(req.body);
      const data = await scheduleService.createChangeRequest(
        req.params.id as string,
        body as any,
        req.user
      );
      sendCreated(res, data, "Class change request submitted successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves class change requests with role-scoped filtering (FR-17, FR-18).
   */
  async getChangeRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const { scheduleEntryId, status, type, teacherId, requestedById, batchId } = req.query;
      const data = await scheduleService.getChangeRequests(
        {
          scheduleEntryId: scheduleEntryId as string,
          status: status as any,
          type: type as any,
          teacherId: teacherId as string,
          requestedById: requestedById as string,
          batchId: batchId as string,
        },
        req.user
      );
      sendSuccess(res, data, "Class change requests retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reviews (Approves or Denies) a class change request (FR-17, FR-18).
   */
  async reviewChangeRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = reviewChangeRequestSchema.parse(req.body);
      const data = await scheduleService.reviewChangeRequest(
        req.params.requestId as string,
        body,
        req.user
      );
      sendSuccess(res, data, `Class change request ${body.action.toLowerCase()}d successfully`);
    } catch (err) {
      next(err);
    }
  }
}

export const scheduleController = new ScheduleController();
