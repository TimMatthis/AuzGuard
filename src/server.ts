// Main Fastify server for AuzGuard API
import 'dotenv/config';

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { PrismaClient, Prisma } from '@prisma/client';
import Ajv from 'ajv';

import { PolicyService } from './services/policy';
import { EvaluationService } from './services/evaluation';
import { AuditService } from './services/audit';
import { RouteService } from './services/routes';
import { AuthService } from './services/auth';
import { ModelGardenService } from './services/modelGarden';
import { PreprocessorService } from './services/preprocessor';
import { UserService } from './services/users';
import { UserGroupService } from './services/userGroups';

import { policyRoutes } from './routes/policy';
import { CatalogService } from './services/catalog';
import { evaluationRoutes } from './routes/evaluation';
import { auditRoutes } from './routes/audit';
import { routeRoutes } from './routes/routes';
import { overrideRoutes } from './routes/overrides';
import { routingConfigRoutes } from './routes/routingConfig';
import { RoutingProfilesService } from './services/routingProfiles';
import { brandingRoutes } from './routes/branding';
import { userRoutes } from './routes/users';

// Load JSON schemas
const ruleSchema: any = require('../schemas/auzguard_rule_schema_v1.json');
const rulesetExample: any = require('../schemas/auzguard_ruleset_au_base_v1.json');

// Initialize services
const prisma = new PrismaClient();
const ajv = new Ajv();

// Compose a Policy (ruleset) schema that allows an empty rules array on creation
const policySchema: any = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'AuzGuard Policy (Ruleset) Schema v1',
  type: 'object',
  properties: {
    policy_id: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: '^v\\d+\\.\\d+\\.\\d+$' },
    title: { type: 'string', minLength: 1 },
    jurisdiction: { type: 'string', minLength: 1 },
    evaluation_strategy: {
      type: 'object',
      properties: {
        order: { type: 'string' },
        conflict_resolution: { type: 'string' },
        default_effect: { type: 'string' }
      },
      required: ['order', 'conflict_resolution', 'default_effect']
    },
    rules: {
      type: 'array',
      items: ruleSchema,
      default: []
    }
  },
  required: ['policy_id', 'version', 'title', 'jurisdiction', 'evaluation_strategy', 'rules']
};

const policyValidator = ajv.compile(policySchema);

const userService = new UserService(prisma);
const userGroupService = new UserGroupService(prisma);
const authService = new AuthService(userService);
const policyService = new PolicyService(prisma, policyValidator);
const catalogService = new CatalogService();
const evaluationService = new EvaluationService();
const auditService = new AuditService(prisma, process.env.HASH_SALT || 'default-salt');
const routeService = new RouteService(prisma);
const modelGardenService = new ModelGardenService(prisma);
const preprocessorService = new PreprocessorService();
const routingProfilesService = new RoutingProfilesService(prisma);

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

function configureErrorHandling() {
  fastify.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }));

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    reply.status(statusCode).send({
      error: {
        code: getErrorCode(statusCode),
        message,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    });
  });
}

function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 400: return 'VALIDATION_ERROR';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMITED';
    default: return 'INTERNAL';
  }
}

