/**
 * Zod validation schemas for Resource Repository endpoints.
 *
 * Enforces input constraints for FR-23: Study Resource Repository,
 * including metadata field lengths, year range, and resource type validation.
 *
 * @see {@link ResourceController} for endpoint handlers consuming these schemas.
 * @see {@link UploadResourceInput} for the corresponding domain type.
 * @module validators/resource
 */

import { z } from "zod";
import { ResourceType } from "@prisma/client";

/**
 * Zod schema wrapping the Prisma `ResourceType` enum for runtime validation.
 *
 * Accepts values such as `SLIDE`, `NOTE`, `QUESTION_BANK`, `OTHER`, etc.
 */
export const resourceTypeSchema = z.nativeEnum(ResourceType);

/**
 * Zod schema validating resource upload metadata (FR-23).
 *
 * Enforces:
 * - `title`: 2–200 characters.
 * - `courseName`: 2–100 characters.
 * - `semesterLabel`: 2–100 characters (e.g. `"4th Year 1st Semester"`).
 * - `year`: integer in the 1990–2100 range.
 * - `type`: valid {@link ResourceType} enum value.
 *
 * @see {@link ResourceController.uploadResource} for the consuming endpoint.
 */
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

/**
 * Zod schema for resource listing query parameters.
 *
 * All fields are optional for flexible multi-facet filtering:
 * - `year`: integer filter for academic year.
 * - `semesterLabel`, `courseName`: string partial-match filters.
 * - `type`: {@link ResourceType} enum filter.
 * - `search`: free-text search across title, course name, and semester label.
 * - `page` and `limit`: pagination with defaults (page=1, limit=20, max=100).
 */
export const resourceQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  semesterLabel: z.string().trim().optional(),
  courseName: z.string().trim().optional(),
  type: resourceTypeSchema.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Zod schema for the resource `id` path parameter.
 *
 * Validates that a non-empty Resource UUID is provided.
 */
export const resourceIdParamSchema = z.object({
  id: z.string().trim().min(1, "Resource ID is required"),
});
