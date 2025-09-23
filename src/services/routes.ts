// Route service for model pools, profiling, and routing decisions

import { PrismaClient, Prisma } from '@prisma/client';
import {
  ModelPool,
  RouteTarget,
  ModelProfile,
  RoutingPreference,
  RoutingCandidate,
  RoutingDecision
} from '../types';

export class RouteService {
  constructor(private prisma: PrismaClient) {}

  async getAllModelPools(): Promise<ModelPool[]> {
    const pools = await this.prisma.modelPool.findMany({
      include: {
        routeTargets: true
      }
    });

    return pools.map((pool) => this.mapDbPoolToModelPool(pool));
  }

  async getModelPoolById(poolId: string): Promise<ModelPool | null> {
    const pool = await this.prisma.modelPool.findUnique({
      where: { pool_id: poolId },
      include: {
        routeTargets: true
      }
    });

    return pool ? this.mapDbPoolToModelPool(pool) : null;
  }

  async createModelPool(pool: Omit<ModelPool, 'health'>): Promise<ModelPool> {
    const created = await this.prisma.modelPool.create({
      data: {
        pool_id: pool.pool_id,
        region: pool.region,
        description: pool.description,
        tags: pool.tags as unknown as Prisma.InputJsonValue,
        targets: pool.targets as unknown as Prisma.InputJsonValue,
        health: {
          status: 'healthy',
          last_check: new Date().toISOString()
        } as unknown as Prisma.InputJsonValue
      }
    });

    return this.mapDbPoolToModelPool(created);
  }

  async updateModelPool(poolId: string, pool: Partial<ModelPool>): Promise<ModelPool> {
    const updated = await this.prisma.modelPool.update({
      where: { pool_id: poolId },
      data: {
        region: pool.region,
        description: pool.description,
        tags: pool.tags as unknown as Prisma.InputJsonValue | undefined,
        targets: pool.targets as unknown as Prisma.InputJsonValue | undefined,
        health: pool.health as unknown as Prisma.InputJsonValue | undefined
      }
    });

    return this.mapDbPoolToModelPool(updated);
  }

  async deleteModelPool(poolId: string): Promise<void> {
    await this.prisma.modelPool.delete({
      where: { pool_id: poolId }
    });
  }

  async getAllRouteTargets(): Promise<RouteTarget[]> {
    const targets = await this.prisma.routeTarget.findMany();
    return targets.map(target => this.mapDbTargetToRouteTarget(target));
  }

  async createRouteTarget(target: Omit<RouteTarget, 'id'>): Promise<RouteTarget> {
    const created = await this.prisma.routeTarget.create({
      data: {
        pool_id: target.pool_id,
        provider: target.provider,
        endpoint: target.endpoint,
        weight: target.weight,
        region: target.region,
        is_active: target.is_active,
        profile: (target.profile as unknown as Prisma.InputJsonValue) ?? null
      }
    });

    return this.mapDbTargetToRouteTarget(created);
  }

  async updateRouteTarget(id: string, target: Partial<RouteTarget>): Promise<RouteTarget> {
    const updated = await this.prisma.routeTarget.update({
      where: { id },
      data: {
        pool_id: target.pool_id,
        provider: target.provider,
        endpoint: target.endpoint,
        weight: target.weight,
        region: target.region,
        is_active: target.is_active,
        profile: (target.profile as unknown as Prisma.InputJsonValue | null | undefined) ?? undefined
      }
    });

    return this.mapDbTargetToRouteTarget(updated);
  }

  async deleteRouteTarget(id: string): Promise<void> {
    await this.prisma.routeTarget.delete({
      where: { id }
    });
  }

  async getRouteTargetsForPool(poolId: string): Promise<RouteTarget[]> {
    const targets = await this.prisma.routeTarget.findMany({
      where: {
        pool_id: poolId,
        is_active: true
      }
    });

    return targets.map(target => this.mapDbTargetToRouteTarget(target));
  }