async function registerPluginsAndRoutes() {
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://auzguard.com']
      : true
  });

  await fastify.register(jwt as any, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    sign: {
      issuer: process.env.JWT_ISSUER || 'auzguard',
      audience: process.env.JWT_AUDIENCE || 'auzguard-api'
    }
  } as any);

  await fastify.register(multipart);

  await fastify.register(policyRoutes, {
    prefix: '/api/policies',
    policyService,
    authService,
    catalogService
  });

  await fastify.register(evaluationRoutes, {
    prefix: '/api/evaluate',
    evaluationService,
    policyService,
    auditService
  });

  await fastify.register(auditRoutes, {
    prefix: '/api/audit',
    auditService,
    authService
  });

  await fastify.register(routeRoutes, {
    prefix: '/api/routes',
    routeService,
    authService,
    evaluationService,
    policyService,
    auditService,
    modelGardenService,
    preprocessorService
  });

  await fastify.register(routingConfigRoutes, {
    prefix: '/api/routes/config',
    authService,
    profilesService: routingProfilesService
  });

  await fastify.register(overrideRoutes, {
    prefix: '/api/overrides',
    evaluationService,
    policyService,
    auditService,
    authService
  });

  await fastify.register(brandingRoutes, { prefix: '/api' });

  await fastify.register(userRoutes, {
    prefix: '/api',
    userService,
    userGroupService,
    authService
  });

  // Serve frontend build and enable SPA fallback for non-API routes
  const staticRoot = path.join(__dirname, '..', 'frontend', 'dist');
  try {
    await fastify.register(fastifyStatic, {
      root: staticRoot,
      index: ['index.html'],
      wildcard: false,
      prefix: '/',
      decorateReply: true
    });

    // History API fallback: send index.html for non-API paths
    fastify.get('/*', (request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.callNotFound();
      }
      const indexPath = path.join(staticRoot, 'index.html');
      if (fs.existsSync(indexPath)) {
        reply.type('text/html').send(fs.readFileSync(indexPath));
      } else {
        reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Frontend not built. Run npm run build:frontend' } });
      }
    });
  } catch (err) {
    fastify.log.warn('Static serving not configured. Build the frontend (npm run build:frontend) or run it separately (npm run dev:frontend).');
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);

  try {
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    // Log startup error details before exiting so nodemon shows the cause
    try {
      const msg = err?.message || String(err);
      console.error('AuzGuard server startup failed:', msg);
      if ((err as any)?.stack) {
        console.error((err as any).stack);
      }
    } catch (_) {
      // no-op
    }
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function start() {
  try {
    await registerPluginsAndRoutes();
    configureErrorHandling();

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`AuzGuard API server listening on ${host}:${port}`);
    fastify.log.info('Next steps:');
    fastify.log.info('  1) UI (dev): http://localhost:3000');
    fastify.log.info('  2) UI (built): served from this server if frontend is built');
    fastify.log.info('  3) Sign in: pick a role; no password needed in preview');

    await seedInitialData();

  } catch (error) {
    const err = error as Error;
    try {
      const msg = err?.message || String(err);
      console.error('AuzGuard server startup failed during start():', msg);
      if ((err as any)?.stack) {
        console.error((err as any).stack);
      }
    } catch (_) {}
    process.exit(1);
  }
}

