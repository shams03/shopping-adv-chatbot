import { chatService } from "../services/chat.service";
import { messageRepo } from "../repositories/message.repo";
import { rateLimiter } from "../middleware/rateLimiter";
import { validateMessage } from "../middleware/validator";
import express from "express";

const router = express.Router();

/**
 * POST /chat/message
 * Send a message and get AI reply (streaming)
 * 
 * Request: { message: string, sessionId?: string }
 * Response: Server-Sent Events stream with tokens
 */
router.post(
  "/chat/message",
  rateLimiter,
  validateMessage,
  async (req, res, next) => {
    try {
      const { message, sessionId } = req.body as {
        message: string;
        sessionId?: string;
      };

      // Set headers for SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

      // Handle client disconnect
      req.on("close", () => {
        res.end();
      });

      try {
        // Stream tokens
        const stream = chatService.handleMessageStream({
          message,
          sessionId,
        });

        for await (const chunk of stream) {
          // Send SSE formatted data
          const data = JSON.stringify(chunk);
          res.write(`data: ${data}\n\n`);

          // Flush the response to send immediately (if available)
          if ("flush" in res && typeof (res as any).flush === "function") {
            (res as any).flush();
          }

          // If done, break
          if (chunk.done) {
            break;
          }
        }

        res.end();
      } catch (streamError) {
        // Send error as SSE event
        const errorData = JSON.stringify({
          error: streamError instanceof Error ? streamError.message : "Stream error",
          done: true,
        });
        res.write(`data: ${errorData}\n\n`);
        res.end();
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /chat/history/:sessionId
 * Get conversation history
 * 
 * Response: { messages: [{ sender: "user" | "ai", text: string, timestamp: string }] }
 */
router.get("/chat/history/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: "Validation error",
        message: "sessionId is required",
      });
    }

    const messages = await messageRepo.getByConversation(sessionId);

    res.json({
      messages: messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        timestamp: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
