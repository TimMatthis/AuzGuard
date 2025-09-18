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
      last_benchmarked: profile.last_benchmarked || new Date().toISOString(),
      tags: profile.tags || {}
    };
  }
}




