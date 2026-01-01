// services/chat.service.ts
import { conversationRepo } from "../repositories/conversation.repo";
import { messageRepo } from "../repositories/message.repo";
import { llmService } from "./llm.service";
import { summaryService } from "./summary.service";

const RAW_WINDOW_SIZE = 5; // Last 5 messages kept as raw

export const chatService = {
  /**
   * Handle incoming message with deterministic memory management
   * 
   * Memory Strategy:
   * 1. System prompt is included in EVERY LLM call
   * 2. Only ONE summary exists per conversation
   * 3. Summary NEVER overlaps with raw messages
   * 4. Raw messages are immutable and stored forever
   * 5. Prompt payloads are NOT persisted
   */
  async handleMessage({
    message,
    sessionId,
  }: {
    message: string;
    sessionId?: string;
  }) {
    // 1. Get or create conversation
    const conversation = sessionId
      ? await conversationRepo.findOrCreate(sessionId)
      : await conversationRepo.create();

    if (!conversation) {
      throw new Error("Failed to create or retrieve conversation");
    }

    // 2. Save user message (immutable, permanent)
    await messageRepo.create({
      conversationId: conversation.id,
      sender: "user",
      text: message,
    });

    // 3. Get total message count (including the one we just created)
    const totalMessageCount = await messageRepo.getCount(conversation.id);

    // 4. Check if summarization is needed (before generating reply)
    // This ensures summary is ready when we build the prompt
    await summaryService.checkAndSummarize(conversation, totalMessageCount);

    // 5. Refresh conversation to get latest summary if it was just created
    const updatedConversation = await conversationRepo.findById(
      conversation.id
    );
    if (!updatedConversation) {
      throw new Error("Conversation not found after summarization check");
    }

    // 6. Get raw message window (last 5 messages)
    // These are the messages that are NOT in the summary
    const rawMessages = await messageRepo.getLastN(
      conversation.id,
      RAW_WINDOW_SIZE
    );

    // 7. Generate reply using canonical memory layout:
    // [ SYSTEM PROMPT ] + [ SUMMARY ] + [ LAST 5 RAW MESSAGES ] + [ CURRENT USER MESSAGE ]
    const reply = await llmService.generateReply({
      summary: updatedConversation.summary,
      rawMessages: rawMessages.map((m) => ({
        sender: m.sender,
        text: m.text,
      })),
      userMessage: message,
    });

    // 8. Save AI reply (immutable, permanent)
    await messageRepo.create({
      conversationId: conversation.id,
      sender: "ai",
      text: reply,
    });

    return {
      reply,
      sessionId: conversation.id,
    };
  },
};
