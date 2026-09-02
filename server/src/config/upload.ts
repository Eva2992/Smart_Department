import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../services/resource.service.js";
import { AppError } from "../middleware/errorHandler.js";

// Ensure destination upload folder exists
const uploadDir = path.join(process.cwd(), "uploads", "resources");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

// Assignment file uploads destination
const assignmentUploadDir = path.join(process.cwd(), "uploads", "assignments");
if (!fs.existsSync(assignmentUploadDir)) {
  fs.mkdirSync(assignmentUploadDir, { recursive: true });
}

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
