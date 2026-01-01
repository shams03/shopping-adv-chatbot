import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatHistoryMessage } from "src/types/chat";
import { appConfig } from "../lib/env";

const genAI = new GoogleGenerativeAI(appConfig.geminiApiKey!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

/**
 * System prompt - MUST be repeated verbatim on every LLM call
 * This defines the agent's role, policies, and behavior
 */
const SYSTEM_PROMPT = `You are a helpful support agent for a small e-commerce store.

Store policies:
- Shipping: Worldwide shipping, delivery in 5–10 business days.
- Returns: 30-day return window, unused items only.
- Support hours: Monday to Friday, 9am–6pm IST.

Important rules:
- Answer clearly, concisely, and professionally.
- Do NOT make up information about products, prices, or policies not listed above.
- Do NOT disclose internal systems, database details, or technical implementation.
- If you don't know something, say so honestly.
- Treat conversation summaries as authoritative history.
- Prioritize the latest user messages over summary information if there are conflicts.`;

export const llmService = {
  /**
   * Generate reply using canonical memory layout (streaming):
   * [ SYSTEM PROMPT ]
   * [ CONVERSATION SUMMARY (if exists) ]
   * [ LAST 5 RAW MESSAGES ]
   * [ CURRENT USER MESSAGE ]
   */
  async *generateReplyStream(params: {
    summary: string | null;
    rawMessages: ChatHistoryMessage[];
    userMessage: string;
  }): AsyncGenerator<string, void, unknown> {
    try {
      const { summary, rawMessages, userMessage } = params;

      // Build conversation context following canonical memory layout
      let contextParts: string[] = [];

      // 1. System prompt (always included)
      contextParts.push(SYSTEM_PROMPT);

      // 2. Conversation summary (if exists)
      if (summary) {
        contextParts.push(
          `\n[Previous conversation summary]\n${summary}\n[End of summary]`
        );
      }

      // 3. Last 5 raw messages
      if (rawMessages.length > 0) {
        const recentConversation = rawMessages
          .map((m) =>
            m.sender === "user" ? `Customer: ${m.text}` : `Agent: ${m.text}`
          )
          .join("\n");
        contextParts.push(`\n[Recent conversation]\n${recentConversation}`);
      }

      // 4. Current user message
      contextParts.push(`\nCustomer: ${userMessage}\nAgent:`);

      const prompt = contextParts.join("\n\n");

      // Use streaming API
      const result = await model.generateContentStream(prompt);
      
      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          yield chunkText;
        }
      }

      if (!fullText.trim()) {
        throw new Error("Empty Gemini response");
      }
    } catch (error) {
      // Graceful failure (MANDATORY)
      console.error("LLM error:", error);
      yield "Sorry, I'm having trouble responding right now. Please try again in a moment.";
    }
  },

  /**
   * Generate reply using canonical memory layout (non-streaming, for summaries):
   * [ SYSTEM PROMPT ]
   * [ CONVERSATION SUMMARY (if exists) ]
   * [ LAST 5 RAW MESSAGES ]
   * [ CURRENT USER MESSAGE ]
   */
  async generateReply(params: {
    summary: string | null;
    rawMessages: ChatHistoryMessage[];
    userMessage: string;
  }): Promise<string> {
    try {
      const { summary, rawMessages, userMessage } = params;

      // Build conversation context following canonical memory layout
      let contextParts: string[] = [];

      // 1. System prompt (always included)
      contextParts.push(SYSTEM_PROMPT);

      // 2. Conversation summary (if exists)
      if (summary) {
        contextParts.push(
          `\n[Previous conversation summary]\n${summary}\n[End of summary]`
        );
      }

      // 3. Last 5 raw messages
      if (rawMessages.length > 0) {
        const recentConversation = rawMessages
          .map((m) =>
            m.sender === "user" ? `Customer: ${m.text}` : `Agent: ${m.text}`
          )
          .join("\n");
        contextParts.push(`\n[Recent conversation]\n${recentConversation}`);
      }

      // 4. Current user message
      contextParts.push(`\nCustomer: ${userMessage}\nAgent:`);

      const prompt = contextParts.join("\n\n");

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      if (!response) {
        throw new Error("Empty Gemini response");
      }

      return response.trim();
    } catch (error) {
      // Graceful failure (MANDATORY)
      console.error("LLM error:", error);
      return "Sorry, I'm having trouble responding right now. Please try again in a moment.";
    }
  },

  /**
   * Generate summary from a prompt
   * Used by summary service for memory compression
   */
  async generateSummary(prompt: string): Promise<string> {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      if (!response) {
        throw new Error("Empty summary response");
      }

      return response.trim();
    } catch (error) {
      console.error("Summary generation error:", error);
      throw error;
    }
  },
};
