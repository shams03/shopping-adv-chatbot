import { prisma } from "../lib/prisma";
import { llmService } from "./llm.service";
import { messageRepo } from "../repositories/message.repo";

// Infer types from Prisma client (non-nullable versions)
type Conversation = NonNullable<Awaited<ReturnType<typeof prisma.conversation.findUnique>>>;
type Message = NonNullable<Awaited<ReturnType<typeof prisma.message.findFirst>>>;

/**
 * SummaryManager Service
 * 
 * Implements deterministic memory management:
 * - Only ONE summary exists per conversation
 * - Summary NEVER overlaps with raw messages
 * - Raw messages are immutable and stored forever
 * 
 * Summarization Rules:
 * 1. If total messages > 20 AND no summary exists → summarize
 * 2. Summary covers messages 1 → (N - 5)
 * 3. If raw window grows > 10 messages, re-summarize
 * 4. Replace old summary, do NOT append summaries
 */
export const summaryService = {
  /**
   * Check if summarization is needed and trigger if required
   * 
   * @param conversation - The conversation to check
   * @param totalMessageCount - Total number of messages in conversation
   */
  async checkAndSummarize(
    conversation: Conversation | null,
    totalMessageCount: number
  ): Promise<void> {
    // Guard: conversation must exist
    if (!conversation) {
      return;
    }

    const SUMMARY_THRESHOLD = 20; // Summarize if total messages > 20
    const RAW_WINDOW_SIZE = 5; // Keep last 5 messages as raw
    const RE_SUMMARY_THRESHOLD = 10; // Re-summarize if raw window > 10

    // Case 1: Initial summarization trigger
    // If total messages > 20 AND no summary exists
    if (totalMessageCount > SUMMARY_THRESHOLD && !conversation.summary) {
      const messagesToSummarize = totalMessageCount - RAW_WINDOW_SIZE;
      await this.createSummary(conversation.id, messagesToSummarize);
      return;
    }

    // Case 2: Re-summarization trigger
    // If summary exists, check if raw window has grown too large
    if (conversation.summary && conversation.summaryUntil !== null) {
      const rawWindowSize = totalMessageCount - conversation.summaryUntil;
      
      if (rawWindowSize > RE_SUMMARY_THRESHOLD) {
        // Re-summarize: existing summary + additional raw messages
        await this.reSummarize(conversation.id, totalMessageCount);
      }
    }
  },

  /**
   * Create initial summary for a conversation
   * Summarizes messages from 1 to (totalCount - 5)
   * 
   * @param conversationId - The conversation ID
   * @param messageCountToSummarize - Number of messages to include in summary
   */
  async createSummary(
    conversationId: string,
    messageCountToSummarize: number
  ): Promise<void> {
    // Get messages to summarize (oldest first, up to messageCountToSummarize)
    const allMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: messageCountToSummarize,
    });

    if (allMessages.length === 0) {
      return;
    }

    // Generate summary using LLM
    const summaryText = await this.generateSummary(allMessages);

    // Update conversation with summary
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary: summaryText,
        summaryUntil: messageCountToSummarize,
      },
    });

    console.log(
      `Created summary for conversation ${conversationId}, covering ${messageCountToSummarize} messages`
    );
  },

  /**
   * Re-summarize conversation
   * Combines existing summary with new raw messages
   * 
   * @param conversationId - The conversation ID
   * @param currentTotalCount - Current total message count
   */
  async reSummarize(
    conversationId: string,
    currentTotalCount: number
  ): Promise<void> {
    const RAW_WINDOW_SIZE = 5;

    // Get existing summary
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.summary) {
      return;
    }

    // Get new messages that need to be added to summary
    // Messages from (summaryUntil + 1) to (currentTotalCount - 5)
    const newMessageStart = (conversation.summaryUntil || 0) + 1;
    const newMessageEnd = currentTotalCount - RAW_WINDOW_SIZE;

    if (newMessageEnd < newMessageStart) {
      return; // No new messages to summarize
    }

    const newMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      skip: newMessageStart - 1,
      take: newMessageEnd - newMessageStart + 1,
    });

    if (newMessages.length === 0) {
      return;
    }

    // Generate new summary combining old summary + new messages
    const newSummaryText = await this.generateReSummary(
      conversation.summary,
      newMessages
    );

    // Update conversation with new summary (REPLACE, don't append)
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary: newSummaryText,
        summaryUntil: newMessageEnd,
      },
    });

    console.log(
      `Re-summarized conversation ${conversationId}, now covering ${newMessageEnd} messages`
    );
  },

  /**
   * Generate summary from messages using LLM
   */
  async generateSummary(messages: Message[]): Promise<string> {
    // Filter out any null messages and ensure type safety
    const validMessages = messages.filter((m): m is Message => m !== null);
    const conversationText = validMessages
      .map((m) => `${m.sender === "user" ? "Customer" : "Agent"}: ${m.text}`)
      .join("\n");

    const prompt = `You are summarizing a customer support conversation. Create a concise summary that captures:
- Customer's main questions and concerns
- Key information provided by the agent
- Important details (order numbers, dates, policies mentioned)
- Resolution status if applicable

Conversation to summarize:
${conversationText}

Provide a clear, factual summary:`;

    try {
      // Use LLM service to generate summary
      const summary = await llmService.generateSummary(prompt);
      return summary;
    } catch (error) {
      console.error("Error generating summary:", error);
      // Fallback: create a simple text summary
      return `Conversation summary: ${validMessages.length} messages exchanged. Customer inquiries and agent responses recorded.`;
    }
  },

  /**
   * Generate re-summary combining existing summary with new messages
   */
  async generateReSummary(
    existingSummary: string,
    newMessages: Message[]
  ): Promise<string> {
    // Filter out any null messages and ensure type safety
    const validMessages = newMessages.filter((m): m is Message => m !== null);
    const newConversationText = validMessages
      .map((m) => `${m.sender === "user" ? "Customer" : "Agent"}: ${m.text}`)
      .join("\n");

    const prompt = `You are updating a conversation summary. Combine the existing summary with new messages to create an updated summary.

Existing summary:
${existingSummary}

New messages to add:
${newConversationText}

Create an updated summary that:
- Preserves important information from the existing summary
- Incorporates new information from the new messages
- Remains concise and factual
- Does not duplicate information

Updated summary:`;

    try {
      const updatedSummary = await llmService.generateSummary(prompt);
      return updatedSummary;
    } catch (error) {
      console.error("Error generating re-summary:", error);
      // Fallback: append to existing summary
      return `${existingSummary}\n\nAdditional messages: ${validMessages.length} more messages exchanged.`;
    }
  },
};

