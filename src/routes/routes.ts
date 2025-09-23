// Routes API for model pools, profiling, metrics, and routing execution

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RouteService } from '../services/routes';
import { AuthService } from '../services/auth';
import { EvaluationService } from '../services/evaluation';
import { PolicyService } from '../services/policy';
import { AuditService } from '../services/audit';
import { ModelGardenService } from '../services/modelGarden';
import { ModelPool, RouteTarget, RoutingRequest, RoutingResponse, UserRole } from '../types';
import { PreprocessorService } from '../services/preprocessor';

interface RouteParams {
  poolId: string;
  id: string;
}

interface RouteRouteOptions {
  routeService: RouteService;
  authService: AuthService;
  evaluationService: EvaluationService;
  policyService: PolicyService;
  auditService: AuditService;
  modelGardenService: ModelGardenService;
  preprocessorService?: PreprocessorService;
}

const extractUser = (request: FastifyRequest) => request.user as { id?: string; role: UserRole };

export async function routeRoutes(fastify: FastifyInstance, options: RouteRouteOptions) {
  const { routeService, authService, evaluationService, policyService, auditService, modelGardenService, preprocessorService } = options;

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

  // GET /api/routes/pools - Get all model pools
  fastify.get('/pools', async () => routeService.getAllModelPools());

  // GET /api/routes/pools/:poolId - Get specific model pool
  fastify.get('/pools/:poolId', async (request: FastifyRequest<{ Params: RouteParams }>, reply: FastifyReply) => {
    const pool = await routeService.getModelPoolById(request.params.poolId);

    if (!pool) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Model pool not found' } });
    }

    return pool;
  });

  // POST /api/routes/pools - Create model pool
  fastify.post('/pools', async (request: FastifyRequest<{ Body: Omit<ModelPool, 'health'> }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await routeService.createModelPool(request.body);
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // PUT /api/routes/pools/:poolId - Update model pool
  fastify.put('/pools/:poolId', async (request: FastifyRequest<{ Params: RouteParams; Body: Partial<ModelPool> }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await routeService.updateModelPool(request.params.poolId, request.body);
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // DELETE /api/routes/pools/:poolId - Delete model pool
  fastify.delete('/pools/:poolId', async (request: FastifyRequest<{ Params: RouteParams }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      await routeService.deleteModelPool(request.params.poolId);
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

  // GET /api/routes/targets - Get all route targets
  fastify.get('/targets', async () => routeService.getAllRouteTargets());

  // POST /api/routes/targets - Create route target
  fastify.post('/targets', async (request: FastifyRequest<{ Body: Omit<RouteTarget, 'id'> }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await routeService.createRouteTarget(request.body);
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // PUT /api/routes/targets/:id - Update route target
  fastify.put('/targets/:id', async (request: FastifyRequest<{ Params: RouteParams; Body: Partial<RouteTarget> }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await routeService.updateRouteTarget(request.params.id, request.body);
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // DELETE /api/routes/targets/:id - Delete route target
  fastify.delete('/targets/:id', async (request: FastifyRequest<{ Params: RouteParams }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      await routeService.deleteRouteTarget(request.params.id);
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

  // GET /api/routes/pools/:poolId/targets - Get targets for a pool
  fastify.get('/pools/:poolId/targets', async (request: FastifyRequest<{ Params: RouteParams }>) => {
    return routeService.getRouteTargetsForPool(request.params.poolId);
  });

  // POST /api/routes/pools/:poolId/health - Update pool health
  fastify.post('/pools/:poolId/health', async (request: FastifyRequest<{ Params: RouteParams; Body: { status: 'healthy' | 'degraded' | 'unhealthy'; errors?: string[] } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      await routeService.updatePoolHealth(request.params.poolId, request.body);
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

  // GET /api/routes/metrics/summary - Dashboard metrics
  fastify.get('/metrics/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);
    if (!authService.canPerformAction(user.role, 'read')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    return modelGardenService.getDashboardMetrics();
  });

  // GET /api/routes/metrics/paths - Path graph for routing flows (policy -> rule -> pool -> target)
  fastify.get('/metrics/paths', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);
    if (!authService.canPerformAction(user.role, 'read')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    const from = request.query && (request.query as any)['from'] ? new Date(String((request.query as any)['from'])) : undefined;
    const to = request.query && (request.query as any)['to'] ? new Date(String((request.query as any)['to'])) : undefined;

    const graph = await modelGardenService.getRoutingPathGraph({ from, to });
    return graph;
  });

  // POST /api/routes/pools/:poolId/preview-ranking - Preview ranking given preferences
  fastify.post('/pools/:poolId/preview-ranking', async (
    request: FastifyRequest<{ Params: RouteParams; Body: { preferences?: RoutingPreference } }>,
    reply: FastifyReply
  ) => {
    const user = extractUser(request);
    if (!authService.canPerformAction(user.role, 'read')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    const pool = await routeService.getModelPoolById(request.params.poolId);
    if (!pool) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Model pool not found' } });
    }

    const targets = await routeService.getRouteTargetsForPool(request.params.poolId);
    if (!targets.length) {
      return reply.status(400).send({ error: { code: 'ROUTING_ERROR', message: 'No active targets for pool' } });
    }

    const decision = routeService.buildRoutingDecision(pool, targets, request.body.preferences);
    return decision;
  });

  // POST /api/routes/execute - Execute routing decision and invoke downstream model
  fastify.post('/execute', async (request: FastifyRequest<{ Body: RoutingRequest }>, reply: FastifyReply) => {
    try {
      const orgId = request.body.org_id || (request.headers['x-org-id'] as string | undefined);
      const actorId = request.body.actor_id || (request.headers['x-actor-id'] as string | undefined);

      // Enrich payload by inspecting message content (PII etc.)
      const enrichedPayload = preprocessorService
        ? preprocessorService.enrich(request.body.request)
        : request.body.request;

      const evaluation = await evaluationService.evaluate(
        request.body.policy_id,
        enrichedPayload,
        policyService,
        auditService,
        orgId,
        actorId
      );

      const requestPreview = buildPayloadPreview(request.body.request);

      let routeDecision: RoutingResponse['route_decision'];
      let modelInvocation: RoutingResponse['model_invocation'];
      let modelResponse: unknown;
      let latencyMs: number | undefined;

      const isExecutable = ['ALLOW', 'ROUTE', 'WARN_ROUTE'].includes(evaluation.decision);

      if (isExecutable) {
        const preferences = request.body.preferences ?? {};
        const preferencePoolId = (preferences as Record<string, unknown>)?.['pool_id'] as string | undefined;
        let poolId = evaluation.route_to || preferencePoolId || process.env.DEFAULT_MODEL_POOL || undefined;

        if (!poolId) {
          const pools = await routeService.getAllModelPools();
          poolId = pools[0]?.pool_id;
        }

        if (!poolId) {
          return reply.status(400).send({ error: { code: 'ROUTING_ERROR', message: 'No model pool available for eligible request' } });
        }

        const pool = await routeService.getModelPoolById(poolId);
        if (!pool) {
          return reply.status(404).send({ error: { code: 'NOT_FOUND', message: `Model pool ${poolId} not found` } });
        }

        const targets = await routeService.getRouteTargetsForPool(poolId);
        if (!targets.length) {
          return reply.status(400).send({ error: { code: 'ROUTING_ERROR', message: `No active targets available for pool ${poolId}` } });
        }

        const decision = routeService.buildRoutingDecision(pool, targets, request.body.preferences);
        routeDecision = decision;

        const selectedCandidate = decision.candidates.find(candidate => candidate.selected) || decision.candidates[0];

        if (selectedCandidate) {
          const outcome = await modelGardenService.invoke({
            policyId: request.body.policy_id,
            decision: evaluation.decision,
            matchedRule: evaluation.matched_rule,
            modelPoolId: pool.pool_id,
            orgId,
            auditLogId: evaluation.audit_log_id,
            requestPayload: enrichedPayload,
            target: selectedCandidate.target
          });

          modelInvocation = outcome.summary;
          modelResponse = outcome.rawResponse;
          latencyMs = outcome.summary.latency_ms;
        }
      }

      const response: RoutingResponse = {
        ...evaluation,
        route_decision: routeDecision,
        model_invocation: modelInvocation,
        model_response: modelResponse,
        latency_ms: latencyMs,
        request_payload: requestPreview
      };

      return response;
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: 'ROUTING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });
}

function buildPayloadPreview(
  payload: Record<string, unknown>,
  options: { maxStringLength?: number; maxArrayLength?: number; maxDepth?: number; maxObjectEntries?: number } = {}
): Record<string, unknown> {
  const maxStringLength = options.maxStringLength ?? 512;
  const maxArrayLength = options.maxArrayLength ?? 20;
  const maxDepth = options.maxDepth ?? 4;
  const maxObjectEntries = options.maxObjectEntries ?? 40;

  const previewValue = (value: unknown, depth: number): unknown => {
    if (depth > maxDepth) {
      return '[truncated depth]';
    }

    if (typeof value === 'string') {
      return value.length > maxStringLength ? value.slice(0, maxStringLength) + '...' : value;
    }

    if (Array.isArray(value)) {
      const limited = value.slice(0, maxArrayLength).map(item => previewValue(item, depth + 1));
      if (value.length > maxArrayLength) {
        limited.push('[+' + (value.length - maxArrayLength) + ' more items truncated]');
      }
      return limited;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      const limitedEntries = entries.slice(0, maxObjectEntries);
      const result: Record<string, unknown> = {};

      for (const [key, entryValue] of limitedEntries) {
        result[key] = previewValue(entryValue, depth + 1);
      }

      if (entries.length > maxObjectEntries) {
        result['__truncated__'] = '+' + (entries.length - maxObjectEntries) + ' more keys';
      }

      return result;
    }

    return value;
  };

  const previewed = previewValue(payload, 0);
  return typeof previewed === 'object' && previewed !== null ? (previewed as Record<string, unknown>) : { value: previewed };
}
