import { Request, Response, NextFunction } from "express";

/**
 * Global error handler middleware
 * Ensures no stack traces or internal errors are exposed
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("Error:", err);

  // Don't expose internal errors
  const isProduction = process.env.NODE_ENV === "production";

  // Handle known error types
  if (err.name === "ValidationError") {
    res.status(400).json({
      error: "Validation error",
      message: err.message || "Invalid input",
    });
    return;
  }

  // Generic error response
  res.status(500).json({
    error: "Internal server error",
    message: "An unexpected error occurred. Please try again later.",
    ...(isProduction ? {} : { details: err.message }),
  });
}

