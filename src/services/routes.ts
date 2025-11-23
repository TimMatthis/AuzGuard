// Route service for model pools, profiling, and routing decisions

import { randomUUID } from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  ModelPool,
  RouteTarget,
  ModelProfile,
  RoutingPreference,
  RoutingCandidate,
  RoutingDecision
} from '../types';
import { sampleModelPools, sampleRouteTargets } from '../data/sampleRoutingData';

export class RouteService {
  private fallbackMode = false;
  private fallbackPools: ModelPool[];
  private fallbackTargets: RouteTarget[];

  constructor(private prisma: PrismaClient) {
    this.fallbackPools = sampleModelPools.map(pool => this.clonePool(pool));
    this.fallbackTargets = sampleRouteTargets.map(target => this.cloneTarget(target));
  }

  async getAllModelPools(): Promise<ModelPool[]> {
    if (this.fallbackMode) {
      return this.clonePools(this.fallbackPools);
    }

    try {
      const pools = await this.prisma.modelPool.findMany({
        include: {
          routeTargets: true
        }
      });

      return pools.map((pool) => this.mapDbPoolToModelPool(pool));
    } catch (error) {
      if (!this.enableFallback('getAllModelPools', error)) {
        throw error;
      }
      return this.clonePools(this.fallbackPools);
    }
  }

  async getModelPoolById(poolId: string): Promise<ModelPool | null> {
    if (this.fallbackMode) {
      return this.getFallbackPool(poolId) ?? null;
    }

    try {
      const pool = await this.prisma.modelPool.findUnique({
        where: { pool_id: poolId },
        include: {
          routeTargets: true
        }
      });

      return pool ? this.mapDbPoolToModelPool(pool) : null;
    } catch (error) {
      if (!this.enableFallback('getModelPoolById', error)) {
        throw error;
      }
      return this.getFallbackPool(poolId) ?? null;
    }
  }

  async createModelPool(pool: Omit<ModelPool, 'health'>): Promise<ModelPool> {
    if (this.fallbackMode) {
      return this.createFallbackPool(pool);
    }

    try {
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
    } catch (error) {
      if (!this.enableFallback('createModelPool', error)) {
        throw error;
      }
      return this.createFallbackPool(pool);
    }
  }

  async updateModelPool(poolId: string, pool: Partial<ModelPool>): Promise<ModelPool> {
    if (this.fallbackMode) {
      return this.updateFallbackPool(poolId, pool);
    }

    try {
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
    } catch (error) {
      if (!this.enableFallback('updateModelPool', error)) {
        throw error;
      }
      return this.updateFallbackPool(poolId, pool);
    }
  }

  async deleteModelPool(poolId: string): Promise<void> {
    if (this.fallbackMode) {
      this.deleteFallbackPool(poolId);
      return;
    }

    try {
      await this.prisma.modelPool.delete({
        where: { pool_id: poolId }
      });
    } catch (error) {
      if (!this.enableFallback('deleteModelPool', error)) {
        throw error;
      }
      this.deleteFallbackPool(poolId);
    }
  }

  async getAllRouteTargets(): Promise<RouteTarget[]> {
    if (this.fallbackMode) {
      return this.getFallbackTargets();
    }

    try {
      const targets = await this.prisma.routeTarget.findMany();
      return targets.map(target => this.mapDbTargetToRouteTarget(target));
    } catch (error) {
      if (!this.enableFallback('getAllRouteTargets', error)) {
        throw error;
      }
      return this.getFallbackTargets();
    }
  }

  async createRouteTarget(target: Omit<RouteTarget, 'id'>): Promise<RouteTarget> {
    if (this.fallbackMode) {
      return this.createFallbackTarget(target);
    }

    try {
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
    } catch (error) {
      if (!this.enableFallback('createRouteTarget', error)) {
        throw error;
      }
      return this.createFallbackTarget(target);
    }
  }

  async updateRouteTarget(id: string, target: Partial<RouteTarget>): Promise<RouteTarget> {
    if (this.fallbackMode) {
      return this.updateFallbackTarget(id, target);
    }

    try {
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
    } catch (error) {
      if (!this.enableFallback('updateRouteTarget', error)) {
        throw error;
      }
      return this.updateFallbackTarget(id, target);
    }
  }

