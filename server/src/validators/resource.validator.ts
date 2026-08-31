import { z } from "zod";
import { ResourceType } from "@prisma/client";

export const resourceTypeSchema = z.nativeEnum(ResourceType);

export const uploadResourceMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title cannot exceed 200 characters"),
  courseName: z
    .string()
    .trim()
    .min(2, "Course name must be at least 2 characters")
    .max(100, "Course name cannot exceed 100 characters"),
  semesterLabel: z
    .string()
    .trim()
    .min(2, "Semester label must be at least 2 characters")
    .max(100, "Semester label cannot exceed 100 characters"),
  year: z.coerce
    .number()
    .int("Year must be an integer")
    .min(1990, "Year must be 1990 or later")
    .max(2100, "Year must be 2100 or earlier"),
  type: resourceTypeSchema,
});

export const resourceQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  semesterLabel: z.string().trim().optional(),
  courseName: z.string().trim().optional(),
  type: resourceTypeSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const resourceIdParamSchema = z.object({
  id: z.string().trim().min(1, "Resource ID is required"),
});
