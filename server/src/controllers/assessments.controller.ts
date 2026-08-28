import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../utils/response.js";
import {
  createAssignmentSchema,
  listAssignmentsQuerySchema,
  scheduleCtSchema,
  studentCtMarksParamsSchema,
} from "../validators/assessment.validator.js";
import { createAssignment, listAssignments } from "../services/assignment.service.js";
import { listStudentCTMarks, scheduleCT } from "../services/ct.service.js";

export const assessmentsController = {
  async scheduleCT(req: Request, res: Response): Promise<Response> {
    const payload = scheduleCtSchema.parse(req.body);
    const result = await scheduleCT(payload);

    return sendCreated(
      res,
      result,
      result.warnings.length > 0 ? "CT scheduled with warnings" : "CT scheduled successfully"
    );
  },

  async getStudentCTMarks(req: Request, res: Response): Promise<Response> {
    const { studentId } = studentCtMarksParamsSchema.parse(req.params);
    const result = await listStudentCTMarks(studentId);

    return sendSuccess(res, result, "Student CT marks loaded successfully");
  },

  async createAssignment(req: Request, res: Response): Promise<Response> {
    const payload = createAssignmentSchema.parse(req.body);
    const result = await createAssignment(payload);

    return sendCreated(res, result, "Assignment created successfully");
  },

  async listAssignments(req: Request, res: Response): Promise<Response> {
    const { batchId } = listAssignmentsQuerySchema.parse(req.query);
    const result = await listAssignments(batchId);

    return sendSuccess(res, result, "Assignments loaded successfully");
  },
};
