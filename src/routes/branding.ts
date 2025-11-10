import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BrandingService, UpdateBrandingInput } from '../services/branding';
import { AuthService } from '../services/auth';
import { TenantConnectionManager } from '../services/tenantConnectionManager';
import { UserRole } from '../types';

interface BrandingRoutesOptions {
  authService: AuthService;
  connectionManager: TenantConnectionManager;
}

const extractUser = (request: FastifyRequest) => request.user as { id: string; email: string; role: UserRole; tenant_slug?: string };

export async function brandingRoutes(fastify: FastifyInstance, options: BrandingRoutesOptions) {
  const { connectionManager, authService } = options;

  // Public branding endpoint (no auth required)
  fastify.get('/branding', async (request, reply) => {
    // Simple demo branding resolution by host or org_id query param
    const host = request.headers['x-forwarded-host'] || request.headers['host'];
    const orgId = (request.query as any)?.org_id as string | undefined;

    // Default values (could be env-driven)
    const defaultBrand = {
      brandName: process.env.BRAND_NAME || 'AuzGuard',
      logoUrl: process.env.BRAND_LOGO_URL || undefined,
      poweredBySuffix: process.env.BRAND_POWERED_BY || 'powered by AuzGuard',
    };

    // Example mapping: override for certain hostnames or orgs
    // In production, you might fetch this from DB by orgId or domain
    if (typeof host === 'string') {
      const lower = host.toLowerCase();
      if (lower.includes('cba')) {
        return {
          brandName: 'CBA',
          logoUrl: process.env.BRAND_CBA_LOGO_URL || defaultBrand.logoUrl,
          poweredBySuffix: 'powered by AuzGuard',
        };
      }
    }
    if (orgId === 'cba' || orgId === 'org-cba') {
      return {
        brandName: 'CBA',
        logoUrl: process.env.BRAND_CBA_LOGO_URL || defaultBrand.logoUrl,
        poweredBySuffix: 'powered by AuzGuard',
      };
    }

    return defaultBrand;
  });

  // Auth middleware for protected routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip auth for public /branding endpoint
    if (request.url === '/branding' || request.url.startsWith('/branding?')) {
      return;
    }

    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
      const user = authService.getUserFromToken(token);
      
      if (!user.tenant_slug) {
        return reply.status(400).send({ error: { code: 'INVALID_TOKEN', message: 'Token missing tenant information' } });
      }
      
      request.user = user;
    } catch (e) {
      return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
  });

  // Get tenant branding (authenticated)
  fastify.get('/tenant/branding', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);
    
    try {
      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const brandingService = new BrandingService(tenantPrisma);
      
      const branding = await brandingService.getBranding();
      
      if (!branding) {
        return {
          company_name: 'Your Company',
          logo_url: null,
        };
      }
      
      return branding;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch branding';
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: msg } });
    }
  });

  // Update tenant branding
  fastify.put('/tenant/branding', async (request: FastifyRequest<{ Body: UpdateBrandingInput }>, reply: FastifyReply) => {
    const user = extractUser(request);
    
    if (!authService.canPerformAction(user.role, 'manage_settings')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      // Log the request body for debugging
      fastify.log.info({ body: request.body }, 'Updating branding');
      
      // Validate request body
      if (!request.body) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Request body is required' } });
      }

      const tenantPrisma = await connectionManager.getTenantConnection(user.tenant_slug!);
      const brandingService = new BrandingService(tenantPrisma);
      
      const branding = await brandingService.updateBranding(request.body);
      return branding;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update branding';
      fastify.log.error({ error, body: request.body }, 'Failed to update branding');
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: msg } });
    }
  });
}