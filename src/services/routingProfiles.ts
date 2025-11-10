// Routing profiles service with database operations
import { PrismaClient, Prisma } from '@prisma/client';
import { RouteProfile, RoutingPreference } from '../types';

export class RoutingProfilesService {
  constructor(private prisma: PrismaClient) {}

  async listProfiles(): Promise<RouteProfile[]> {
    const profiles = await this.prisma.routeProfile.findMany({
      orderBy: { name: 'asc' }
    });

    return profiles.map(p => this.toRouteProfileType(p));
  }

  async getProfile(id: string): Promise<RouteProfile | null> {
    const profile = await this.prisma.routeProfile.findUnique({
      where: { id }
    });

    return profile ? this.toRouteProfileType(profile) : null;
  }

  async createProfile(input: { 
    name: string; 
    basic?: RouteProfile['basic']; 
    preferences?: RoutingPreference; 
    pool_id?: string 
  }): Promise<RouteProfile> {
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
  }

  async updateProfile(id: string, patch: Partial<Omit<RouteProfile, 'id' | 'created_at'>>): Promise<RouteProfile> {
    const existing = await this.prisma.routeProfile.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error('Profile not found');
    }

    // Merge preferences if provided
    const updatedPreferences = patch.preferences 
      ? { ...(existing.preferences as any), ...patch.preferences }
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
  }

  async deleteProfile(id: string): Promise<void> {
    await this.prisma.routeProfile.delete({
      where: { id }
    });
  }

  private toRouteProfileType(profile: any): RouteProfile {
    return {
      id: profile.id,
      name: profile.name,
      pool_id: profile.pool_id,
      basic: profile.basic as any,
      preferences: profile.preferences as RoutingPreference,
      created_at: profile.created_at.toISOString(),
      updated_at: profile.updated_at.toISOString()
    };
  }
}
