// Evaluation API routes

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EvaluationService } from '../services/evaluation';
import { PolicyService } from '../services/policy';
import { AuditService } from '../services/audit';
import { SimulationInput, SimulationResult } from '../types';
import { PreprocessorService } from '../services/preprocessor';

interface EvaluationRouteOptions {
  evaluationService: EvaluationService;
  policyService: PolicyService;
  auditService: AuditService;
}

export async function evaluationRoutes(fastify: FastifyInstance, options: EvaluationRouteOptions) {
  const { evaluationService, policyService, auditService } = options;
  const preprocessor = new PreprocessorService();

  // POST /api/evaluate - Evaluate policy against request
  fastify.post('/', async (request: FastifyRequest<{ Body: SimulationInput }>, reply: FastifyReply) => {
    try {
      // Enrich payload to keep Simulator consistent with router decisions
      const enriched = preprocessor.enrich(request.body.request);
      const result = await evaluationService.evaluate(
        request.body.policy_id,
        enriched,
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
      const enriched = { ...request.body, request: preprocessor.enrich(request.body.request) } as SimulationInput;
      const result = await evaluationService.simulate(
        enriched,
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