async function seedInitialData() {
  try {
    const [existingPolicies, existingTargets] = await Promise.all([
      prisma.policy.count(),
      prisma.routeTarget.count()
    ]);

    if (existingPolicies === 0) {
      fastify.log.info('Seeding initial policy data...');

      const baseRuleset = rulesetExample;

      await prisma.policy.create({
        data: {
          policy_id: baseRuleset.policy_id,
          version: baseRuleset.version,
          title: baseRuleset.title,
          jurisdiction: baseRuleset.jurisdiction,
          evaluation_strategy: baseRuleset.evaluation_strategy as Prisma.InputJsonValue,
          rules: baseRuleset.rules as Prisma.InputJsonValue,
          published_by: 'system'
        }
      });

      await prisma.modelPool.createMany({
        data: [
          {
            pool_id: 'onshore_default_pool',
            region: 'AU',
            description: 'Default Australian onshore pool optimised for compliance-first workloads',
            tags: { region: 'AU', persistence: true, default_pool: true } as Prisma.InputJsonValue,
            targets: [
              { provider: 'openai', endpoint: 'gpt-4o-mini', weight: 60 },
              { provider: 'google_generative_ai', endpoint: 'gemini-1.5-pro', weight: 25 },
              { provider: 'ollama', endpoint: 'llama3.1', weight: 15 }
            ] as Prisma.InputJsonValue,
            health: { status: 'healthy', last_check: new Date().toISOString() } as Prisma.InputJsonValue
          },
          {
            pool_id: 'sandbox_no_persist_pool',
            region: 'AU',
            description: 'Local developer sandbox pool (no persistence)',
            tags: { region: 'AU', persistence: false, sandbox: true } as Prisma.InputJsonValue,
            targets: [
              { provider: 'ollama', endpoint: 'phi3-mini', weight: 100 }
            ] as Prisma.InputJsonValue,
            health: { status: 'healthy', last_check: new Date().toISOString() } as Prisma.InputJsonValue
          },
          {
            pool_id: 'bias_audited_pool',
            region: 'AU',
            description: 'Bias-audited pool for sensitive and high-risk AI workloads',
            tags: { region: 'AU', bias_audited: true, compliance: 'high' } as Prisma.InputJsonValue,
            targets: [
              { provider: 'openai', endpoint: 'gpt-4o', weight: 100 }
            ] as Prisma.InputJsonValue,
            health: { status: 'healthy', last_check: new Date().toISOString() } as Prisma.InputJsonValue
          }
        ]
      });
    }

    if (existingTargets === 0) {
      fastify.log.info('Seeding initial route target profiles...');

      await prisma.routeTarget.createMany({
        data: [
          {
            pool_id: 'onshore_default_pool',
            provider: 'openai',
            endpoint: 'gpt-4o-mini',
            weight: 60,
            region: 'AU',
            is_active: true,
            profile: {
              profile_id: 'openai_gpt4omini_au',
              provider: 'openai',
              endpoint: 'gpt-4o-mini',
              capabilities: ['gpt-4o-mini', 'json-mode', 'vision-lite'],
              supported_data_classes: ['cdr_data', 'general'],
              compliance: {
                data_residency: 'AU',
                certifications: ['IRAP'],
                notes: 'OpenAI regional deployment hosted in AU sovereign region.'
              },
              performance: {
                avg_latency_ms: 160,
                p95_latency_ms: 310,
                availability: 0.995,
                throughput_tps: 65
              },
              cost: {
                currency: 'AUD',
                per_1k_tokens: 0.011
              },
              last_benchmarked: new Date().toISOString(),
              tags: {
                default_model: 'gpt-4o-mini',
                task_types: ['chat_completion', 'analysis'],
                cost_tier: 'balanced',
                irap: true
              }
            } as Prisma.InputJsonValue
          },
          {
            pool_id: 'onshore_default_pool',
            provider: 'google_generative_ai',
            endpoint: 'gemini-1.5-pro',
            weight: 25,
            region: 'AU',
            is_active: true,
            profile: {
              profile_id: 'gemini_15_pro_au',
              provider: 'google_generative_ai',
              endpoint: 'gemini-1.5-pro',
              capabilities: ['gemini-1.5-pro', 'multimodal'],
              supported_data_classes: ['cdr_data', 'general'],
              compliance: {
                data_residency: 'AU',
                certifications: ['IRAP', 'ISO27001']
              },
              performance: {
                avg_latency_ms: 210,
                p95_latency_ms: 340,
                availability: 0.992,
                throughput_tps: 50
              },
              cost: {
                currency: 'AUD',
                per_1k_tokens: 0.009
              },
              last_benchmarked: new Date().toISOString(),
              tags: {
                default_model: 'gemini-1.5-pro',
                task_types: ['reasoning', 'multimodal'],
                cost_tier: 'value'
              }
            } as Prisma.InputJsonValue
          },
          {
            pool_id: 'onshore_default_pool',
            provider: 'ollama',
            endpoint: 'llama3.1',
            weight: 15,
            region: 'AU',
            is_active: true,
            profile: {
              profile_id: 'ollama_llama31_local',
              provider: 'ollama',
              endpoint: 'llama3.1',
              capabilities: ['chat', 'function-calling'],
              supported_data_classes: ['general'],
              compliance: {
                data_residency: 'AU',
                notes: 'Self-hosted deployment kept within sovereign network boundary.'
              },
              performance: {
                avg_latency_ms: 240,
                p95_latency_ms: 420,
                availability: 0.985,
                throughput_tps: 25
              },
              cost: {
                currency: 'AUD',
                per_1k_tokens: 0.003
              },
              last_benchmarked: new Date().toISOString(),
              tags: {
                default_model: 'llama3.1:8b',
                task_types: ['chat_completion', 'development'],
                deployment: 'local',
                cost_tier: 'economy'
              }
            } as Prisma.InputJsonValue
          },
          {
            pool_id: 'sandbox_no_persist_pool',
            provider: 'ollama',
            endpoint: 'phi3-mini',
            weight: 100,
            region: 'AU',
            is_active: true,
            profile: {
              profile_id: 'ollama_phi3_sandbox',
              provider: 'ollama',
              endpoint: 'phi3-mini',
              capabilities: ['chat', 'code'],
              supported_data_classes: ['test_data'],
              compliance: {
                data_residency: 'AU',
                notes: 'Sandbox environment with ephemeral local storage.'
              },
              performance: {
                avg_latency_ms: 260,
                p95_latency_ms: 430,
                availability: 0.98,
                throughput_tps: 20
              },
              cost: {
                currency: 'AUD',
                per_1k_tokens: 0.0
              },
              last_benchmarked: new Date().toISOString(),
              tags: {
                default_model: 'phi3:mini',
                sandbox: true,
                persistence: false,
                task_types: ['development', 'testing']
              }
            } as Prisma.InputJsonValue
          },
          {
            pool_id: 'bias_audited_pool',
            provider: 'openai',
            endpoint: 'gpt-4o',
            weight: 100,
            region: 'AU',
            is_active: true,
            profile: {
              profile_id: 'openai_gpt4o_audited',
              provider: 'openai',
              endpoint: 'gpt-4o',
              capabilities: ['gpt-4o', 'guardrails'],
              supported_data_classes: ['sensitive_personal', 'demographic_data'],
              compliance: {
                data_residency: 'AU',
                certifications: ['IRAP'],
                notes: 'Independent bias auditing completed Q2 2025 with quarterly refresh cadence.'
              },
              performance: {
                avg_latency_ms: 200,
                p95_latency_ms: 330,
                availability: 0.994,
                throughput_tps: 35
              },
              cost: {
                currency: 'AUD',
                per_1k_tokens: 0.018
              },
              last_benchmarked: new Date().toISOString(),
              tags: {
                default_model: 'gpt-4o',
                task_types: ['high_risk', 'analysis'],
                bias_audited: true,
                cost_tier: 'premium'
              }
            } as Prisma.InputJsonValue
          }
        ]
      });
    }

    if (existingPolicies === 0 || existingTargets === 0) {
      fastify.log.info('Initial data seeded successfully');
    }

    // Ensure base policy always contains the default rules (idempotent upsert of rules)
    await ensureBaseRulesPresent();
    await ensureProfanityRulesEverywhere();
  } catch (error) {
    const err = error as Error;
  }
}

