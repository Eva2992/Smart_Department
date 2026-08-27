import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { sendSuccess, sendCreated, sendError } from "../../src/utils/response.js";
import { AppError } from "../../src/middleware/errorHandler.js";

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe("Response Utilities", () => {
  it("sendSuccess formats successful response payload with 200 status code", () => {
    const res = createMockResponse();
    const data = { id: 1, name: "Test Room" };

    sendSuccess(res, data, "Operation succeeded");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Operation succeeded",
      data: { id: 1, name: "Test Room" },
    });
  });

  it("sendCreated formats created response with 201 status code", () => {
    const res = createMockResponse();
    const data = { id: "room-1" };

    sendCreated(res, data, "Room created");

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Room created",
      data: { id: "room-1" },
    });
  });

  it("sendError formats error response with custom status code and error details", () => {
    const res = createMockResponse();

    sendError(res, "Bad Request", 400, "BAD_REQUEST", { field: "email" });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Bad Request",
      error: {
        code: "BAD_REQUEST",
        details: { field: "email" },
      },
    });
  });
});

describe("AppError Class", () => {
  it("creates custom error with status code and error code", () => {
    const error = new AppError("Forbidden action", 403, "FORBIDDEN", { requiredRole: "ADMIN" });

    expect(error.message).toBe("Forbidden action");
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.details).toEqual({ requiredRole: "ADMIN" });
    expect(error.name).toBe("AppError");
  });
});