  async updatePoolHealth(poolId: string, health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    errors?: string[];
  }): Promise<void> {
    await this.prisma.modelPool.update({
      where: { pool_id: poolId },
      data: {
        health: {
          ...health,
          last_check: new Date().toISOString()
        } as unknown as Prisma.InputJsonValue
      }
    });
  }

  buildRoutingDecision(
    pool: ModelPool,
    targets: RouteTarget[],
    preferences?: RoutingPreference
  ): RoutingDecision {
    const candidates = this.rankTargets(targets, preferences);

    return {
      pool_id: pool.pool_id,
      pool_region: pool.region,
      pool_description: pool.description,
      candidates
    };
  }

  rankTargets(targets: RouteTarget[], preferences?: RoutingPreference): RoutingCandidate[] {
    const activeTargets = targets.filter(target => target.is_active);

    const scored = activeTargets.map(target => {
      let score = target.weight;
      const reasons: string[] = [`Base weight ${target.weight}`];

      if (target.profile) {
        const profile = target.profile;
        const latencyScore = 1000 / Math.max(profile.performance.avg_latency_ms, 1);
        score += latencyScore;
        reasons.push(`Latency boost ${latencyScore.toFixed(1)}`);

        const availabilityScore = profile.performance.availability * 10;
        score += availabilityScore;
        reasons.push(`Availability boost ${availabilityScore.toFixed(1)}`);

        if (preferences?.compliance_tags) {
          const matchingTags = preferences.compliance_tags.filter(tag => !!profile.tags?.[tag]);
          if (matchingTags.length) {
            const complianceBoost = matchingTags.length * 25;
            score += complianceBoost;
            reasons.push(`Compliance match (${matchingTags.join(', ')}) +${complianceBoost}`);
          }
        }

        // Data sovereignty / residency hard requirement
        if (preferences?.required_data_residency) {
          const residency = profile.compliance?.data_residency || 'unknown';
          const deployment = (profile.tags as any)?.deployment as string | undefined;
          const requireLocalAU = preferences.required_data_residency === 'AU_LOCAL';
          const matches = requireLocalAU
            ? (residency === 'AU' && (deployment === 'local' || deployment === 'onsite' || deployment === 'onprem'))
            : residency === preferences.required_data_residency;
          if (!matches) {
            score -= 5000; // effectively disqualify
            const need = requireLocalAU ? 'AU + local/onsite' : preferences.required_data_residency;
            reasons.push(`Residency mismatch (${residency}${deployment ? '/' + deployment : ''} != ${need}) -5000`);
          } else {
            score += 200;
            reasons.push(`Residency match ${requireLocalAU ? 'AU + local/onsite' : residency} +200`);
          }
        } else if (preferences?.preferred_data_residency?.length) {
          const residency = profile.compliance?.data_residency || 'unknown';
          if (preferences.preferred_data_residency.includes(residency)) {
            score += 75;
            reasons.push(`Preferred residency ${residency} +75`);
          }
        }

        // Info types alignment (e.g., pii, health, financial, code)
        if (preferences?.info_types?.length) {
          const supported = new Set([...(profile.supported_data_classes || []), ...this.extractStringArray(profile.tags, 'info_types')]);
          const hits = preferences.info_types.filter(t => supported.has(t));
          if (hits.length) {
            const boost = hits.length * 20;
            score += boost;
            reasons.push(`Info types supported (${hits.join(', ')}) +${boost}`);
          } else {
            score -= 40; // mild penalty if not aligned
            reasons.push('Info types not preferred -40');
          }
        }

        // Context window requirement
        if (preferences?.required_context_window_tokens) {
          const cap = profile.limits?.context_window_tokens ?? 8192;
          if (cap < preferences.required_context_window_tokens) {
            score -= 1000; // effectively disqualify by heavy penalty
            reasons.push(`Insufficient context window (${cap} < ${preferences.required_context_window_tokens}) -1000`);
          } else {
            const headroom = cap - preferences.required_context_window_tokens;
            const headroomBoost = Math.min(100, headroom / 100); // small boost for headroom
            score += headroomBoost;
            reasons.push(`Context headroom +${headroomBoost.toFixed(1)}`);
          }
        }

        // Model strength preference
        if (preferences?.model_strength) {
          const strength = profile.quality?.strength || this.mapCostTierToStrength(this.extractStringValue(profile.tags, 'cost_tier'));
          if (strength === preferences.model_strength) {
            score += 60;
            reasons.push(`Preferred strength ${strength} +60`);
          } else {
            // partial credit: strong>standard>lite
            const rank = (s?: string) => (s === 'strong' ? 3 : s === 'standard' ? 2 : s === 'lite' ? 1 : 0);
            const diff = rank(strength) - rank(preferences.model_strength);
            score += diff * 10; // small nudge
            reasons.push(`Strength diff ${strength ?? 'unknown'} vs ${preferences.model_strength} +${(diff*10).toFixed(0)}`);
          }
        }

        // Latency budget
        if (preferences?.latency_budget_ms) {
          const p95 = profile.performance.p95_latency_ms ?? profile.performance.avg_latency_ms;
          if (p95 > preferences.latency_budget_ms) {
            const over = p95 - preferences.latency_budget_ms;
            score -= Math.min(800, over / 2);
            reasons.push(`Over latency budget by ${over}ms`);
          } else {
            const under = preferences.latency_budget_ms - p95;
            const boost = Math.min(200, under / 3);
            score += boost;
            reasons.push(`Under latency budget +${boost.toFixed(1)}`);
          }
        }

        // Cost cap
        if (preferences?.max_cost_per_1k_aud) {
          const price = Number(profile.cost?.per_1k_tokens ?? 0);
          if (price > preferences.max_cost_per_1k_aud) {
            score -= 1200; // disqualifying penalty
            reasons.push(`Cost ${price} > max ${preferences.max_cost_per_1k_aud} -1200`);
          } else {
            const savings = preferences.max_cost_per_1k_aud - price;
            const boost = Math.min(120, savings * 10);
            score += boost;
            reasons.push(`Cost advantage +${boost.toFixed(1)}`);
          }
        }

        // Quality score
        if (typeof preferences?.min_quality_score === 'number') {
          const q = profile.quality?.score ?? 0;
          if (q < preferences.min_quality_score) {
            score -= 600;
            reasons.push(`Quality ${q} < min ${preferences.min_quality_score} -600`);
          } else {
            const boost = Math.min(150, (q - preferences.min_quality_score) * 20);
            score += boost;
            reasons.push(`Quality advantage +${boost.toFixed(1)}`);
          }
        }

        // Required output tokens
        if (preferences?.required_output_tokens) {
          const maxOut = profile.limits?.max_output_tokens ?? 2048;
          if (maxOut < preferences.required_output_tokens) {
            score -= 1000;
            reasons.push(`Output cap ${maxOut} < required ${preferences.required_output_tokens} -1000`);
          } else {
            score += 40;
            reasons.push('Output capacity OK +40');
          }
        }

        // Feature requirements
        const hasCap = (name: string) => !!(profile.capabilities?.some(c => String(c).toLowerCase().includes(name)) || (profile.tags && (profile.tags as any)[name] === true));
        if (preferences?.requires_json_mode && !hasCap('json')) {
          score -= 800; reasons.push('Missing JSON mode -800');
        }
        if (preferences?.requires_function_calling && !hasCap('function')) {
          score -= 800; reasons.push('Missing function calling -800');
        }
        if (preferences?.requires_streaming && !hasCap('stream')) {
          score -= 400; reasons.push('Missing streaming -400');
        }
        if (preferences?.requires_vision && !(hasCap('vision') || hasCap('multimodal'))) {
          score -= 900; reasons.push('Missing vision/multimodal -900');
        }
      }

      if (preferences?.prefer_region && target.region === preferences.prefer_region) {
        score += 50;
        reasons.push(`Preferred region ${preferences.prefer_region}`);
      }

      if (preferences?.provider && target.provider === preferences.provider) {
        score += 25;
        reasons.push(`Preferred provider ${preferences.provider}`);
      }

      if (preferences?.minimize_latency && target.profile) {
        const latencyPriority = 500 / Math.max(target.profile.performance.p95_latency_ms, 1);
        score += latencyPriority;
        reasons.push(`Latency priority ${latencyPriority.toFixed(1)}`);
      }

      return { target, score, reasons, selected: false };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.map((candidate, index) => ({
      ...candidate,
      selected: index === 0
    }));
  }

  private extractStringArray(tags: Record<string, unknown> | undefined, key: string): string[] {
    if (!tags || typeof tags !== 'object') {
      return [];
    }

    const value = tags[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    if (typeof value === 'string') {
      return [value];
    }

    return [];
  }
  private extractStringValue(tags: Record<string, unknown> | undefined, key: string): string | undefined {
    if (!tags || typeof tags !== 'object') {
      return undefined;
    }
    const value = tags[key];
    return typeof value === 'string' ? value : undefined;
  }
  private mapDbPoolToModelPool(dbPool: any): ModelPool {
    const pool: ModelPool = {
      pool_id: dbPool.pool_id,
      region: dbPool.region,
      description: dbPool.description,
      tags: dbPool.tags,
      targets: dbPool.targets,
      health: dbPool.health
    };

    if (dbPool.routeTargets) {
      pool.target_profiles = dbPool.routeTargets.map((target: any) => this.mapDbTargetToRouteTarget(target));
    }

    return pool;
  }

  private mapDbTargetToRouteTarget(dbTarget: any): RouteTarget {
    return {
      id: dbTarget.id,
      pool_id: dbTarget.pool_id,
      provider: dbTarget.provider,
      endpoint: dbTarget.endpoint,
      weight: dbTarget.weight,
      region: dbTarget.region,
      is_active: dbTarget.is_active,
      profile: dbTarget.profile ? this.normalizeProfile(dbTarget.profile) : undefined
    };
  }

  private normalizeProfile(profile: any): ModelProfile {
    return {
      profile_id: profile.profile_id || `${profile.provider}_${profile.endpoint}`,
      provider: profile.provider,
      endpoint: profile.endpoint,
      capabilities: profile.capabilities || [],
      supported_data_classes: profile.supported_data_classes || [],
      compliance: {
        data_residency: profile.compliance?.data_residency || 'unknown',
        certifications: profile.compliance?.certifications || [],
        notes: profile.compliance?.notes
      },
      performance: {
        avg_latency_ms: profile.performance?.avg_latency_ms ?? 400,
        p95_latency_ms: profile.performance?.p95_latency_ms ?? 800,
        availability: profile.performance?.availability ?? 0.99,
        throughput_tps: profile.performance?.throughput_tps ?? 10
      },
      cost: {
        currency: profile.cost?.currency || 'AUD',
        per_1k_tokens: profile.cost?.per_1k_tokens ?? 0.0
      },
      limits: {
        context_window_tokens: profile.limits?.context_window_tokens ?? 8192,
        max_input_tokens: profile.limits?.max_input_tokens ?? 8192,
        max_output_tokens: profile.limits?.max_output_tokens ?? 2048
      },
      quality: {
        strength: profile.quality?.strength || this.mapCostTierToStrength(profile.tags?.cost_tier),
        score: profile.quality?.score ?? undefined
      },
      last_benchmarked: profile.last_benchmarked || new Date().toISOString(),
      tags: profile.tags || {}
    };
  }

  private mapCostTierToStrength(tier?: string): 'lite' | 'standard' | 'strong' | undefined {
    if (!tier) return undefined;
    const t = String(tier).toLowerCase();
    if (t.includes('premium') || t.includes('quality')) return 'strong';
    if (t.includes('balanced') || t.includes('standard')) return 'standard';
    if (t.includes('economy') || t.includes('lite')) return 'lite';
    return undefined;
  }
}




