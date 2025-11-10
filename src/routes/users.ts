// Tenant-aware user management routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService, CreateUserInput, UpdateUserInput } from '../services/users';
import { UserGroupService, CreateUserGroupInput, UpdateUserGroupInput, CreateProductAccessGroupInput, UpdateProductAccessGroupInput } from '../services/userGroups';
import { AuthService } from '../services/auth';
import { TenantConnectionManager } from '../services/tenantConnectionManager';
import { UserRole } from '../types';

interface UserRoutesOptions {
  userService: UserService;
  userGroupService: UserGroupService;
  authService: AuthService;
  connectionManager: TenantConnectionManager;
}

const extractUser = (request: FastifyRequest) => request.user as { id: string; email: string; role: UserRole; tenant_slug?: string };

export async function userRoutes(fastify: FastifyInstance, options: UserRoutesOptions) {
  const { connectionManager, authService } = options;

  // Auth middleware - all routes require authentication with tenant_slug
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
      const user = authService.getUserFromToken(token);
      
      if (!user.tenant_slug) {
        return reply.status(400).send({ error: { code: 'INVALID_TOKEN', message: 'Token missing tenant information. Please use /api/tenant/login or /api/company/register' } });
      }
      
      request.user = user;
    } catch (e) {
      return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
  });

  // User routes (all tenant-aware)
  fastify.get('/users', async (request: FastifyRequest<{ Querystring: { org_id?: string; user_group_id?: string; is_active?: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    
    if (!authService.canPerformAction(user.role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const tenantUserService = new UserService(tenantPrisma);
      
      const filters: any = {};
      if (request.query.user_group_id) filters.user_group_id = request.query.user_group_id;
      if (request.query.is_active !== undefined) filters.is_active = request.query.is_active === 'true';

      return await tenantUserService.listUsers(filters);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch users';
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: msg } });
    }
  });

  fastify.get('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    // Users can view their own profile, admins can view any
    if (user.id !== request.params.id && !authService.canPerformAction(user.role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const tenantUserService = new UserService(tenantPrisma);
      
      const result = await tenantUserService.getUserWithGroup(request.params.id);
      if (!result) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch user';
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: msg } });
    }
  });

  fastify.post('/users', async (request: FastifyRequest<{ Body: CreateUserInput }>, reply: FastifyReply) => {
    const user = extractUser(request);
    
    if (!authService.canPerformAction(user.role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const tenantUserService = new UserService(tenantPrisma);
      
      // Validate email and password
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.body.email)) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } });
      }

      if (!request.body.password || request.body.password.length < 8) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } });
      }
      
      return await tenantUserService.createUser(request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create user';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  fastify.put('/users/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserInput }>, reply: FastifyReply) => {
    const user = extractUser(request);
    // Users can update their own profile (limited), admins can update any
    const isSelf = user.id === request.params.id;
    const isAdmin = authService.canPerformAction(user.role, 'manage_users');

    if (!isSelf && !isAdmin) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    // If not admin, can only update password
    if (isSelf && !isAdmin) {
      const { password } = request.body;
      if (Object.keys(request.body).some(k => k !== 'password')) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Can only update your own password' } });
      }
      request.body = { password };
    }

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const tenantUserService = new UserService(tenantPrisma);
      
      return await tenantUserService.updateUser(request.params.id, request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update user';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  fastify.delete('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    
    if (!authService.canPerformAction(user.role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const tenantUserService = new UserService(tenantPrisma);
      
      await tenantUserService.deleteUser(request.params.id);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete user';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // User group assignment
  fastify.post('/users/:id/assign-group', async (request: FastifyRequest<{ Params: { id: string }; Body: { group_id: string | null } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    
    if (!authService.canPerformAction(user.role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const tenantUserService = new UserService(tenantPrisma);
      
      return await tenantUserService.assignUserToGroup(request.params.id, request.body.group_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to assign user to group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // User Group routes (tenant-aware)
  fastify.get('/user-groups', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = extractUser(request);
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const tenantUserGroupService = new UserGroupService(tenantPrisma);
      
      return await tenantUserGroupService.listUserGroups();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch user groups';
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: msg } });
    }
  });

  fastify.get('/user-groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const result = await userGroupService.getUserGroup(request.params.id);
    if (!result) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User group not found' } });
    }
    return result;
  });

  fastify.post('/user-groups', async (request: FastifyRequest<{ Body: CreateUserGroupInput }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await userGroupService.createUserGroup(request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create user group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  fastify.put('/user-groups/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserGroupInput }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await userGroupService.updateUserGroup(request.params.id, request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update user group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  fastify.delete('/user-groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_routes')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      await userGroupService.deleteUserGroup(request.params.id);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete user group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // Product Access Group routes
  fastify.get('/product-access-groups', async () => {
    return await userGroupService.listProductAccessGroups();
  });

  fastify.get('/product-access-groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const result = await userGroupService.getProductAccessGroup(request.params.id);
    if (!result) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Product access group not found' } });
    }
    return result;
  });

  fastify.post('/product-access-groups', async (request: FastifyRequest<{ Body: CreateProductAccessGroupInput }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_settings')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await userGroupService.createProductAccessGroup(request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create product access group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  fastify.put('/product-access-groups/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductAccessGroupInput }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_settings')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await userGroupService.updateProductAccessGroup(request.params.id, request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update product access group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  fastify.delete('/product-access-groups/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_settings')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      await userGroupService.deleteProductAccessGroup(request.params.id);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete product access group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });
}

