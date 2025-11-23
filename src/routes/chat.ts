// Tenant-aware chat session routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChatService, CreateChatSessionInput, UpdateChatSessionInput } from '../services/chat';
import { AuthService } from '../services/auth';
import { TenantConnectionManager } from '../services/tenantConnectionManager';
import { UserRole } from '../types';

interface ChatRoutesOptions {
  authService: AuthService;
  connectionManager: TenantConnectionManager;
}

const extractUser = (request: FastifyRequest) => request.user as { id: string; email: string; role: UserRole; tenant_slug?: string };

export async function chatRoutes(fastify: FastifyInstance, options: ChatRoutesOptions) {
  const { connectionManager, authService } = options;

  // Auth middleware - all routes require authentication with tenant_slug
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
      const user = authService.getUserFromToken(token);

      if (!user.tenant_slug) {
        return reply.status(400).send({ error: { code: 'INVALID_TOKEN', message: 'Token missing tenant information. Please use /api/tenant/login or /api/company/register' } });
      }

      request.user = user;
    } catch (e) {
      return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
  });

  // Get all chat sessions for the current user
  fastify.get('/chat/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const chatService = new ChatService(tenantPrisma);

      const sessions = await chatService.getUserSessions(user.id);
      return reply.send({ sessions });
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chat sessions' } });
    }
  });

  // Get a specific chat session
  fastify.get('/chat/sessions/:sessionId', async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { sessionId } = request.params;

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const chatService = new ChatService(tenantPrisma);

      const session = await chatService.getSession(sessionId);

      if (!session) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } });
      }

      // Ensure user owns this session
      if (session.user_id !== user.id) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      return reply.send({ session });
    } catch (error) {
      console.error('Error fetching chat session:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chat session' } });
    }
  });

  // Create a new chat session
  fastify.post('/chat/sessions', async (request: FastifyRequest<{ Body: CreateChatSessionInput }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const input = request.body;

    // Ensure the session belongs to the current user
    input.user_id = user.id;

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const chatService = new ChatService(tenantPrisma);

      const session = await chatService.createSession(input);
      return reply.status(201).send({ session });
    } catch (error) {
      console.error('Error creating chat session:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create chat session' } });
    }
  });

  // Update a chat session
  fastify.put('/chat/sessions/:sessionId', async (request: FastifyRequest<{ Params: { sessionId: string }; Body: UpdateChatSessionInput }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { sessionId } = request.params;
    const input = request.body;

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const chatService = new ChatService(tenantPrisma);

      // First check if the session exists and belongs to the user
      const existingSession = await chatService.getSession(sessionId);
      if (!existingSession || existingSession.user_id !== user.id) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } });
      }

      const session = await chatService.updateSession(sessionId, input);
      if (!session) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } });
      }

      return reply.send({ session });
    } catch (error) {
      console.error('Error updating chat session:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update chat session' } });
    }
  });

  // Delete a chat session
  fastify.delete('/chat/sessions/:sessionId', async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { sessionId } = request.params;

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const chatService = new ChatService(tenantPrisma);

      // First check if the session exists and belongs to the user
      const existingSession = await chatService.getSession(sessionId);
      if (!existingSession || existingSession.user_id !== user.id) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } });
      }

      const success = await chatService.deleteSession(sessionId);
      if (!success) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } });
      }

      return reply.send({ success: true });
    } catch (error) {
      console.error('Error deleting chat session:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete chat session' } });
    }
  });

  // Add a message to a chat session
  fastify.post('/chat/sessions/:sessionId/messages', async (request: FastifyRequest<{ Params: { sessionId: string }; Body: { role: 'user' | 'assistant'; content: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { sessionId } = request.params;
    const { role, content } = request.body;

    if (!role || !content) {
      return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: 'Role and content are required' } });
    }

    if (!['user', 'assistant'].includes(role)) {
      return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: 'Role must be either "user" or "assistant"' } });
    }

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const chatService = new ChatService(tenantPrisma);

      // First check if the session exists and belongs to the user
      const existingSession = await chatService.getSession(sessionId);
      if (!existingSession || existingSession.user_id !== user.id) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } });
      }

      const message = await chatService.addMessage(sessionId, role, content);
      if (!message) {
        return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add message' } });
      }

      return reply.status(201).send({ message });
    } catch (error) {
      console.error('Error adding chat message:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add message' } });
    }
  });

  // Get messages for a specific session
  fastify.get('/chat/sessions/:sessionId/messages', async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { sessionId } = request.params;

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const chatService = new ChatService(tenantPrisma);

      // First check if the session exists and belongs to the user
      const existingSession = await chatService.getSession(sessionId);
      if (!existingSession || existingSession.user_id !== user.id) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Chat session not found' } });
      }

      const messages = await chatService.getSessionMessages(sessionId);
      return reply.send({ messages });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch messages' } });
    }
  });
}





