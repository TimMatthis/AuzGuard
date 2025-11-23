// Tenant/Company registration and management routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TenantProvisioningService } from '../services/tenantProvisioning';
import { TenantConnectionManager } from '../services/tenantConnectionManager';
import { AuthService } from '../services/auth';
import { UserRole } from '../types';
import { EmailService } from '../services/email';

interface TenantRoutesOptions {
  provisioningService: TenantProvisioningService;
  connectionManager: TenantConnectionManager;
  authService: AuthService;
}

interface CreateCompanyRequest {
  slug: string;
  company_name: string;
  admin_email: string;
  admin_name?: string;
  admin_password: string;
  plan?: string;
}

interface LoginRequest {
  email: string;
  password: string;
  tenant_slug?: string; // Optional: if user knows their tenant
}

export async function tenantRoutes(fastify: FastifyInstance, options: TenantRoutesOptions) {
  const { provisioningService, connectionManager, authService } = options;

  // Public route: Register a new company
  fastify.post('/company/register', async (
    request: FastifyRequest<{ Body: CreateCompanyRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const { slug, company_name, admin_email, admin_name, admin_password, plan } = request.body;

      // Validate input
      if (!slug || !company_name || !admin_email || !admin_password) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(admin_email)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' }
        });
      }

      // Validate password strength
      if (admin_password.length < 8) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
        });
      }

      // Create the tenant
      const result = await provisioningService.createTenant({
        slug,
        company_name,
        admin_email,
        admin_name,
        admin_password,
        plan
      });

      // Generate token for admin user
      const user = {
        id: result.initialUser.id,
        email: result.initialUser.email,
        role: result.initialUser.role as UserRole,
        created_at: result.initialUser.created_at
      };
      
      const token = authService.generateToken(user);

      // Send verification email to admin (non-blocking)
      const emailService = new EmailService();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${result.initialUser.verification_token}&email=${encodeURIComponent(admin_email)}&slug=${encodeURIComponent(result.tenant.slug)}`;
      
      emailService.sendEmailVerification({
        companyName: result.tenant.company_name,
        adminName: admin_name || admin_email.split('@')[0],
        adminEmail: admin_email,
        verificationUrl,
        expiresIn: '24 hours'
      }).catch(error => {
        // Log email error but don't fail the request
        console.error('Failed to send verification email:', error);
      });

      // In development mode, include the verification URL in the response
      const response: any = {
        success: true,
        message: 'Company created successfully! Please check your email to verify your account.',
        email_verification_required: true,
        tenant: {
          id: result.tenant.id,
          slug: result.tenant.slug,
          company_name: result.tenant.company_name
        },
        user: {
          ...user,
          email_verified: false
        },
        token  // Token is provided but login will be blocked until verified
      };

      // Include verification URL in development mode for easy testing
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        response.verification_url = verificationUrl;
        console.log('\n🔗 EMAIL VERIFICATION URL (Development Mode):');
        console.log(verificationUrl);
        console.log('');
      }

      return response;
    } catch (error) {
      // Log the full error for debugging
      console.error('Company registration error:', error);
      
      const msg = error instanceof Error ? error.message : 'Company registration failed';
      
      // Provide more helpful error messages
      let userMessage = msg;
      if (msg.includes('psql') || msg.includes('command not found') || msg.includes('not recognized')) {
        userMessage = 'Database provisioning error. Please ensure PostgreSQL tools are installed and configured. Contact your system administrator.';
      }
      
      return reply.status(400).send({
        error: { 
          code: 'REGISTRATION_ERROR', 
          message: userMessage,
          details: process.env.NODE_ENV === 'development' ? msg : undefined
        }
      });
    }
  });

  // Public route: Verify email
  fastify.get('/verify-email', async (
    request: FastifyRequest<{ Querystring: { token: string; email: string; slug?: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { token, email, slug } = request.query;

      console.log('Email verification attempt:', { email, tokenLength: token?.length });

      if (!token || !email) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Token and email are required' }
        });
      }

      // If slug provided, prefer verifying against that specific tenant first
      if (slug) {
        try {
          const tenantInfo = await connectionManager.getTenantInfo(slug);
          if (!tenantInfo) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Company not found' } });
          }

          const tp = await connectionManager.getTenantConnection(slug);
          const u = await tp.user.findFirst({ where: { email, verification_token: token } });
          if (u) {
            // Proceed with verification flow on this tenant
            if (u.verification_token_expires && new Date() > u.verification_token_expires) {
              return reply.status(400).send({
                error: { code: 'TOKEN_EXPIRED', message: 'Verification token has expired. Please request a new one.' }
              });
            }

            if (u.email_verified) {
              return reply.status(200).send({
                success: true,
                message: 'Email already verified. You can now log in.',
                already_verified: true
              });
            }

            await tp.user.update({
              where: { id: u.id },
              data: { email_verified: true, verification_token: null, verification_token_expires: null }
            });

            if (u.role === 'admin') {
              await provisioningService['masterPrisma'].tenant.update({
                where: { id: tenantInfo.id },
                data: { admin_email_verified: true }
              });
            }

            const emailService = new EmailService();
            const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            emailService.sendCompanyWelcomeEmail({
              companyName: tenantInfo.company_name,
              adminName: u.name || email.split('@')[0],
              adminEmail: email,
              companySlug: tenantInfo.slug,
              loginUrl: `${loginUrl}/login`
            }).catch(error => {
              console.error('Failed to send welcome email:', error);
            });

            return { success: true, message: 'Email verified successfully! You can now log in to your account.' };
          }
          // If not found for this slug, check if the user is already verified to make the endpoint idempotent
          const userByEmail = await tp.user.findFirst({ where: { email } });
          if (userByEmail?.email_verified) {
            return reply.status(200).send({
              success: true,
              message: 'Email already verified. You can now log in.',
              already_verified: true
            });
          }
          // If not found for this slug, fall through to candidate search by email (backward-compatible)
        } catch (e) {
          console.error('Slug-specific verification error:', e);
          // Fall through to email-based lookup
        }
      }

      // Find potential tenants by admin email. In dev/testing it's common
      // to reuse the same admin email for multiple tenants, so we must
      // check all matches to find the one that owns this token.
      const candidateTenants = await provisioningService['masterPrisma'].tenant.findMany({
        where: { admin_email: email },
        orderBy: { created_at: 'desc' }
      });

      console.log('Tenant candidates for verification:', candidateTenants.map(t => ({ id: t.id, slug: t.slug })));

      if (!candidateTenants.length) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' }
        });
      }

      // Iterate candidates until we find a matching user+token
      let matchedTenant: typeof candidateTenants[number] | null = null;
      let user: any = null;
      let tenantPrisma: any = null;

      for (const t of candidateTenants) {
        try {
          const tp = await connectionManager.getTenantConnection(t.slug);
          const u = await tp.user.findFirst({ where: { email, verification_token: token } });
          if (u) {
            matchedTenant = t;
            user = u;
            tenantPrisma = tp;
            break;
          }
        } catch (e) {
          console.error('Error checking tenant for verification:', t.slug, e);
          continue;
        }
      }

      if (!matchedTenant || !user) {
        // Idempotency: if we can find the user by email and they are already verified in any candidate tenant,
        // return success instead of error (handles React StrictMode double calls)
        for (const t of candidateTenants) {
          try {
            const tp = await connectionManager.getTenantConnection(t.slug);
            const userByEmail = await tp.user.findFirst({ where: { email } });
            if (userByEmail?.email_verified) {
              return reply.status(200).send({
                success: true,
                message: 'Email already verified. You can now log in.',
                already_verified: true
              });
            }
          } catch (_) { /* ignore */ }
        }

        return reply.status(400).send({
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' }
        });
      }

      // Check if token is expired
      if (user.verification_token_expires && new Date() > user.verification_token_expires) {
        return reply.status(400).send({
          error: { code: 'TOKEN_EXPIRED', message: 'Verification token has expired. Please request a new one.' }
        });
      }

      // Check if already verified
      if (user.email_verified) {
        return reply.status(200).send({
          success: true,
          message: 'Email already verified. You can now log in.',
          already_verified: true
        });
      }

      // Verify the email
      await tenantPrisma.user.update({
        where: { id: user.id },
        data: {
          email_verified: true,
          verification_token: null,
          verification_token_expires: null
        }
      });

      // Update master tenant record to mark admin email as verified
      if (user.role === 'admin') {
        await provisioningService['masterPrisma'].tenant.update({
          where: { id: matchedTenant.id },
          data: { admin_email_verified: true }
        });
      }

      // Send welcome email now that they're verified
      const emailService = new EmailService();
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      emailService.sendCompanyWelcomeEmail({
        companyName: matchedTenant.company_name,
        adminName: user.name || email.split('@')[0],
        adminEmail: email,
        companySlug: matchedTenant.slug,
        loginUrl: `${loginUrl}/login`
      }).catch(error => {
        console.error('Failed to send welcome email:', error);
      });

      return {
        success: true,
        message: 'Email verified successfully! You can now log in to your account.'
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Email verification failed';
      return reply.status(500).send({
        error: { code: 'VERIFICATION_ERROR', message: msg }
      });
    }
  });

  // Public route: Login to tenant
  fastify.post('/tenant/login', async (
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ) => {
    try {
      const { email, password, tenant_slug } = request.body;

      // If tenant slug is provided, use it directly
      let tenantInfo;
      if (tenant_slug) {
        tenantInfo = await connectionManager.getTenantInfo(tenant_slug);
        if (!tenantInfo) {
          return reply.status(404).send({
            error: { code: 'TENANT_NOT_FOUND', message: 'Company not found' }
          });
        }
      } else {
        // Find tenant by email
        const result = await connectionManager.findTenantByUserEmail(email);
        if (!result) {
          return reply.status(401).send({
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
          });
        }
        tenantInfo = result.tenant;
      }

      // Get tenant connection
      const tenantPrisma = await connectionManager.getTenantConnection(tenantInfo.slug);

      // Verify user credentials
      const user = await tenantPrisma.user.findUnique({
        where: { email }
      });

      if (!user || !user.is_active) {
        return reply.status(401).send({
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      // Verify password
      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return reply.status(401).send({
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        });
      }

      // Check if email is verified
      if (!user.email_verified) {
        return reply.status(403).send({
          error: { 
            code: 'EMAIL_NOT_VERIFIED', 
            message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
            email_verified: false
          }
        });
      }

      // Update last login
      await tenantPrisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() }
      });

      // Generate token (include tenant slug in token)
      const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        tenant_slug: tenantInfo.slug, // Important: include tenant in token
        created_at: user.created_at.toISOString()
      };

      const token = authService.generateToken(userPayload as any);

      return {
        success: true,
        tenant: {
          slug: tenantInfo.slug,
          company_name: tenantInfo.company_name
        },
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name || undefined
        },
        token
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      fastify.log.error({ error }, 'Login error');
      return reply.status(500).send({
        error: { code: 'LOGIN_ERROR', message: msg }
      });
    }
  });

  // Public route: Get tenant info by slug
  fastify.get('/company/:slug', async (
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const tenant = await connectionManager.getTenantInfo(request.params.slug);
      
      if (!tenant) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Company not found' }
        });
      }

      return {
        slug: tenant.slug,
        company_name: tenant.company_name,
        status: tenant.status,
        plan: tenant.plan
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch company info';
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: msg }
      });
    }
  });

  // Public route: Check if slug is available
  fastify.get('/company/check/:slug', async (
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const tenant = await connectionManager.getTenantInfo(request.params.slug);
      return {
        available: !tenant
      };
    } catch (error) {
      return { available: true };
    }
  });
}
