const SESSION_ID_KEY = "chatbot_session_id";
const HEADER_HEIGHT_KEY = "chatbot_header_height";

export const storage = {
  /**
   * Get session ID from localStorage
   */
  getSessionId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(SESSION_ID_KEY);
  },

  /**
   * Save session ID to localStorage
   */
  setSessionId(sessionId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  },

  /**
   * Clear session ID
   */
  clearSessionId(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SESSION_ID_KEY);
  },

  /**
   * Get header height from localStorage
   */
  getHeaderHeight(): number | null {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(HEADER_HEIGHT_KEY);
    return saved ? parseInt(saved, 10) : null;
  },

  /**
   * Save header height to localStorage
   */
  setHeaderHeight(height: number): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(HEADER_HEIGHT_KEY, height.toString());
  },
};