  async deleteRouteTarget(id: string): Promise<void> {
    if (this.fallbackMode) {
      this.deleteFallbackTarget(id);
      return;
    }

    try {
      await this.prisma.routeTarget.delete({
        where: { id }
      });
    } catch (error) {
      if (!this.enableFallback('deleteRouteTarget', error)) {
        throw error;
      }
      this.deleteFallbackTarget(id);
    }
  }

  async getRouteTargetsForPool(poolId: string): Promise<RouteTarget[]> {
    if (this.fallbackMode) {
      return this.getFallbackTargets(poolId);
    }

    try {
      const targets = await this.prisma.routeTarget.findMany({
        where: {
          pool_id: poolId,
          is_active: true
        }
      });

      return targets.map(target => this.mapDbTargetToRouteTarget(target));
    } catch (error) {
      if (!this.enableFallback('getRouteTargetsForPool', error)) {
        throw error;
      }
      return this.getFallbackTargets(poolId);
    }
  }

  async updatePoolHealth(poolId: string, health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    errors?: string[];
  }): Promise<void> {
    if (this.fallbackMode) {
      this.updateFallbackHealth(poolId, health);
      return;
    }

    try {
      await this.prisma.modelPool.update({
        where: { pool_id: poolId },
        data: {
          health: {
            ...health,
            last_check: new Date().toISOString()
          } as unknown as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if (!this.enableFallback('updatePoolHealth', error)) {
        throw error;
      }
      this.updateFallbackHealth(poolId, health);
    }
  }

  private createFallbackPool(pool: Omit<ModelPool, 'health'>): ModelPool {
    if (this.fallbackPools.some(existing => existing.pool_id === pool.pool_id)) {
      throw new Error(`Model pool ${pool.pool_id} already exists`);
    }

    const next: ModelPool = {
      pool_id: pool.pool_id,
      region: pool.region,
      description: pool.description,
      tags: this.deepClone(pool.tags),
      targets: this.deepClone(pool.targets),
      health: {
        status: 'healthy',
        last_check: new Date().toISOString()
      }
    };

    this.fallbackPools.push(next);
    return this.attachTargetsForPool(this.clonePool(next));
  }

  private updateFallbackPool(poolId: string, patch: Partial<ModelPool>): ModelPool {
    const idx = this.fallbackPools.findIndex(pool => pool.pool_id === poolId);
    if (idx === -1) {
      throw new Error('Model pool not found');
    }

    const existing = this.fallbackPools[idx];
    const updated: ModelPool = {
      ...existing,
      region: patch.region ?? existing.region,
      description: patch.description ?? existing.description,
      tags: patch.tags !== undefined ? this.deepClone(patch.tags) : existing.tags,
      targets: patch.targets !== undefined ? this.deepClone(patch.targets) : existing.targets,
      health: patch.health !== undefined ? this.deepClone(patch.health) : existing.health
    };

    this.fallbackPools[idx] = updated;
    return this.attachTargetsForPool(this.clonePool(updated));
  }

  private deleteFallbackPool(poolId: string): void {
    const idx = this.fallbackPools.findIndex(pool => pool.pool_id === poolId);
    if (idx === -1) {
      throw new Error('Model pool not found');
    }
    this.fallbackPools.splice(idx, 1);
    this.fallbackTargets = this.fallbackTargets.filter(target => target.pool_id !== poolId);
  }

  private getFallbackPool(poolId: string): ModelPool | undefined {
    const pool = this.fallbackPools.find(item => item.pool_id === poolId);
    return pool ? this.attachTargetsForPool(this.clonePool(pool)) : undefined;
  }

  private getFallbackTargets(poolId?: string): RouteTarget[] {
    const source = typeof poolId === 'string'
      ? this.fallbackTargets.filter(target => target.pool_id === poolId && target.is_active)
      : this.fallbackTargets;
    return source.map(target => this.cloneTarget(target));
  }

  private createFallbackTarget(target: Omit<RouteTarget, 'id'>): RouteTarget {
    if (!this.getFallbackPool(target.pool_id)) {
      throw new Error(`Model pool ${target.pool_id} not found`);
    }

    const created: RouteTarget = {
      id: randomUUID(),
      pool_id: target.pool_id,
      provider: target.provider,
      endpoint: target.endpoint,
      weight: target.weight,
      region: target.region,
      is_active: target.is_active,
      profile: target.profile ? this.deepClone(target.profile) : undefined
    };

    this.fallbackTargets.push(created);
    return this.cloneTarget(created);
  }

  private updateFallbackTarget(id: string, patch: Partial<RouteTarget>): RouteTarget {
    const idx = this.fallbackTargets.findIndex(target => target.id === id);
    if (idx === -1) {
      throw new Error('Route target not found');
    }

    const existing = this.fallbackTargets[idx];
    const nextPoolId = patch.pool_id ?? existing.pool_id;
    if (nextPoolId !== existing.pool_id && !this.getFallbackPool(nextPoolId)) {
      throw new Error(`Model pool ${nextPoolId} not found`);
    }

    const updated: RouteTarget = {
      ...existing,
      pool_id: nextPoolId,
      provider: patch.provider ?? existing.provider,
      endpoint: patch.endpoint ?? existing.endpoint,
      weight: patch.weight ?? existing.weight,
      region: patch.region ?? existing.region,
      is_active: patch.is_active ?? existing.is_active,
      profile: patch.profile !== undefined ? this.deepClone(patch.profile) : existing.profile
    };

    this.fallbackTargets[idx] = updated;
    return this.cloneTarget(updated);
  }

  private deleteFallbackTarget(id: string): void {
    const idx = this.fallbackTargets.findIndex(target => target.id === id);
    if (idx === -1) {
      throw new Error('Route target not found');
    }
    this.fallbackTargets.splice(idx, 1);
  }

  private updateFallbackHealth(poolId: string, health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    errors?: string[];
  }): void {
    const pool = this.fallbackPools.find(item => item.pool_id === poolId);
    if (!pool) {
      throw new Error('Model pool not found');
    }
    pool.health = {
      status: health.status,
      errors: health.errors ? [...health.errors] : undefined,
      last_check: new Date().toISOString()
    };
  }

  private clonePools(pools: ModelPool[]): ModelPool[] {
    return pools.map(pool => this.attachTargetsForPool(this.clonePool(pool)));
  }

  private attachTargetsForPool(pool: ModelPool): ModelPool {
    return {
      ...pool,
      target_profiles: this.fallbackTargets
        .filter(target => target.pool_id === pool.pool_id && target.is_active)
        .map(target => this.cloneTarget(target))
    };
  }

  private clonePool(pool: ModelPool): ModelPool {
    return {
      pool_id: pool.pool_id,
      region: pool.region,
      description: pool.description,
      tags: this.deepClone(pool.tags),
      targets: this.deepClone(pool.targets),
      health: this.deepClone(pool.health),
      target_profiles: pool.target_profiles?.map(target => this.cloneTarget(target))
    };
  }

  private cloneTarget(target: RouteTarget): RouteTarget {
    return {
      id: target.id,
      pool_id: target.pool_id,
      provider: target.provider,
      endpoint: target.endpoint,
      weight: target.weight,
      region: target.region,
      is_active: target.is_active,
      profile: target.profile ? this.deepClone(target.profile) : undefined
    };
  }

  private deepClone<T>(value: T): T {
    return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
  }

  private enableFallback(context: string, error: unknown): boolean {
    if (!this.shouldFallback(error)) {
      return false;
    }
    if (!this.fallbackMode) {
      console.warn(`[RouteService] ${context} failed, switching to sample data fallback.`);
      this.fallbackMode = true;
    }
    return true;
  }

  private shouldFallback(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = (error as { code?: string }).code;
    if (code) {
      const recoverable = new Set(['P1001', 'P1002', 'P1003', 'P1010', 'P1017', 'P2021', 'P2022']);
      if (recoverable.has(code)) {
        return true;
      }
    }

    const name = (error as { name?: string }).name;
    if (name && ['PrismaClientInitializationError', 'PrismaClientRustPanicError', 'PrismaClientUnknownRequestError'].includes(name)) {
      return true;
    }

    const rawMessage = (error as { message?: string }).message;
    const normalizedMessage = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';
    if (normalizedMessage.includes('failed to connect') || normalizedMessage.includes('econnrefused') || normalizedMessage.includes('does not exist')) {
      return true;
    }

    return false;
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
        const deployment = (profile.tags as any)?.deployment as string | undefined;
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

        if (preferences?.requires_on_prem) {
          const isOnPrem = deployment === 'onprem' || deployment === 'onsite' || deployment === 'local';
          if (!isOnPrem) {
            score -= 6000;
            reasons.push('On-prem deployment required -6000');
          } else {
            score += 250;
            reasons.push('On-prem deployment match +250');
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
      } else if (preferences?.requires_on_prem) {
        score -= 6000;
        reasons.push('On-prem requirement unmet (no profile metadata) -6000');
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




