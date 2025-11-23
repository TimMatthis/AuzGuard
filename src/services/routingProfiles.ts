// Routing profiles service with database operations
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { RouteProfile, RoutingPreference } from '../types';

export class RoutingProfilesService {
  private fallbackMode = false;
  private fallbackProfiles: RouteProfile[];
  private readonly fallbackSeedPath: string;

  constructor(private prisma: PrismaClient) {
    this.fallbackSeedPath = path.resolve(process.cwd(), 'data', 'routing_profiles.json');
    this.fallbackProfiles = this.loadFallbackProfiles();
  }

  async listProfiles(): Promise<RouteProfile[]> {
    if (this.fallbackMode) {
      return this.getSortedFallbackProfiles();
    }

    try {
      const profiles = await this.prisma.routeProfile.findMany({
        orderBy: { name: 'asc' }
      });

      return profiles.map(p => this.toRouteProfileType(p));
    } catch (error) {
      if (!this.enableFallback('listProfiles', error)) {
        throw error;
      }
      return this.getSortedFallbackProfiles();
    }
  }

  async getProfile(id: string): Promise<RouteProfile | null> {
    if (this.fallbackMode) {
      return this.cloneFallbackProfile(this.fallbackProfiles.find(profile => profile.id === id)) ?? null;
    }

    try {
      const profile = await this.prisma.routeProfile.findUnique({
        where: { id }
      });

      return profile ? this.toRouteProfileType(profile) : null;
    } catch (error) {
      if (!this.enableFallback('getProfile', error)) {
        throw error;
      }
      return this.cloneFallbackProfile(this.fallbackProfiles.find(profile => profile.id === id)) ?? null;
    }
  }

  async createProfile(input: {
    name: string;
    basic?: RouteProfile['basic'];
    preferences?: RoutingPreference;
    pool_id?: string;
  }): Promise<RouteProfile> {
    if (this.fallbackMode) {
      return this.createFallbackProfile(input);
    }

    try {
      const existing = await this.prisma.routeProfile.findUnique({
        where: { name: input.name }
      });

      if (existing) {
        throw new Error('Route profile with this name already exists');
      }

      const profile = await this.prisma.routeProfile.create({
        data: {
          name: input.name,
          basic: (input.basic || {}) as Prisma.InputJsonValue,
          preferences: (input.preferences || {}) as Prisma.InputJsonValue,
          pool_id: input.pool_id
        }
      });

      return this.toRouteProfileType(profile);
    } catch (error) {
      if (!this.enableFallback('createProfile', error)) {
        throw error;
      }
      return this.createFallbackProfile(input);
    }
  }