async function ensureBaseRulesPresent() {
  try {
    const baseRuleset: any = rulesetExample;
    const policyId = baseRuleset.policy_id;
    if (!policyId) return;

    const existing = await prisma.policy.findUnique({ where: { policy_id: policyId } });
    if (!existing) return; // Created earlier or unavailable; nothing to merge

    const currentRules: any[] = Array.isArray((existing as any).rules) ? (existing as any).rules : [];
    const desiredRules: any[] = Array.isArray(baseRuleset.rules) ? baseRuleset.rules : [];

    const desiredById = new Map<string, any>(desiredRules.map((r: any) => [r.rule_id, r]));
    const seen = new Set<string>();
    const merged: any[] = [];

    // First, insert/replace all desired base rules in their desired order
    for (const rule of desiredRules) {
      if (!rule?.rule_id) continue;
      merged.push(rule);
      seen.add(rule.rule_id);
    }

    // Then, append any existing custom rules not part of the base set
    for (const r of currentRules) {
      const id = r?.rule_id;
      if (!id || desiredById.has(id)) continue;
      merged.push(r);
    }

    await prisma.policy.update({
      where: { policy_id: policyId },
      data: {
        rules: (merged as unknown) as Prisma.InputJsonValue,
        published_by: 'system'
      }
    });
    fastify.log.info(`Synchronized base rules into policy ${policyId} (total ${merged.length})`);
  } catch (e) {
    fastify.log.warn('Failed to ensure base policy rules are present');
  }
}

async function ensureProfanityRulesEverywhere() {
  try {
    const profBlock: any = (catalogService as any)?.getRule?.('PROFANITY_BLOCK_STRICT');
    const profWarn: any = (catalogService as any)?.getRule?.('PROFANITY_WARN_INTERNAL');
    if (!profBlock && !profWarn) return;

    const policies = await prisma.policy.findMany();
    for (const p of policies) {
      const rules: any[] = Array.isArray((p as any).rules) ? ((p as any).rules as any[]) : [];
      const byId = new Set<string>(rules.map(r => r?.rule_id).filter(Boolean));
      const toAdd: any[] = [];
      if (profBlock && !byId.has(profBlock.rule_id)) toAdd.push(profBlock);
      if (profWarn && !byId.has(profWarn.rule_id)) toAdd.push(profWarn);
      if (!toAdd.length) continue;

      const merged = [...rules, ...toAdd].sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999));
      await prisma.policy.update({ where: { policy_id: (p as any).policy_id }, data: { rules: (merged as any) } });
      fastify.log.info(`Added profanity rules to policy ${(p as any).policy_id}`);
    }
  } catch (e) {
    fastify.log.warn('Failed to ensure profanity rules across policies');
  }
}

start();













