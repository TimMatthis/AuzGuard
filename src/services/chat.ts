// Chat service for managing chat sessions and messages
import { PrismaClient } from '@prisma/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  policy_id?: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface CreateChatSessionInput {
  user_id: string;
  title?: string;
  policy_id?: string;
  messages?: ChatMessage[];
}

export interface UpdateChatSessionInput {
  title?: string;
  policy_id?: string;
}

export class ChatService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new chat session
   */
  async createSession(input: CreateChatSessionInput): Promise<ChatSession> {
    const session = await this.prisma.chatSession.create({
      data: {
        user_id: input.user_id,
        title: input.title,
        policy_id: input.policy_id,
        messages: {
          create: input.messages?.map(msg => ({
            role: msg.role,
            content: msg.content,
          })) || []
        }
      },
      include: {
        messages: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    return this.mapSession(session);
  }

  /**
   * Get all chat sessions for a user
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    const sessions = await this.prisma.chatSession.findMany({
      where: { user_id: userId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    return sessions.map(this.mapSession);
  }

  /**
   * Get a specific chat session
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    return session ? this.mapSession(session) : null;
  }

  /**
   * Update a chat session
   */
  async updateSession(sessionId: string, input: UpdateChatSessionInput): Promise<ChatSession | null> {
    try {
      const session = await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          title: input.title,
          policy_id: input.policy_id,
          updated_at: new Date()
        },
        include: {
          messages: {
            orderBy: { created_at: 'asc' }
          }
        }
      });

      return this.mapSession(session);
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.prisma.chatSession.delete({
        where: { id: sessionId }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessage | null> {
    try {
      // Update session timestamp
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updated_at: new Date() }
      });

      const message = await this.prisma.chatMessage.create({
        data: {
          session_id: sessionId,
          role,
          content
        }
      });

      return this.mapMessage(message);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get messages for a session
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' }
    });

    return messages.map(this.mapMessage);
  }

  /**
   * Delete old sessions for a user (keep only the most recent N)
   */
  async cleanupOldSessions(userId: string, keepCount: number = 50): Promise<number> {
    // Get sessions to delete (older ones beyond the keep count)
    const sessionsToDelete = await this.prisma.chatSession.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      skip: keepCount,
      select: { id: true }
    });

    if (sessionsToDelete.length === 0) {
      return 0;
    }

    // Delete the sessions (messages will be cascade deleted)
    const result = await this.prisma.chatSession.deleteMany({
      where: {
        id: { in: sessionsToDelete.map((s: { id: string }) => s.id) }
      }
    });

    return result.count;
  }

  private mapSession(session: any): ChatSession {
    return {
      id: session.id,
      user_id: session.user_id,
      title: session.title,
      policy_id: session.policy_id,
      created_at: session.created_at.toISOString(),
      updated_at: session.updated_at.toISOString(),
      messages: session.messages?.map(this.mapMessage) || []
    };
  }

  private mapMessage(message: any): ChatMessage {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at.toISOString()
    };
  }
}
