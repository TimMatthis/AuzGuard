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

  // Groups
  fastify.get('/groups', async () => profilesService.listGroups());
  fastify.post('/groups', async (request: FastifyRequest<{ Body: { name: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    try {
      return profilesService.createGroup(request.body.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });
  fastify.delete('/groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    try {
      profilesService.deleteGroup(request.params.id);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // Binding
  fastify.post('/groups/:id/assign', async (request: FastifyRequest<{ Params: { id: string }; Body: { route_profile_id: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    try {
      const b = profilesService.assignProfileToGroup(request.params.id, request.body.route_profile_id);
      return b;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to assign profile to group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // Update group properties (default pool, allowed pools/policies, route_profile_id)
  fastify.put('/groups/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<import('../types').UserGroup> & { route_profile_id?: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    try {
      const g = profilesService.updateGroup(request.params.id, request.body);
      return g;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });
}
