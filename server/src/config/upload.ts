import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../services/resource.service.js";
import { AppError } from "../middleware/errorHandler.js";

/** Destination filesystem directory for study resources and grade sheets. */
const uploadDir = path.join(process.cwd(), "uploads", "resources");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Multer disk storage engine for academic study resources and grade sheets.
 * Sanitizes original filenames and generates unique timestamp-suffixed file keys.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

/**
 * Multer middleware instance configured for academic study resources and semester final grade sheets.
 *
 * Enforces file size limitations (up to 50MB) and validates file extensions and MIME types
 * against accepted lecture notes, slides, documents, and spreadsheet formats (PDF, DOCX, PPTX, XLSX, PNG, JPG).
 * Rejects unsupported file types by passing an {@link AppError} with code `'INVALID_FILE_TYPE'`.
 *
 * @example
 * ```ts
 * router.post("/resources", resourceUpload.single("file"), createResourceHandler);
 * ```
 */
export const resourceUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new AppError(
          `Unsupported file type '${ext || file.mimetype}'. Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG.`,
          400,
          "INVALID_FILE_TYPE"
        )
      );
    }
    cb(null, true);
  },
});

/** Destination filesystem directory for student assignment submissions. */
const assignmentUploadDir = path.join(process.cwd(), "uploads", "assignments");
if (!fs.existsSync(assignmentUploadDir)) {
  fs.mkdirSync(assignmentUploadDir, { recursive: true });
}

/**
 * Multer disk storage engine for student assignment submissions.
 * Sanitizes submission filenames and appends a collision-resistant timestamp suffix.
 */
const assignmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, assignmentUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

/**
 * Allowed file extensions for student assignment submissions, including documents, archives, and images.
 */
const ALLOWED_ASSIGNMENT_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".zip",
  ".rar",
  ".tar",
  ".gz",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
]);

/**
 * Multer middleware instance configured for student assignment submissions.
 *
 * Enforces file size limitations (up to 50MB) and restricts uploaded attachments to accepted
 * document, source code archive, and image formats.
 * Rejects unsupported file types by passing an {@link AppError} with code `'INVALID_FILE_TYPE'`.
 *
 * @example
 * ```ts
 * router.post("/assignments/:id/submit", assignmentUpload.single("file"), submitAssignmentHandler);
 * ```
 */
export const assignmentUpload = multer({
  storage: assignmentStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_ASSIGNMENT_EXTENSIONS.has(ext)) {
      return cb(
        new AppError(
          `Unsupported assignment file type '${ext}'. Supported formats: PDF, DOCX, ZIP, RAR, TXT, PNG, JPG.`,
          400,
          "INVALID_FILE_TYPE"
        )
      );
    }
    cb(null, true);
  },
});
