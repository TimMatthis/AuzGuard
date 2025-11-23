// Tenant connection manager
// Manages dynamic connections to tenant databases with pooling
import { PrismaClient as TenantPrismaClient } from '@prisma/client';
import { PrismaClient as MasterPrismaClient } from '../../node_modules/.prisma/client-master';

export class TenantConnectionManager {
  private connections: Map<string, TenantPrismaClient> = new Map();
  private masterPrisma: MasterPrismaClient;
  private maxConnections: number = 50; // Max concurrent tenant connections

  constructor(masterPrisma: MasterPrismaClient) {
    this.masterPrisma = masterPrisma;
  }

  /**
   * Get a connection to a tenant database by slug
   */
  async getTenantConnection(tenantSlug: string): Promise<TenantPrismaClient> {
    // Check if we already have a connection
    const existing = this.connections.get(tenantSlug);
    if (existing) {
      return existing;
    }

    // Get tenant info from master database
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantSlug}`);
    }

    if (tenant.status !== 'active') {
      throw new Error(`Tenant is not active: ${tenantSlug}`);
    }

    // Create new connection
    const connection = await this.createConnection(tenant.database_url);
    
    // Store in cache
    if (this.connections.size >= this.maxConnections) {
      // Remove oldest connection (simple FIFO)
      const firstKey = this.connections.keys().next().value;
      if (firstKey) {
        const oldConnection = this.connections.get(firstKey);
        if (oldConnection) {
          await oldConnection.$disconnect();
        }
        this.connections.delete(firstKey);
      }
    }
    
    this.connections.set(tenantSlug, connection);
    
    // Update last active
    await this.masterPrisma.tenant.update({
      where: { id: tenant.id },
      data: { last_active_at: new Date() }
    }).catch(() => {}); // Don't fail if this fails

    return connection;
  }

  /**
   * Get tenant info by slug
   */
  async getTenantInfo(tenantSlug: string) {
    return await this.masterPrisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });
  }

  /**
   * Find tenant by admin email (used during login)
   */
  async findTenantByEmail(email: string) {
    // Check if email is admin of any tenant
    const tenant = await this.masterPrisma.tenant.findFirst({
      where: { admin_email: email }
    });

    return tenant;
  }

  /**
   * Find tenant by user email (search in all tenant databases)
   * Note: This is expensive, should be cached or optimized in production
   */
  async findTenantByUserEmail(email: string) {
    const tenants = await this.masterPrisma.tenant.findMany({
      where: { status: 'active' }
    });

    for (const tenant of tenants) {
      try {
        const connection = await this.getTenantConnection(tenant.slug);
        const user = await connection.user.findUnique({
          where: { email }
        });
        
        if (user) {
          return { tenant, user };
        }
      } catch (error) {
        console.error(`Error checking tenant ${tenant.slug}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Create a new connection to a tenant database
   */
  private async createConnection(databaseUrl: string): Promise<TenantPrismaClient> {
    const prisma = new TenantPrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });

    // Test the connection
    try {
      await prisma.$connect();
    } catch (error) {
      throw new Error(`Failed to connect to tenant database: ${error}`);
    }

    return prisma;
  }

  /**
   * Close a specific tenant connection
   */
  async closeTenantConnection(tenantSlug: string): Promise<void> {
    const connection = this.connections.get(tenantSlug);
    if (connection) {
      await connection.$disconnect();
      this.connections.delete(tenantSlug);
    }
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  async closeAllConnections(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map(
      conn => conn.$disconnect()
    );
    await Promise.all(disconnectPromises);
    this.connections.clear();
  }

  /**
   * Get master database client
   */
  getMasterClient(): MasterPrismaClient {
    return this.masterPrisma;
  }
}

