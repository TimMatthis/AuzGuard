// Tenant Branding Service
import type { PrismaClient as TenantPrismaClient } from '@prisma/client';

export interface TenantBranding {
  id: string;
  company_name: string;
  logo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateBrandingInput {
  company_name?: string;
  logo_url?: string | null;
}

export class BrandingService {
  constructor(private prisma: TenantPrismaClient) {}

  async getBranding(): Promise<TenantBranding | null> {
    // Get the first (and should be only) branding record
    return await this.prisma.tenantBranding.findFirst();
  }

  async updateBranding(data: UpdateBrandingInput): Promise<TenantBranding> {
    // Try to update existing branding record, or create if doesn't exist
    const existing = await this.prisma.tenantBranding.findFirst();
    
    if (existing) {
      return await this.prisma.tenantBranding.update({
        where: { id: existing.id },
        data: {
          ...(data.company_name !== undefined && { company_name: data.company_name }),
          ...(data.logo_url !== undefined && { logo_url: data.logo_url }),
        },
      });
    } else {
      // Create new branding record
      if (!data.company_name) {
        throw new Error('company_name is required when creating branding');
      }
      return await this.prisma.tenantBranding.create({
        data: {
          company_name: data.company_name,
          logo_url: data.logo_url || null,
        },
      });
    }
  }

  async initializeBranding(company_name: string): Promise<TenantBranding> {
    // Check if branding already exists
    const existing = await this.prisma.tenantBranding.findFirst();
    if (existing) {
      return existing;
    }

    // Create initial branding record
    return await this.prisma.tenantBranding.create({
      data: {
        company_name,
      },
    });
  }
}

