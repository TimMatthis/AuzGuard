// Policy API routes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PolicyService } from '../services/policy';
import { AuthService } from '../services/auth';
import { Policy, UserRole } from '../types';

interface PolicyParams {
  policyId: string;
}

interface PolicyRouteOptions {
  policyService: PolicyService;
  authService: AuthService;
}

const extractUser = (request: FastifyRequest) => request.user as { id?: string; role: UserRole };

export async function policyRoutes(fastify: FastifyInstance, options: PolicyRouteOptions) {
  const { policyService, authService } = options;

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

  // GET /api/policies - List all policies
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const policies = await policyService.getAllPolicies();
    return policies;
  });

  // POST /api/policies/import - Import policy from JSON
  fastify.post('/import', async (request: FastifyRequest<{ Body: Policy }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'publish_rules')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const policy = await policyService.createPolicy(request.body, extractUser(request).id || 'system');
      return policy;
    } catch (error) {
      return reply.status(400).send({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  // GET /api/policies/:policyId - Get specific policy
  fastify.get('/:policyId', async (request: FastifyRequest<{ Params: PolicyParams }>, reply: FastifyReply) => {
    const policy = await policyService.getPolicyById(request.params.policyId);
    
    if (!policy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    }

    return policy;
  });

  // PUT /api/policies/:policyId - Update policy
  fastify.put('/:policyId', async (request: FastifyRequest<{ Params: PolicyParams; Body: Policy }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'publish_rules')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const policy = await policyService.updatePolicy(request.params.policyId, request.body, extractUser(request).id || 'system');
      return policy;
    } catch (error) {
      return reply.status(400).send({ 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      });
    }
  });

  // POST /api/policies/:policyId/validate - Validate policy
  fastify.post('/:policyId/validate', async (request: FastifyRequest<{ Params: PolicyParams; Body: Policy }>, reply: FastifyReply) => {
    const validation = await policyService.validatePolicy(request.body);
    return validation;
  });

  // POST /api/policies/:policyId/rules/:ruleId/test - Test rule
  fastify.post('/:policyId/rules/:ruleId/test', async (request: FastifyRequest<{ 
    Params: PolicyParams & { ruleId: string }; 
    Body: { request: Record<string, unknown> } 
  }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'simulate')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const result = await policyService.testRule(
        request.params.policyId,
        request.params.ruleId,
        request.body.request
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

  // DELETE /api/policies/:policyId - Delete policy
  fastify.delete('/:policyId', async (request: FastifyRequest<{ Params: PolicyParams }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_settings')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      await policyService.deletePolicy(request.params.policyId);
      return { success: true };
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