  async updateProfile(id: string, patch: Partial<Omit<RouteProfile, 'id' | 'created_at'>>): Promise<RouteProfile> {
    if (this.fallbackMode) {
      return this.updateFallbackProfile(id, patch);
    }

    try {
      const existing = await this.prisma.routeProfile.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new Error('Profile not found');
      }

      const updatedPreferences = patch.preferences
        ? { ...(existing.preferences as Record<string, unknown>), ...patch.preferences }
        : undefined;

      const profile = await this.prisma.routeProfile.update({
        where: { id },
        data: {
          name: patch.name,
          basic: patch.basic !== undefined ? (patch.basic as Prisma.InputJsonValue) : undefined,
          preferences: updatedPreferences as Prisma.InputJsonValue,
          pool_id: patch.pool_id !== undefined ? patch.pool_id : undefined
        }
      });

      return this.toRouteProfileType(profile);
    } catch (error) {
      if (!this.enableFallback('updateProfile', error)) {
        throw error;
      }
      return this.updateFallbackProfile(id, patch);
    }
  }

  async deleteProfile(id: string): Promise<void> {
    if (this.fallbackMode) {
      this.deleteFallbackProfile(id);
      return;
    }

    try {
      await this.prisma.routeProfile.delete({
        where: { id }
      });
    } catch (error) {
      if (!this.enableFallback('deleteProfile', error)) {
        throw error;
      }
      this.deleteFallbackProfile(id);
    }
  }

  private toRouteProfileType(profile: any): RouteProfile {
    return {
      id: profile.id,
      name: profile.name,
      pool_id: profile.pool_id,
      basic: profile.basic as RouteProfile['basic'],
      preferences: profile.preferences as RoutingPreference,
      created_at: profile.created_at.toISOString(),
      updated_at: profile.updated_at.toISOString()
    };
  }

  private loadFallbackProfiles(): RouteProfile[] {
    try {
      if (!fs.existsSync(this.fallbackSeedPath)) {
        return [];
      }

      const raw = fs.readFileSync(this.fallbackSeedPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.profiles)) {
        return [];
      }

      return parsed.profiles.map((profile: any) => ({
        id: profile.id ?? randomUUID(),
        name: profile.name,
        pool_id: profile.pool_id,
        basic: profile.basic,
        preferences: profile.preferences ?? {},
        created_at: profile.created_at ?? new Date().toISOString(),
        updated_at: profile.updated_at ?? profile.created_at ?? new Date().toISOString()
      }));
    } catch (error) {
      console.warn('[RoutingProfilesService] Failed to load fallback routing profiles:', error);
      return [];
    }
  }

  private getSortedFallbackProfiles(): RouteProfile[] {
    const profiles = this.fallbackProfiles.map(profile => this.cloneFallbackProfile(profile)!);
    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  private createFallbackProfile(input: {
    name: string;
    basic?: RouteProfile['basic'];
    preferences?: RoutingPreference;
    pool_id?: string;
  }): RouteProfile {
    if (this.fallbackProfiles.some(profile => profile.name === input.name)) {
      throw new Error('Route profile with this name already exists');
    }

    const now = new Date().toISOString();
    const profile: RouteProfile = {
      id: randomUUID(),
      name: input.name,
      pool_id: input.pool_id,
      basic: input.basic ? this.deepClone(input.basic) : undefined,
      preferences: this.deepClone(input.preferences ?? {}),
      created_at: now,
      updated_at: now
    };

    this.fallbackProfiles.push(profile);
    return this.cloneFallbackProfile(profile)!;
  }

  private updateFallbackProfile(id: string, patch: Partial<Omit<RouteProfile, 'id' | 'created_at'>>): RouteProfile {
    const idx = this.fallbackProfiles.findIndex(profile => profile.id === id);
    if (idx === -1) {
      throw new Error('Profile not found');
    }

    const current = this.fallbackProfiles[idx];
    const mergedPrefs = patch.preferences
      ? { ...(current.preferences || {}), ...this.deepClone(patch.preferences) }
      : current.preferences;

    const updated: RouteProfile = {
      ...current,
      name: patch.name ?? current.name,
      pool_id: patch.pool_id !== undefined ? patch.pool_id : current.pool_id,
      basic: patch.basic !== undefined ? this.deepClone(patch.basic) : current.basic,
      preferences: mergedPrefs,
      updated_at: new Date().toISOString()
    };

    this.fallbackProfiles[idx] = updated;
    return this.cloneFallbackProfile(updated)!;
  }

  private deleteFallbackProfile(id: string): void {
    const idx = this.fallbackProfiles.findIndex(profile => profile.id === id);
    if (idx === -1) {
      throw new Error('Profile not found');
    }
    this.fallbackProfiles.splice(idx, 1);
  }

  private cloneFallbackProfile(profile: RouteProfile | undefined): RouteProfile | undefined {
    if (!profile) return undefined;
    return {
      ...profile,
      basic: profile.basic ? this.deepClone(profile.basic) : undefined,
      preferences: this.deepClone(profile.preferences)
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
      console.warn(`[RoutingProfilesService] ${context} failed, returning fallback routing profiles.`);
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
}
