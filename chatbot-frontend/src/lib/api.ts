import type { ChatResponse, HistoryResponse } from "../types/chat";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const api = {
  /**
   * Send a message and get AI reply
   */
  async sendMessage(
    message: string,
    sessionId?: string
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, sessionId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * Get conversation history
   */
  async getHistory(sessionId: string): Promise<HistoryResponse> {
    const response = await fetch(`${API_BASE_URL}/chat/history/${sessionId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

