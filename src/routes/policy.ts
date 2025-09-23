// Policy API routes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PolicyService } from '../services/policy';
import { CatalogService } from '../services/catalog';
import { AuthService } from '../services/auth';
import { Policy, UserRole } from '../types';

interface PolicyParams {
  policyId: string;
}

interface PolicyRouteOptions {
  policyService: PolicyService;
  authService: AuthService;
  catalogService?: CatalogService;
}

const extractUser = (request: FastifyRequest) => request.user as { id?: string; role: UserRole };

export async function policyRoutes(fastify: FastifyInstance, options: PolicyRouteOptions) {
  const { policyService, authService, catalogService } = options;

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

  // GET /api/policies/rules/catalog - List catalog rules
  fastify.get('/rules/catalog', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!catalogService) return [];
    return catalogService.listRules();
  });

  // GET /api/policies/rules/catalog/:ruleId - Get a catalog rule
  fastify.get('/rules/catalog/:ruleId', async (request: FastifyRequest<{ Params: { ruleId: string } }>, reply: FastifyReply) => {
    if (!catalogService) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Catalog not available' } });
    const rule = catalogService.getRule(request.params.ruleId);
    if (!rule) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Rule not found in catalog' } });
    return rule;
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

  // POST /api/policies/:policyId/rules/add-from-catalog - Add or replace rules by id
  fastify.post('/:policyId/rules/add-from-catalog', async (request: FastifyRequest<{ Params: PolicyParams; Body: { rule_ids: string[]; overrides?: Record<string, Partial<Policy['rules'][number]>>; behavior?: 'replace' | 'skip' | 'duplicate' } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'publish_rules')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    if (!catalogService) {
      return reply.status(500).send({ error: { code: 'INTERNAL', message: 'Catalog service unavailable' } });
    }

    try {
      const policy = await policyService.getPolicyById(request.params.policyId);
      if (!policy) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
      }

      const behavior = request.body.behavior || 'replace';
      const overrides = request.body.overrides || {};
      const existingById = new Map(policy.rules.map(r => [r.rule_id, r]));
      const updated: typeof policy.rules = [...policy.rules];

      for (const id of request.body.rule_ids || []) {
        const base = catalogService.getRule(id);
        if (!base) continue;
        const merged = { ...base, ...(overrides[id] || {}) };
        const idx = updated.findIndex(r => r.rule_id === id);
        if (idx >= 0) {
          if (behavior === 'replace') {
            updated[idx] = merged as any;
          } else if (behavior === 'duplicate') {
            updated.push(merged as any);
          } // skip -> do nothing
        } else {
          updated.push(merged as any);
        }
      }

      // Keep ASC priority ordering
      updated.sort((a, b) => a.priority - b.priority);

      const next = { ...policy, rules: updated } as Policy;
      const saved = await policyService.updatePolicy(policy.policy_id, next, extractUser(request).id || 'system');
      return saved;
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
