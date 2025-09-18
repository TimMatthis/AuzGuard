// Evaluation API routes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EvaluationService } from '../services/evaluation';
import { PolicyService } from '../services/policy';
import { AuditService } from '../services/audit';
import { SimulationInput, SimulationResult } from '../types';

interface EvaluationRouteOptions {
  evaluationService: EvaluationService;
  policyService: PolicyService;
  auditService: AuditService;
}

export async function evaluationRoutes(fastify: FastifyInstance, options: EvaluationRouteOptions) {
  const { evaluationService, policyService, auditService } = options;

  // POST /api/evaluate - Evaluate policy against request
  fastify.post('/', async (request: FastifyRequest<{ Body: SimulationInput }>, reply: FastifyReply) => {
    try {
      const result = await evaluationService.evaluate(
        request.body.policy_id,
        request.body.request,
        policyService,
        auditService,
        request.headers['x-org-id'] as string,
        request.headers['x-actor-id'] as string
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

  // POST /api/evaluate/simulate - Simulate evaluation (alias)
  fastify.post('/simulate', async (request: FastifyRequest<{ Body: SimulationInput }>, reply: FastifyReply) => {
    try {
      const result = await evaluationService.simulate(
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
