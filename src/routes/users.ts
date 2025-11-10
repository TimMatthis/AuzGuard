// User management routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService, CreateUserInput, UpdateUserInput } from '../services/users';
import { UserGroupService, CreateUserGroupInput, UpdateUserGroupInput, CreateProductAccessGroupInput, UpdateProductAccessGroupInput } from '../services/userGroups';
import { AuthService } from '../services/auth';
import { UserRole } from '../types';

interface UserRoutesOptions {
  userService: UserService;
  userGroupService: UserGroupService;
  authService: AuthService;
}

const extractUser = (request: FastifyRequest) => request.user as { id: string; email: string; role: UserRole };

export async function userRoutes(fastify: FastifyInstance, options: UserRoutesOptions) {
  const { userService, userGroupService, authService } = options;

  // Public routes that don't require authentication
  const publicRoutes = ['/api/auth/login', '/api/auth/register'];

  // Auth middleware - skip for public routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for public routes
    if (publicRoutes.includes(request.url.split('?')[0])) {
      return;
    }

    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
      const user = authService.getUserFromToken(token);
      request.user = user;
    } catch (e) {
      return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
  });

  // Login route (public)
  fastify.post('/auth/login', async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
    try {
      const result = await authService.login(request.body.email, request.body.password);
      if (!result) {
        return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      }
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      return reply.status(500).send({ error: { code: 'LOGIN_ERROR', message: msg } });
    }
  });

  // Registration route (public)
  fastify.post('/auth/register', async (request: FastifyRequest<{ Body: CreateUserInput }>, reply: FastifyReply) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.body.email)) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } });
      }

      // Validate password strength (minimum 8 characters)
      if (!request.body.password || request.body.password.length < 8) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } });
      }

      // Create user with default viewer role
      const user = await userService.createUser({
        ...request.body,
        role: request.body.role || 'viewer' // Default to viewer, or allow specified role
      });

      // Generate token for the new user
      const token = authService.generateToken(user);

      return { user, token };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      return reply.status(400).send({ error: { code: 'REGISTRATION_ERROR', message: msg } });
    }
  });

  // User routes
  fastify.get('/users', async (request: FastifyRequest<{ Querystring: { org_id?: string; user_group_id?: string; is_active?: string } }>) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_users')) {
      return { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } };
    }

    const filters: any = {};
    if (request.query.org_id) filters.org_id = request.query.org_id;
    if (request.query.user_group_id) filters.user_group_id = request.query.user_group_id;
    if (request.query.is_active !== undefined) filters.is_active = request.query.is_active === 'true';

    return await userService.listUsers(filters);
  });

  fastify.get('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    // Users can view their own profile, admins can view any
    if (user.id !== request.params.id && !authService.canPerformAction(user.role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    const result = await userService.getUserWithGroup(request.params.id);
    if (!result) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    return result;
  });

  fastify.post('/users', async (request: FastifyRequest<{ Body: CreateUserInput }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await userService.createUser(request.body);
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
      return await userService.updateUser(request.params.id, request.body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update user';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  fastify.delete('/users/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      await userService.deleteUser(request.params.id);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete user';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // User group assignment
  fastify.post('/users/:id/assign-group', async (request: FastifyRequest<{ Params: { id: string }; Body: { group_id: string | null } }>, reply: FastifyReply) => {
    if (!authService.canPerformAction(extractUser(request).role, 'manage_users')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      return await userService.assignUserToGroup(request.params.id, request.body.group_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to assign user to group';
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });

  // User Group routes
  fastify.get('/user-groups', async () => {
    return await userGroupService.listUserGroups();
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

