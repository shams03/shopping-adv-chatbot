export type Message = {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

export type ChatResponse = {
  reply: string;
  sessionId: string;
};

export type HistoryResponse = {
  messages: Message[];
};

