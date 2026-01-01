import { prisma } from "../lib/prisma";

// Infer Sender type from Prisma client (automatically stays in sync with enum)
type Message = Awaited<ReturnType<typeof prisma.message.create>>;
type Sender = Message["sender"];

export type ChatHistoryMessage = {
  sender: Sender;
  text: string;
};
