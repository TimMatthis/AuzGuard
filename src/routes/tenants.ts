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
      const verificationUrl = `${frontendUrl}/verify-email?token=${result.initialUser.verification_token}&email=${encodeURIComponent(admin_email)}`;
      
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
    request: FastifyRequest<{ Querystring: { token: string; email: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { token, email } = request.query;

      if (!token || !email) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Token and email are required' }
        });
      }

      // First, find which tenant this user belongs to
      const tenant = await provisioningService['masterPrisma'].tenant.findFirst({
        where: { admin_email: email }
      });

      if (!tenant) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' }
        });
      }

      // Connect to tenant database
      const tenantPrisma = await connectionManager.getTenantConnection(tenant.slug);
      
      // Find user by email and verification token
      const user = await tenantPrisma.user.findFirst({
        where: {
          email,
          verification_token: token
        }
      });

      if (!user) {
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
          where: { id: tenant.id },
          data: { admin_email_verified: true }
        });
      }

      // Send welcome email now that they're verified
      const emailService = new EmailService();
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      emailService.sendCompanyWelcomeEmail({
        companyName: tenant.company_name,
        adminName: user.name || email.split('@')[0],
        adminEmail: email,
        companySlug: tenant.slug,
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

