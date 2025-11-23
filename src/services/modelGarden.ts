import { Prisma, PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetch } from 'undici';
import crypto from 'crypto';
import { Effect, GatewayDashboardMetrics, RouteTarget } from '../types';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ModelInvokeOptions = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

type ModelConnectorResult = {
  outputText: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  rawResponse: unknown;
};

interface ModelConnector {
  readonly provider: string;
  isConfigured(): boolean;
  invoke(options: ModelInvokeOptions): Promise<ModelConnectorResult>;
}

class OpenAIConnector implements ModelConnector {
  public readonly provider = 'openai';
  private client: OpenAI | null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    this.client = key ? new OpenAI({ apiKey: key }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async invoke(options: ModelInvokeOptions): Promise<ModelConnectorResult> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: options.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens,
      messages: options.messages
    });
    const latencyMs = Date.now() - start;

    const text = response.choices?.[0]?.message?.content ?? '';
    const promptTokens = response.usage?.prompt_tokens;
    const completionTokens = response.usage?.completion_tokens;
    const totalTokens = response.usage?.total_tokens;

    return {
      outputText: text,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      rawResponse: response
    };
  }
}

class GeminiConnector implements ModelConnector {
  public readonly provider = 'google_generative_ai';
  private client: GoogleGenerativeAI | null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    this.client = key ? new GoogleGenerativeAI(key) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async invoke(options: ModelInvokeOptions): Promise<ModelConnectorResult> {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.client.getGenerativeModel({ model: options.model });

    const start = Date.now();
    const response = await model.generateContent({
      contents: this.transformMessages(options.messages),
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens
      }
    });
    const latencyMs = Date.now() - start;

    const text = response.response?.text() ?? '';
    const usageMetadata = (response.response as any)?.usageMetadata as {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    } | undefined;

    return {
      outputText: text,
      latencyMs,
      promptTokens: usageMetadata?.promptTokenCount,
      completionTokens: usageMetadata?.candidatesTokenCount,
      totalTokens: usageMetadata?.totalTokenCount,
      rawResponse: response
    };
  }

  private transformMessages(messages: ChatMessage[]) {
    return messages.map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    }));
  }
}

class OllamaConnector implements ModelConnector {
  public readonly provider = 'ollama';
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  isConfigured(): boolean {
    return true;
  }

  async invoke(options: ModelInvokeOptions): Promise<ModelConnectorResult> {
    const endpoint = this.baseUrl.replace(/\/$/, '') + '/api/chat';

    const body = {
      model: options.model,
      stream: false,
      messages: options.messages.map(message => ({
        role: message.role,
        content: message.content
      })),
      options: {
        temperature: options.temperature ?? 0.2,
        num_predict: options.maxTokens
      }
    };

    const start = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      throw new Error('Ollama invocation failed: ' + text);
    }

    const payload = (await response.json()) as { message?: { content?: string } };
    const text = payload.message?.content ?? '';

    return {
      outputText: text,
      latencyMs,
      rawResponse: payload
    };
  }
}

export interface ModelInvocationContext {
  policyId: string;
  decision: string;
  matchedRule?: string;
  modelPoolId?: string;
  orgId?: string;
  auditLogId?: string;
  requestPayload: Record<string, unknown>;
  target: RouteTarget;
}

export interface ModelInvocationOutcome {
  summary: {
    invocation_id: string;
    provider: string;
    model_identifier: string;
    latency_ms: number;
    estimated_cost_aud?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    response_excerpt?: string;
    error_message?: string;
  };
  rawResponse?: unknown;
}

export class ModelGardenService {
  private connectors: Map<string, ModelConnector>;

  constructor(private prisma: PrismaClient) {
    this.connectors = new Map();

    // Initialize connectors with environment variables as fallback
    this.initializeConnectors();
  }

