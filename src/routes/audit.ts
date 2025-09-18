// Audit API routes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services/audit';
import { AuthService } from '../services/auth';
import { Effect, UserRole } from '../types';

interface AuditParams {
  id: string;
}

interface AuditQuery {
  from?: string;
  to?: string;
  org_id?: string;
  rule_id?: string;
  effect?: Effect;
  limit?: number;
  offset?: number;
}

interface AuditRouteOptions {
  auditService: AuditService;
  authService: AuthService;
}

const extractUser = (request: FastifyRequest) => request.user as { id?: string; role: UserRole };

export async function auditRoutes(fastify: FastifyInstance, options: AuditRouteOptions) {
  const { auditService, authService } = options;

  // Authentication middleware
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
      }

      const user = authService.getUserFromToken(token);
      request.user = user;
    } catch (error) {
      return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
  });

  // GET /api/audit - Get audit logs with filtering
  fastify.get('/', async (request: FastifyRequest<{ Querystring: AuditQuery }>, reply: FastifyReply) => {
    const filters = {
      from: request.query.from ? new Date(request.query.from) : undefined,
      to: request.query.to ? new Date(request.query.to) : undefined,
      org_id: request.query.org_id,
      rule_id: request.query.rule_id,
      effect: request.query.effect,
      limit: request.query.limit ? Number(request.query.limit) : undefined,
      offset: request.query.offset ? Number(request.query.offset) : undefined
    };

    const logs = await auditService.getAuditLogs(filters);
    return logs;
  });

  // GET /api/audit/:id - Get specific audit log entry
  fastify.get('/:id', async (request: FastifyRequest<{ Params: AuditParams }>, reply: FastifyReply) => {
    const log = await auditService.getAuditLogById(request.params.id);
    
    if (!log) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Audit log not found' } });
    }

    return log;
  });

  // GET /api/audit/proof/latest - Get latest Merkle proof
  fastify.get('/proof/latest', async (request: FastifyRequest, reply: FastifyReply) => {
    const proof = await auditService.getLatestProof();
    
    if (!proof) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No Merkle proof available' } });
    }

    return proof;
  });

  // POST /api/audit/verify - Verify audit log integrity
  fastify.post('/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);
    if (!authService.canPerformAction(user.role, 'manage_settings')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    const verification = await auditService.verifyIntegrity();
    return verification;
  });
}



