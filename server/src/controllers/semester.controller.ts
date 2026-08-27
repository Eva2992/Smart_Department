import type { Request, Response } from "express";
import { semesterService } from "../services/semester.service.js";
import { createSemesterSchema, updateSemesterSchema } from "../validators/academic.validator.js";
import { sendCreated, sendSuccess } from "../utils/response.js";
import type { SemesterStatus } from "@prisma/client";

export class SemesterController {
  async createSemester(req: Request, res: Response) {
    const validated = createSemesterSchema.parse(req.body);
    const semester = await semesterService.createSemester(validated);
    return sendCreated(res, semester, "Semester created successfully with courses");
  }

  async getSemesters(req: Request, res: Response) {
    const { batchId, status } = req.query;
    const semesters = await semesterService.getSemesters({
      batchId: batchId ? String(batchId) : undefined,
      status: status ? (status as SemesterStatus) : undefined,
    });
    return sendSuccess(res, semesters);
  }

  async getSemesterById(req: Request, res: Response) {
    const id = req.params.id as string;
    const semester = await semesterService.getSemesterById(id);
    return sendSuccess(res, semester);
  }

  async updateSemester(req: Request, res: Response) {
    const id = req.params.id as string;
    const validated = updateSemesterSchema.parse(req.body);
    const updated = await semesterService.updateSemester(id, validated);
    return sendSuccess(res, updated, "Semester updated successfully");
  }
}

export const semesterController = new SemesterController();
