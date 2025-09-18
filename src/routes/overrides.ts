// Override API routes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EvaluationService } from '../services/evaluation';
import { PolicyService } from '../services/policy';
import { AuditService } from '../services/audit';
import { AuthService } from '../services/auth';
import { OverrideRequest, UserRole } from '../types';

interface OverrideRouteOptions {
  evaluationService: EvaluationService;
  policyService: PolicyService;
  auditService: AuditService;
  authService: AuthService;
}

const extractUser = (request: FastifyRequest) => request.user as { id?: string; role: UserRole };

export async function overrideRoutes(fastify: FastifyInstance, options: OverrideRouteOptions) {
  const { evaluationService, policyService, auditService, authService } = options;

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

  // POST /api/overrides/execute - Execute override
  fastify.post('/execute', async (request: FastifyRequest<{ Body: OverrideRequest }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_overrides')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const result = await evaluationService.executeOverride(
        request.body,
        policyService,
        auditService
      );
      
      return result;
    } catch (error) {
      return reply.status(400).send({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });
}
