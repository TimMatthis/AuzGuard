// User group and product access management service
import { PrismaClient as TenantPrismaClient } from '@prisma/client';
import { UserGroup } from '../types';

export interface CreateUserGroupInput {
  name: string;
  default_pool_id?: string;
  allowed_pools?: string[];
  default_policy_id?: string;
  allowed_policies?: string[];
  route_profile_id?: string;
  product_access_group_id?: string;
}

export interface UpdateUserGroupInput {
  name?: string;
  default_pool_id?: string | null;
  allowed_pools?: string[];
  default_policy_id?: string | null;
  allowed_policies?: string[];
  route_profile_id?: string | null;
  product_access_group_id?: string | null;
}

export interface UserGroupWithDetails {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  default_pool_id: string | null;
  allowed_pools: string[] | null;
  default_policy_id: string | null;
  allowed_policies: string[] | null;
  route_profile_id: string | null;
  product_access_group_id: string | null;
  routeProfile?: {
    id: string;
    name: string;
    pool_id: string | null;
  } | null;
  productAccessGroup?: {
    id: string;
    name: string;
    description: string | null;
    products: string[];
  } | null;
  _count?: {
    users: number;
  };
}

export interface CreateProductAccessGroupInput {
  name: string;
  description?: string;
  products: string[];
}

export interface UpdateProductAccessGroupInput {
  name?: string;
  description?: string | null;
  products?: string[];
}

export interface ProductAccessGroupWithCount {
  id: string;
  name: string;
  description: string | null;
  products: string[];
  created_at: string;
  updated_at: string;
  _count?: {
    userGroups: number;
  };
}

export class UserGroupService {
  constructor(private prisma: TenantPrismaClient) {}

  // User Group operations
  async createUserGroup(input: CreateUserGroupInput): Promise<UserGroup> {
    const existing = await this.prisma.userGroup.findUnique({
      where: { name: input.name }
    });

    if (existing) {
      throw new Error('User group with this name already exists');
    }

    const group = await this.prisma.userGroup.create({
      data: {
        name: input.name,
        default_pool_id: input.default_pool_id,
        allowed_pools: input.allowed_pools || [],
        default_policy_id: input.default_policy_id,
        allowed_policies: input.allowed_policies || [],
        route_profile_id: input.route_profile_id,
        product_access_group_id: input.product_access_group_id
      }
    });

    return this.toUserGroupType(group);
  }

  async getUserGroup(id: string): Promise<UserGroupWithDetails | null> {
    const group = await this.prisma.userGroup.findUnique({
      where: { id },
      include: {
        routeProfile: {
          select: {
            id: true,
            name: true,
            pool_id: true
          }
        },
        productAccessGroup: {
          select: {
            id: true,
            name: true,
            description: true,
            products: true
          }
        },
        _count: {
          select: { users: true }
        }
      }
    });

    if (!group) return null;

    return {
      id: group.id,
      name: group.name,
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at.toISOString(),
      default_pool_id: group.default_pool_id,
      allowed_pools: (group.allowed_pools as any) || null,
      default_policy_id: group.default_policy_id,
      allowed_policies: (group.allowed_policies as any) || null,
      route_profile_id: group.route_profile_id,
      product_access_group_id: group.product_access_group_id,
      routeProfile: group.routeProfile || null,
      productAccessGroup: group.productAccessGroup ? {
        ...group.productAccessGroup,
        products: group.productAccessGroup.products as any
      } : null,
      _count: group._count
    };
  }

  async listUserGroups(): Promise<UserGroupWithDetails[]> {
    const groups = await this.prisma.userGroup.findMany({
      include: {
        routeProfile: {
          select: {
            id: true,
            name: true,
            pool_id: true
          }
        },
        productAccessGroup: {
          select: {
            id: true,
            name: true,
            description: true,
            products: true
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      created_at: g.created_at.toISOString(),
      updated_at: g.updated_at.toISOString(),
      default_pool_id: g.default_pool_id,
      allowed_pools: (g.allowed_pools as any) || null,
      default_policy_id: g.default_policy_id,
      allowed_policies: (g.allowed_policies as any) || null,
      route_profile_id: g.route_profile_id,
      product_access_group_id: g.product_access_group_id,
      routeProfile: g.routeProfile || null,
      productAccessGroup: g.productAccessGroup ? {
        ...g.productAccessGroup,
        products: g.productAccessGroup.products as any
      } : null,
      _count: g._count
    }));
  }

  async updateUserGroup(id: string, input: UpdateUserGroupInput): Promise<UserGroup> {
    const group = await this.prisma.userGroup.update({
      where: { id },
      data: {
        name: input.name,
        default_pool_id: input.default_pool_id,
        allowed_pools: input.allowed_pools,
        default_policy_id: input.default_policy_id,
        allowed_policies: input.allowed_policies,
        route_profile_id: input.route_profile_id,
        product_access_group_id: input.product_access_group_id
      }
    });

    return this.toUserGroupType(group);
  }

  async deleteUserGroup(id: string): Promise<void> {
    await this.prisma.userGroup.delete({
      where: { id }
    });
  }

  // Product Access Group operations
  async createProductAccessGroup(input: CreateProductAccessGroupInput): Promise<ProductAccessGroupWithCount> {
    const existing = await this.prisma.productAccessGroup.findUnique({
      where: { name: input.name }
    });

    if (existing) {
      throw new Error('Product access group with this name already exists');
    }

    const group = await this.prisma.productAccessGroup.create({
      data: {
        name: input.name,
        description: input.description,
        products: input.products
      },
      include: {
        _count: {
          select: { userGroups: true }
        }
      }
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      products: group.products as any,
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at.toISOString(),
      _count: group._count
    };
  }

  async getProductAccessGroup(id: string): Promise<ProductAccessGroupWithCount | null> {
    const group = await this.prisma.productAccessGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userGroups: true }
        }
      }
    });

    if (!group) return null;

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      products: group.products as any,
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at.toISOString(),
      _count: group._count
    };
  }

  async listProductAccessGroups(): Promise<ProductAccessGroupWithCount[]> {
    const groups = await this.prisma.productAccessGroup.findMany({
      include: {
        _count: {
          select: { userGroups: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      products: g.products as any,
      created_at: g.created_at.toISOString(),
      updated_at: g.updated_at.toISOString(),
      _count: g._count
    }));
  }

  async updateProductAccessGroup(id: string, input: UpdateProductAccessGroupInput): Promise<ProductAccessGroupWithCount> {
    const group = await this.prisma.productAccessGroup.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        products: input.products
      },
      include: {
        _count: {
          select: { userGroups: true }
        }
      }
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      products: group.products as any,
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at.toISOString(),
      _count: group._count
    };
  }

  async deleteProductAccessGroup(id: string): Promise<void> {
    await this.prisma.productAccessGroup.delete({
      where: { id }
    });
  }

  private toUserGroupType(group: any): UserGroup {
    return {
      id: group.id,
      name: group.name,
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at.toISOString(),
      default_pool_id: group.default_pool_id,
      allowed_pools: (group.allowed_pools as any) || undefined,
      default_policy_id: group.default_policy_id,
      allowed_policies: (group.allowed_policies as any) || undefined
    };
  }
}









