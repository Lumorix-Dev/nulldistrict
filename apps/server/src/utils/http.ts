import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  public status: number;
  public code: string;

  public constructor(status: number, message: string, code = "HTTP_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
      details: error.flatten()
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.code, message: error.message });
  }

  const message = error instanceof Error ? error.message : "Unknown server error.";
  return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: process.env.NODE_ENV === "production" ? "Internal server error." : message
  });
}