  // Initialize connectors for a specific tenant using stored API keys
  async initializeTenantConnectors(tenantPrisma: PrismaClient): Promise<void> {
    const connectors = new Map<string, ModelConnector>();

    // Get all active API keys for this tenant
    const apiKeys = await tenantPrisma.apiKey.findMany({
      where: { is_active: true }
    });

    // Create a map of provider -> decrypted key
    const keyMap = new Map<string, string>();
    for (const apiKey of apiKeys) {
      try {
        const decryptedKey = this.decryptApiKey(apiKey.encrypted_key);
        keyMap.set(apiKey.provider, decryptedKey);

        // Update last_used_at
        await tenantPrisma.apiKey.update({
          where: { id: apiKey.id },
          data: { last_used_at: new Date() }
        });
      } catch (error) {
        console.warn(`Failed to decrypt API key for provider ${apiKey.provider}:`, error);
      }
    }

    // Initialize connectors with tenant-specific keys
    const openai = new OpenAIConnector(keyMap.get('openai') || keyMap.get('azure_openai'));
    if (openai.isConfigured()) {
      connectors.set('openai', openai);
      connectors.set('azure_openai', openai);
    }

    const gemini = new GeminiConnector(keyMap.get('gemini') || keyMap.get('google_generative_ai') || keyMap.get('gcp_vertex_ai'));
    if (gemini.isConfigured()) {
      connectors.set('google_generative_ai', gemini);
      connectors.set('gcp_vertex_ai', gemini);
    }

    const ollama = new OllamaConnector();
    if (ollama.isConfigured()) {
      connectors.set('ollama', ollama);
    }

    this.connectors = connectors;
  }

  private initializeConnectors(): void {
    const openai = new OpenAIConnector();
    if (openai.isConfigured()) {
      this.connectors.set('openai', openai);
      this.connectors.set('azure_openai', openai);
    }

    const gemini = new GeminiConnector();
    if (gemini.isConfigured()) {
      this.connectors.set('google_generative_ai', gemini);
      this.connectors.set('gcp_vertex_ai', gemini);
    }

    const ollama = new OllamaConnector();
    if (ollama.isConfigured()) {
      this.connectors.set('ollama', ollama);
    }
  }

