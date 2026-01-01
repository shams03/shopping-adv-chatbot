import { Request, Response, NextFunction } from "express";

const MAX_MESSAGE_LENGTH = 5000; // Maximum message length in characters

/**
 * Input validation middleware
 * Validates message content before processing
 */
export function validateMessage(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { message } = req.body;

  // Check if message exists
  if (!message) {
    res.status(400).json({
      error: "Validation error",
      message: "Message is required",
    });
    return;
  }

  // Check if message is a string
  if (typeof message !== "string") {
    res.status(400).json({
      error: "Validation error",
      message: "Message must be a string",
    });
    return;
  }

  // Check if message is not empty or whitespace-only
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    res.status(400).json({
      error: "Validation error",
      message: "Message cannot be empty or whitespace-only",
    });
    return;
  }

  // Check message length
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      error: "Validation error",
      message: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    });
    return;
  }

  // Replace the message with trimmed version
  req.body.message = trimmedMessage;

  next();
}

