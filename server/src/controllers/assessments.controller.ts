import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../utils/response.js";
import {
  createAssignmentSchema,
  listAssignmentsQuerySchema,
  scheduleCtSchema,
  studentCtMarksParamsSchema,
  updateCtParamsSchema,
  updateCtSchema,
  cancelCtParamsSchema,
  cancelCtSchema,
  updateAssignmentParamsSchema,
  updateAssignmentSchema,
  deleteAssignmentParamsSchema,
  deleteAssignmentSchema,
} from "../validators/assessment.validator.js";
import {
  createAssignment,
  listAssignments,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
} from "../services/assignment.service.js";
import { listStudentCTMarks, scheduleCT, updateCT, cancelCT } from "../services/ct.service.js";

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

  async updateCT(req: Request, res: Response): Promise<Response> {
    const { ctId } = updateCtParamsSchema.parse(req.params);
    const payload = updateCtSchema.parse(req.body);
    const result = await updateCT({ ctId, ...payload });

    return sendSuccess(
      res,
      result,
      result.warnings.length > 0 ? "CT updated with warnings" : "CT updated successfully"
    );
  },

  async cancelCT(req: Request, res: Response): Promise<Response> {
    const { ctId } = cancelCtParamsSchema.parse(req.params);
    const payload = cancelCtSchema.parse(req.body);
    const result = await cancelCT({ ctId, ...payload });

    return sendSuccess(res, result, result.message);
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

  async updateAssignment(req: Request, res: Response): Promise<Response> {
    const { assignmentId } = updateAssignmentParamsSchema.parse(req.params);
    const payload = updateAssignmentSchema.parse(req.body);
    const result = await updateAssignment({ assignmentId, ...payload });

    return sendSuccess(res, result, "Assignment updated successfully");
  },

  async deleteAssignment(req: Request, res: Response): Promise<Response> {
    const { assignmentId } = deleteAssignmentParamsSchema.parse(req.params);
    const { teacherId } = deleteAssignmentSchema.parse(req.body);
    await deleteAssignment(assignmentId, teacherId);

    return sendSuccess(res, null, "Assignment deleted successfully");
  },

  async submitAssignment(req: Request, res: Response): Promise<Response> {
    const assignmentId = (req.params.id || req.params.assignmentId) as string;
    const user = req.user!;
    const file = req.file;

    const { submissionUrl, notes, submissionType } = req.body;

    const fileUrl = file ? `/uploads/assignments/${file.filename}` : undefined;
    const fileName = file ? file.originalname : undefined;
    const fileSizeBytes = file ? file.size : undefined;

    const result = await submitAssignment({
      assignmentId,
      studentId: user.userId,
      submissionType,
      submissionUrl: submissionUrl ? String(submissionUrl).trim() : undefined,
      fileUrl,
      fileName,
      fileSizeBytes,
      notes: notes ? String(notes).trim() : undefined,
    });

    return sendSuccess(res, result, "Assignment submitted successfully");
  },

  async getAssignmentSubmissions(req: Request, res: Response): Promise<Response> {
    const assignmentId = (req.params.id || req.params.assignmentId) as string;
    const user = req.user!;

    const result = await getAssignmentSubmissions(assignmentId, {
      id: user.userId,
      role: user.role,
    });

    return sendSuccess(res, result, "Assignment submissions loaded successfully");
  },
};
