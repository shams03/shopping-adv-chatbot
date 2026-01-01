import { chatService } from "../services/chat.service";
import { messageRepo } from "../repositories/message.repo";
import { rateLimiter } from "../middleware/rateLimiter";
import { validateMessage } from "../middleware/validator";
import express from "express";

const router = express.Router();

/**
 * POST /chat/message
 * Send a message and get AI reply
 * 
 * Request: { message: string, sessionId?: string }
 * Response: { reply: string, sessionId: string }
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

      const result = await chatService.handleMessage({
        message,
        sessionId,
      });

      res.json(result);
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
