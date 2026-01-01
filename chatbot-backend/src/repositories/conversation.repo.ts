import { prisma } from "../lib/prisma";

// Infer Conversation type from Prisma client
type Conversation = Awaited<ReturnType<typeof prisma.conversation.findUnique>>;

export const conversationRepo = {
  /**
   * Create a new conversation
   */
  async create(): Promise<Conversation> {
    return prisma.conversation.create({
      data: {},
    });
  },

  /**
   * Find conversation by ID
   * Returns null if not found (caller decides what to do)
   */
  async findById(id: string): Promise<Conversation | null> {
    return prisma.conversation.findUnique({
      where: { id },
    });
  },

  /**
   * Ensure conversation exists, otherwise create a new one
   * Useful for session-based flows
   */
  async findOrCreate(id?: string): Promise<Conversation> {
    if (!id) {
      return this.create();
    }

    const conversation = await this.findById(id);
    return conversation ?? this.create();
  },

  /**
   * Update conversation summary
   */
  async updateSummary(
    id: string,
    summary: string,
    summaryUntil: number
  ): Promise<Conversation> {
    return prisma.conversation.update({
      where: { id },
      data: {
        summary,
        summaryUntil,
      },
    });
  },
};