  private decryptApiKey(encryptedKey: string): string {
    // Use the same encryption utilities as the API key routes
    const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 'your-32-character-encryption-key-here';
    const ALGORITHM = 'aes-256-gcm';

    const parts = encryptedKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async invoke(context: ModelInvocationContext): Promise<ModelInvocationOutcome> {
    const modelIdentifier = this.resolveModelIdentifier(context.target);
    const messages = this.buildMessages(context.requestPayload);
    const temperature = this.extractNumber(context.requestPayload, 'temperature', 0.2);
    const maxTokens = this.extractNumber(context.requestPayload, 'max_tokens');

    const connector = this.resolveConnector(context.target);

    if (!connector) {
      if ((process.env.MODEL_GARDEN_STUB_RESPONSES ?? 'true') !== 'false') {
        const stubResult = this.buildStubResult(context, modelIdentifier, messages);
        const summary = await this.persistInvocation(context, stubResult);
        return { summary, rawResponse: stubResult.rawResponse };
      }

      const summary = await this.persistInvocation(
        context,
        { outputText: '', latencyMs: 0, rawResponse: null },
        new Error('No connector configured for provider ' + context.target.provider)
      );
      return { summary };
    }

    try {
      const result = await connector.invoke({
        model: modelIdentifier,
        messages,
        temperature,
        maxTokens
      });

      const summary = await this.persistInvocation(context, result);
      return { summary, rawResponse: result.rawResponse };
    } catch (error) {
      const summary = await this.persistInvocation(
        context,
        { outputText: '', latencyMs: 0, rawResponse: null },
        error
      );
      return { summary };
    }
  }

  async getDashboardMetrics(): Promise<GatewayDashboardMetrics> {
    try {
      const since = new Date();
      since.setHours(0, 0, 0, 0);

      const [invocationAggregate, latencySamples, totalDecisions, blockedDecisions, overrideDecisions, violationGroups, modelUsageGroups] = await Promise.all([
        this.prisma.modelInvocation.aggregate({
          _count: { _all: true },
          _avg: { latency_ms: true },
          where: { created_at: { gte: since } }
        }),
        this.prisma.modelInvocation.findMany({
          where: { created_at: { gte: since } },
          select: { latency_ms: true },
          orderBy: { latency_ms: 'asc' }
        }),
        this.prisma.auditLog.count({ where: { timestamp: { gte: since } } }),
        this.prisma.auditLog.count({ where: { timestamp: { gte: since }, effect: 'BLOCK' } }),
        this.prisma.auditLog.count({ where: { timestamp: { gte: since }, effect: 'REQUIRE_OVERRIDE' } }),
        this.prisma.modelInvocation.groupBy({
          by: ['policy_id', 'rule_id', 'decision'],
          where: {
            created_at: { gte: since },
            decision: { in: ['BLOCK', 'REQUIRE_OVERRIDE'] }
          },
          _count: { _all: true }
        }),
        this.prisma.modelInvocation.groupBy({
          by: ['provider', 'model_identifier'],
          where: { created_at: { gte: since } },
          _count: { _all: true },
          _avg: { latency_ms: true },
          _sum: { latency_ms: true }
        })
      ]);

      const totalLatencies = latencySamples.map(sample => sample.latency_ms ?? 0).filter(value => Number.isFinite(value));
      const p95Latency = totalLatencies.length ? this.computePercentile(totalLatencies as number[], 0.95) : 0;

      const totalRequests = totalDecisions;
      const blockRate = totalRequests > 0 ? blockedDecisions / totalRequests : 0;

      const sortedViolations = violationGroups
        .map(group => ({
          policy_id: group.policy_id,
          rule_id: group.rule_id ?? undefined,
          decision: group.decision as Effect,
          count: group._count?._all ?? 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

      const modelUsage = modelUsageGroups
        .map(group => ({
          provider: group.provider,
          model_identifier: group.model_identifier,
          count: group._count?._all ?? 0,
          average_latency_ms: group._avg.latency_ms ?? 0,
          total_latency_ms: group._sum.latency_ms ?? 0
        }))
        .sort((a, b) => b.count - a.count);

      return {
        requests_today: totalRequests,
        block_rate: Number(blockRate.toFixed(4)),
        overrides_required: overrideDecisions,
        average_latency_ms: invocationAggregate._avg.latency_ms ?? 0,
        p95_latency_ms: p95Latency,
        policy_violation_breakdown: sortedViolations,
        model_usage: modelUsage
      };
    } catch (error) {
      console.warn('Failed to compute gateway metrics', error);
      return {
        requests_today: 0,
        block_rate: 0,
        overrides_required: 0,
        average_latency_ms: 0,
        p95_latency_ms: 0,
        policy_violation_breakdown: [],
        model_usage: []
      };
    }
  }

  async getRoutingPathGraph(params: { from?: Date; to?: Date } = {}) {
    const where: any = {};
    if (params.from || params.to) {
      where.created_at = {};
      if (params.from) where.created_at.gte = params.from;
      if (params.to) where.created_at.lte = params.to;
    } else {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      where.created_at = { gte: since };
    }

    // Group by policy -> rule -> pool -> target to build a simple path graph
    const groups = await this.prisma.modelInvocation.groupBy({
      by: ['policy_id', 'rule_id', 'model_pool', 'provider', 'model_identifier', 'decision'],
      where,
      _count: { _all: true }
    });

    type Node = { id: string; type: 'policy'|'rule'|'pool'|'target'; label: string };
    type Edge = { source: string; target: string; count: number };
    const nodes = new Map<string, Node>();
    const edges: Edge[] = [];
    const nodeCounts = new Map<string, number>();

    for (const g of groups) {
      const policyId = g.policy_id || 'unknown_policy';
      const ruleId = g.rule_id || 'no_match';
      const poolId = g.model_pool || 'unknown_pool';
      const targetId = `${g.provider}:${g.model_identifier}`;
      const count = g._count?._all ?? 0;
      const decision = (g as any).decision as string | undefined;

      const policyNodeId = `policy:${policyId}`;
      const ruleNodeId = `rule:${ruleId}`;
      const poolNodeId = `pool:${poolId}`;
      const targetNodeId = `target:${targetId}`;

      if (!nodes.has(policyNodeId)) nodes.set(policyNodeId, { id: policyNodeId, type: 'policy', label: policyId });
      if (!nodes.has(ruleNodeId)) nodes.set(ruleNodeId, { id: ruleNodeId, type: 'rule', label: ruleId });
      if (!nodes.has(poolNodeId)) nodes.set(poolNodeId, { id: poolNodeId, type: 'pool', label: poolId });
      if (!nodes.has(targetNodeId)) nodes.set(targetNodeId, { id: targetNodeId, type: 'target', label: targetId });

      // Edges policy->rule, rule->pool, pool->target accumulate counts
      edges.push({ source: policyNodeId, target: ruleNodeId, count, decision } as any);
      edges.push({ source: ruleNodeId, target: poolNodeId, count, decision } as any);
      edges.push({ source: poolNodeId, target: targetNodeId, count, decision } as any);

      // Node totals
      nodeCounts.set(ruleNodeId, (nodeCounts.get(ruleNodeId) || 0) + count);
      nodeCounts.set(poolNodeId, (nodeCounts.get(poolNodeId) || 0) + count);
      nodeCounts.set(targetNodeId, (nodeCounts.get(targetNodeId) || 0) + count);
      nodeCounts.set(policyNodeId, (nodeCounts.get(policyNodeId) || 0) + count);
    }

    // Combine duplicate edges by (source,target)
    const edgeMap = new Map<string, any>();
    for (const e of edges as any[]) {
      const key = `${e.source}->${e.target}->${e.decision || 'any'}`;
      const prev = edgeMap.get(key);
      if (prev) prev.count += e.count; else edgeMap.set(key, { ...e });
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edgeMap.values()),
      node_counts: Object.fromEntries(nodeCounts)
    };
  }

  private resolveConnector(target: RouteTarget): ModelConnector | undefined {
    if (this.connectors.has(target.provider)) {
      return this.connectors.get(target.provider);
    }

    const profileProvider = target.profile?.provider ? String(target.profile.provider) : undefined;
    return profileProvider ? this.connectors.get(profileProvider) : undefined;
  }

  private resolveModelIdentifier(target: RouteTarget): string {
    const tags = target.profile?.tags as Record<string, unknown> | undefined;
    const fromTags = tags ? tags['default_model'] : undefined;
    if (typeof fromTags === 'string' && fromTags.length > 0) {
      return fromTags;
    }

    if (target.profile?.capabilities && target.profile.capabilities.length > 0) {
      return String(target.profile.capabilities[0]);
    }

    return target.endpoint || target.provider;
  }

  private buildMessages(payload: Record<string, unknown>): ChatMessage[] {
    const messages = payload.messages;
    if (Array.isArray(messages) && messages.length) {
      return messages.map(item => {
        if (typeof item === 'object' && item !== null) {
          const role = (item as Record<string, unknown>).role ?? 'user';
          const content = (item as Record<string, unknown>).content ?? '';
          return { role: role as ChatMessage['role'], content: String(content) };
        }
        return { role: 'user', content: String(item) };
      });
    }

    const message = typeof payload.message === 'string'
      ? payload.message
      : JSON.stringify(payload);

    return [
      {
        role: 'user',
        content: message
      }
    ];
  }

  private extractNumber(payload: Record<string, unknown>, key: string, fallback?: number): number | undefined {
    const value = payload[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private buildStubResult(
    context: ModelInvocationContext,
    modelIdentifier: string,
    messages: ChatMessage[]
  ): ModelConnectorResult {
    const promptTokens = this.estimateTokens(context.requestPayload) ?? 200;
    const completionTokens = Math.max(1, Math.round(promptTokens * 0.6));
    const totalTokens = promptTokens + completionTokens;
    const latencyMs = 40 + Math.round(Math.random() * 80);
    const outputText = 'Stub response generated for ' + context.target.provider + ':' + modelIdentifier;

    return {
      outputText,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      rawResponse: {
        stub: true,
        provider: context.target.provider,
        model: modelIdentifier,
        generated_at: new Date().toISOString(),
        request_preview: messages.slice(-2),
        note: 'ModelGardenService running in stub mode because no live connector is configured.'
      }
    };
  }

  private async persistInvocation(
    context: ModelInvocationContext,
    result: ModelConnectorResult,
    error?: unknown
  ) {
    const estimatedTokens = result.totalTokens ?? this.estimateTokens(context.requestPayload);
    const estimatedCost = this.estimateCost(context.target, estimatedTokens);

    let record: {
      id: string;
      provider: string;
      model_identifier: string;
      latency_ms: number;
      estimated_cost_aud: number | null;
      prompt_tokens: number | null;
      completion_tokens: number | null;
      total_tokens: number | null;
      error_message: string | null;
    } | null = null;

    try {
      record = await this.prisma.modelInvocation.create({
        data: {
          policy_id: context.policyId,
          rule_id: context.matchedRule,
          decision: context.decision,
          model_pool: context.modelPoolId,
          provider: context.target.provider,
          model_identifier: this.resolveModelIdentifier(context.target),
          latency_ms: Math.max(0, Math.round(result.latencyMs)),
          prompt_tokens: result.promptTokens ?? undefined,
          completion_tokens: result.completionTokens ?? undefined,
          total_tokens: estimatedTokens ?? undefined,
          estimated_cost_aud: estimatedCost ?? undefined,
          audit_log_id: context.auditLogId,
          request_payload: context.requestPayload as Prisma.InputJsonValue,
          response_payload: result.rawResponse as Prisma.InputJsonValue,
          error_message: error instanceof Error ? error.message : undefined
        }
      });
    } catch (persistError) {
      const normalizedMessage = (persistError as { message?: string })?.message?.toLowerCase() || '';
      const code = (persistError as { code?: string })?.code;
      const missingTable =
        normalizedMessage.includes('does not exist') ||
        normalizedMessage.includes('relation') ||
        normalizedMessage.includes('model_invocations');
      const schemaIssues = code && ['P2021', 'P2022', 'P2010'].includes(code);
      if (missingTable || schemaIssues) {
        console.warn('[ModelGardenService] Could not persist model invocation (table missing). Continuing without DB record.');
      } else {
        console.warn('[ModelGardenService] Failed to persist model invocation:', persistError);
      }
    }

    const fallbackId = record?.id ?? `local_${Date.now()}`;

    return {
      invocation_id: fallbackId,
      provider: record?.provider ?? context.target.provider,
      model_identifier: record?.model_identifier ?? this.resolveModelIdentifier(context.target),
      latency_ms: record?.latency_ms ?? Math.max(0, Math.round(result.latencyMs)),
      estimated_cost_aud: (record?.estimated_cost_aud ?? estimatedCost) ?? undefined,
      prompt_tokens: record?.prompt_tokens ?? result.promptTokens ?? undefined,
      completion_tokens: record?.completion_tokens ?? result.completionTokens ?? undefined,
      total_tokens: record?.total_tokens ?? estimatedTokens ?? undefined,
      response_excerpt: this.buildExcerpt(result.outputText),
      error_message: record?.error_message ?? (error instanceof Error ? error.message : undefined)
    };
  }

  private estimateTokens(payload: Record<string, unknown>): number | undefined {
    const text = JSON.stringify(payload);
    if (!text) {
      return undefined;
    }
    return Math.max(1, Math.round(text.length / 4));
  }

  private estimateCost(target: RouteTarget, tokens?: number | null): number | undefined {
    if (!tokens || !target.profile?.cost) {
      return undefined;
    }

    const per1k = Number(target.profile.cost.per_1k_tokens);
    if (!Number.isFinite(per1k) || per1k <= 0) {
      return undefined;
    }

    return parseFloat(((per1k * tokens) / 1000).toFixed(6));
  }

  private buildExcerpt(text: string): string | undefined {
    if (!text) {
      return undefined;
    }
    return text.length > 240 ? text.slice(0, 237) + '...' : text;
  }

  private computePercentile(values: number[], percentile: number): number {
    if (!values.length) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(percentile * sorted.length) - 1));
    return sorted[index];
  }
}
