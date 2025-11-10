// User management service with database operations
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../types';

export interface CreateUserInput {
  email: string;
  password: string;
  role?: UserRole;
  org_id?: string;
  user_group_id?: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: UserRole;
  org_id?: string;
  user_group_id?: string;
  is_active?: boolean;
}

export interface UserWithGroup {
  id: string;
  email: string;
  role: string;
  org_id: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_active: boolean;
  user_group_id: string | null;
  userGroup?: {
    id: string;
    name: string;
    product_access_group_id: string | null;
    productAccessGroup?: {
      id: string;
      name: string;
      description: string | null;
      products: any;
    } | null;
  } | null;
}

export class UserService {
  constructor(private prisma: PrismaClient) {}

  async createUser(input: CreateUserInput): Promise<User> {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(input.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        password_hash,
        role: input.role || 'viewer',
        org_id: input.org_id,
        user_group_id: input.user_group_id,
        is_active: true
      }
    });

    return this.toUserType(user);
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    return user ? this.toUserType(user) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    return user ? this.toUserType(user) : null;
  }

  async getUserWithGroup(id: string): Promise<UserWithGroup | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userGroup: {
          include: {
            productAccessGroup: true
          }
        }
      }
    });

    if (!user) return null;

    return {
      ...user,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      last_login: user.last_login?.toISOString() || null,
      userGroup: user.userGroup ? {
        ...user.userGroup,
        productAccessGroup: user.userGroup.productAccessGroup || null
      } : null
    };
  }

  async listUsers(filters?: { org_id?: string; user_group_id?: string; is_active?: boolean }): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        org_id: filters?.org_id,
        user_group_id: filters?.user_group_id,
        is_active: filters?.is_active
      },
      orderBy: { created_at: 'desc' }
    });

    return users.map(u => this.toUserType(u));
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const data: any = {
      email: input.email,
      role: input.role,
      org_id: input.org_id,
      user_group_id: input.user_group_id,
      is_active: input.is_active
    };

    // Hash new password if provided
    if (input.password) {
      data.password_hash = await bcrypt.hash(input.password, 12);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data
    });

    return this.toUserType(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { last_login: new Date() }
    });
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.is_active) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return this.toUserType(user);
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  async assignUserToGroup(userId: string, groupId: string | null): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { user_group_id: groupId }
    });

    return this.toUserType(user);
  }

  private toUserType(user: any): User {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      org_id: user.org_id || undefined,
      created_at: user.created_at.toISOString(),
      last_login: user.last_login?.toISOString()
    };
  }
}

