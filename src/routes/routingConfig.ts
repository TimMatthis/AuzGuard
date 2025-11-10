import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { RoutingProfilesService } from '../services/routingProfiles';
import { AuthService } from '../services/auth';
import { RouteProfile, RoutingPreference, UserRole } from '../types';

interface RouteConfigOptions {
  authService: AuthService;
  profilesService: RoutingProfilesService;
}

const extractUser = (request: FastifyRequest) => request.user as { id?: string; role: UserRole };

export async function routingConfigRoutes(fastify: FastifyInstance, options: RouteConfigOptions) {
  const { authService, profilesService } = options;

  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
      const user = authService.getUserFromToken(token);
      request.user = user;
    } catch (e) {
      return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
  });

  // Profiles
  fastify.get('/profiles', async () => profilesService.listProfiles());
  fastify.post('/profiles', async (request: FastifyRequest<{ Body: { name: string; basic?: RouteProfile['basic']; preferences?: RoutingPreference; pool_id?: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    try {
      return profilesService.createProfile(request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create profile';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });
  fastify.put('/profiles/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<Omit<RouteProfile, 'id' | 'created_at'>> }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    try {
      return profilesService.updateProfile(request.params.id, request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update profile';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });
  fastify.delete('/profiles/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    try {
      profilesService.deleteProfile(request.params.id);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete profile';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // Note: User group management has been moved to /api/user-groups routes
  // This file now only handles routing profile management
}
