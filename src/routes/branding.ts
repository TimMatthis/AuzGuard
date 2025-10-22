import { FastifyInstance } from 'fastify';

export async function brandingRoutes(fastify: FastifyInstance) {
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
}