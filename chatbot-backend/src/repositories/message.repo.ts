import { prisma } from "../lib/prisma";

type Message = Awaited<ReturnType<typeof prisma.message.create>>;
// Infer Sender type from Prisma client
type Sender = Message["sender"];

export const messageRepo = {
  /**
   * Create a message (user or ai)
   */
  async create(params: {
    conversationId: string;
    sender: Sender;
    text: string;
  }): Promise<Message> {
    const { conversationId, sender, text } = params;

    return prisma.message.create({
      data: {
        conversationId,
        sender,
        text,
      },
    });
  },

  /**
   * Get messages for a conversation
   * Ordered from oldest → newest
   */
  async getByConversation(
    conversationId: string
  ): Promise<Pick<Message, "sender" | "text" | "createdAt">[]> {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: {
        sender: true,
        text: true,
        createdAt: true,
      },
    });
  },

  /**
   * Get last N messages for a conversation (for raw window)
   * Ordered from oldest → newest
   */
  async getLastN(
    conversationId: string,
    n: number
  ): Promise<Pick<Message, "sender" | "text">[]> {
    return prisma.message
      .findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: n,
        select: {
          sender: true,
          text: true,
        },
      })
      .then((messages: Pick<Message, "sender" | "text">[]) =>
        messages.reverse()
      ); // Reverse to get oldest → newest
  },

  /**
   * Get total message count for a conversation
   */
  async getCount(conversationId: string): Promise<number> {
    return prisma.message.count({
      where: { conversationId },
    });
  },

  /**
   * Optional: limit history for LLM safety
   */
  async getRecentByConversation(
    conversationId: string,
    limit: number
  ): Promise<Pick<Message, "sender" | "text">[]> {
    return prisma.message
      .findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          sender: true,
          text: true,
        },
      })
      .then((messages: Pick<Message, "sender" | "text">[]) =>
        messages.reverse()
      );
  },
};
