// Tenant provisioning service
// Handles creation of new tenant databases and initialization
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient as MasterPrismaClient } from '../../node_modules/.prisma/client-master';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

export interface CreateTenantInput {
  slug: string;
  company_name: string;
  admin_email: string;
  admin_name?: string;
  admin_password: string;
  plan?: string;
}

export class TenantProvisioningService {
  private masterPrisma: MasterPrismaClient;
  private dbHost: string;
  private dbPort: string;
  private dbUser: string;
  private dbPassword: string;

  constructor(masterPrisma: MasterPrismaClient) {
    this.masterPrisma = masterPrisma;
    
    // Parse master database URL to get connection details
    const masterUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL || '';
    const parsed = this.parsePostgresUrl(masterUrl);
    
    this.dbHost = parsed.host;
    this.dbPort = parsed.port;
    this.dbUser = parsed.user;
    this.dbPassword = parsed.password;
  }

  async createTenant(input: CreateTenantInput): Promise<{ tenant: any; initialUser: any }> {
    // Validate slug (must be URL-safe)
    if (!/^[a-z0-9-]+$/.test(input.slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if tenant already exists
    const existing = await this.masterPrisma.tenant.findUnique({
      where: { slug: input.slug }
    });

    if (existing) {
      throw new Error('A company with this identifier already exists');
    }

    // Generate database name
    const dbName = `auzguard_tenant_${input.slug.replace(/-/g, '_')}`;

    try {
      // 1. Create the database
      await this.createDatabase(dbName);

      // 2. Build connection URL for tenant
      const tenantDbUrl = `postgresql://${this.dbUser}:${this.dbPassword}@${this.dbHost}:${this.dbPort}/${dbName}?schema=public`;

      // 3. Run migrations on tenant database
      await this.runTenantMigrations(tenantDbUrl);

      // 4. Register tenant in master database
      const tenant = await this.masterPrisma.tenant.create({
        data: {
          slug: input.slug,
          company_name: input.company_name,
          database_name: dbName,
          database_url: tenantDbUrl,
          admin_email: input.admin_email,
          admin_name: input.admin_name,
          plan: input.plan || 'starter',
          status: 'active',
          last_active_at: new Date()
        }
      });

      // 5. Create initial admin user in tenant database
      const initialUser = await this.createInitialAdminUser(
        tenantDbUrl,
        input.admin_email,
        input.admin_password,
        input.admin_name
      );

      // 6. Log the action
      await this.masterPrisma.auditLog.create({
        data: {
          tenant_id: tenant.id,
          action: 'TENANT_CREATED',
          actor_email: input.admin_email,
          metadata: {
            company_name: input.company_name,
            database_name: dbName
          }
        }
      });

      return { tenant, initialUser };
    } catch (error) {
      // Rollback: try to drop the database if it was created
      try {
        await this.dropDatabase(dbName);
      } catch (cleanupError) {
        console.error('Failed to cleanup database after error:', cleanupError);
      }
      throw error;
    }
  }

  async getTenant(slug: string) {
    return await this.masterPrisma.tenant.findUnique({
      where: { slug }
    });
  }

  async getTenantByEmail(email: string) {
    // Find tenant where this email is the admin
    return await this.masterPrisma.tenant.findFirst({
      where: { admin_email: email }
    });
  }

  async listTenants(filters?: { status?: string }) {
    return await this.masterPrisma.tenant.findMany({
      where: filters,
      orderBy: { created_at: 'desc' }
    });
  }

  async updateTenantStatus(tenantId: string, status: string) {
    return await this.masterPrisma.tenant.update({
      where: { id: tenantId },
      data: { status, updated_at: new Date() }
    });
  }

  async updateLastActive(tenantId: string) {
    await this.masterPrisma.tenant.update({
      where: { id: tenantId },
      data: { last_active_at: new Date() }
    });
  }

  private async createDatabase(dbName: string): Promise<void> {
    const createDbCommand = `psql -h ${this.dbHost} -p ${this.dbPort} -U ${this.dbUser} -d postgres -c "CREATE DATABASE ${dbName};"`;
    
    try {
      await execAsync(createDbCommand, {
        env: {
          ...process.env,
          PGPASSWORD: this.dbPassword
        }
      });
      console.log(`Database ${dbName} created successfully`);
    } catch (error: any) {
      // Check if error is because database already exists
      if (error.message?.includes('already exists')) {
        console.log(`Database ${dbName} already exists, continuing...`);
      } else {
        throw new Error(`Failed to create database: ${error.message}`);
      }
    }
  }

  private async dropDatabase(dbName: string): Promise<void> {
    const dropDbCommand = `psql -h ${this.dbHost} -p ${this.dbPort} -U ${this.dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`;
    
    try {
      await execAsync(dropDbCommand, {
        env: {
          ...process.env,
          PGPASSWORD: this.dbPassword
        }
      });
      console.log(`Database ${dbName} dropped`);
    } catch (error: any) {
      console.error(`Failed to drop database: ${error.message}`);
    }
  }

  private async runTenantMigrations(tenantDbUrl: string): Promise<void> {
    // Set the DATABASE_URL env var temporarily and run migrations
    const migrationCommand = `npx prisma migrate deploy --schema=./prisma/schema-tenant.prisma`;
    
    try {
      const { stdout, stderr } = await execAsync(migrationCommand, {
        env: {
          ...process.env,
          DATABASE_URL: tenantDbUrl
        }
      });
      console.log('Migration output:', stdout);
      if (stderr) console.error('Migration stderr:', stderr);
    } catch (error: any) {
      throw new Error(`Failed to run migrations: ${error.message}`);
    }
  }

  private async createInitialAdminUser(
    tenantDbUrl: string,
    email: string,
    password: string,
    name?: string
  ): Promise<any> {
    // Connect to tenant database and create admin user
    const tenantPrisma = new PrismaClient({
      datasources: {
        db: {
          url: tenantDbUrl
        }
      }
    });

    try {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await tenantPrisma.user.create({
        data: {
          email,
          password_hash: passwordHash,
          name,
          role: 'admin',
          is_active: true
        }
      });

      await tenantPrisma.$disconnect();
      
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at.toISOString()
      };
    } catch (error) {
      await tenantPrisma.$disconnect();
      throw error;
    }
  }

  private parsePostgresUrl(url: string): { host: string; port: string; user: string; password: string; database: string } {
    // Parse postgresql://user:password@host:port/database
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):([^/]+)\/([^?]+)/;
    const match = url.match(regex);
    
    if (!match) {
      return {
        host: 'localhost',
        port: '5432',
        user: 'postgres',
        password: 'postgres',
        database: 'postgres'
      };
    }

    return {
      user: decodeURIComponent(match[1]),
      password: decodeURIComponent(match[2]), // Decode URL-encoded password
      host: match[3],
      port: match[4],
      database: match[5]
    };
  }
}

