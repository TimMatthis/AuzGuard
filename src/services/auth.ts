// Authentication service for JWT and role management

import { createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { UserRole, User } from '../types';
import { UserService } from './users';

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  org_id?: string;
  tenant_slug?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export class AuthService {
  private jwtSecret: string;
  private jwtIssuer: string;
  private jwtAudience: string;
  private userService?: UserService;

  constructor(userService?: UserService) {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtIssuer = process.env.JWT_ISSUER || 'auzguard';
    this.jwtAudience = process.env.JWT_AUDIENCE || 'auzguard-api';
    this.userService = userService;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    if (!this.userService) {
      throw new Error('UserService not configured for database authentication');
    }

    const user = await this.userService.verifyPassword(email, password);
    if (!user) {
      return null;
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  generateToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
      tenant_slug: user.tenant_slug,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iss: this.jwtIssuer,
      aud: this.jwtAudience
    };

    return this.signToken(payload);
  }

  verifyToken(token: string): TokenPayload {
    const payload = this.decodeAndVerify(token);

    if (payload.iss !== this.jwtIssuer || payload.aud !== this.jwtAudience) {
      throw new Error('Invalid token audience or issuer');
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  }

  getUserFromToken(token: string): User {
    const decoded = this.verifyToken(token);

    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      org_id: decoded.org_id,
      tenant_slug: decoded.tenant_slug,
      created_at: new Date(decoded.iat * 1000).toISOString(),
      last_login: new Date().toISOString()
    };
  }

  hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      developer: 2,
      compliance: 3,
      admin: 4
    };

    const userLevel = roleHierarchy[userRole];
    const requiredLevel = Math.max(...requiredRoles.map(role => roleHierarchy[role]));

    return userLevel >= requiredLevel;
  }

  canPerformAction(userRole: UserRole, action: string): boolean {
    const permissions: Record<UserRole, string[]> = {
      viewer: ['read'],
      developer: ['read', 'edit_rules', 'simulate'],
      compliance: ['read', 'edit_rules', 'simulate', 'publish_rules', 'manage_overrides'],
      admin: ['read', 'edit_rules', 'simulate', 'publish_rules', 'manage_overrides', 'manage_routes', 'manage_users', 'manage_settings', 'manage_api_keys']
    };

    return permissions[userRole]?.includes(action) || false;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  createMockUser(role: UserRole, orgId?: string): User {
    const userId = `user_${role}_${Date.now()}`;

    return {
      id: userId,
      email: `${role}@auzguard.com`,
      role,
      org_id: orgId,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };
  }

  generateMockToken(role: UserRole, orgId?: string): string {
    const user = this.createMockUser(role, orgId);
    return this.generateToken(user);
  }

  private signToken(payload: TokenPayload): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerSegment = this.base64UrlEncode(JSON.stringify(header));
    const payloadSegment = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.createSignature(`${headerSegment}.${payloadSegment}`);
    return `${headerSegment}.${payloadSegment}.${signature}`;
  }

  private decodeAndVerify(token: string): TokenPayload {
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new Error('Invalid token structure');
    }

    const [headerSegment, payloadSegment, signature] = segments;
    
    // In development, accept mock signatures for demo purposes
    if (process.env.NODE_ENV === 'development' && signature.startsWith('dev-mock-signature-')) {
      console.log('Accepting development mock token');
    } else {
      const expectedSignature = this.createSignature(`${headerSegment}.${payloadSegment}`);
      if (signature !== expectedSignature) {
        throw new Error('Invalid token signature');
      }
    }

    // Decode payload (handle both base64url and base64 encoding for compatibility)
    let payloadJson: string;
    try {
      payloadJson = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    } catch (error) {
      // Fallback to regular base64 if base64url fails
      payloadJson = Buffer.from(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    }
    
    return JSON.parse(payloadJson);
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value).toString('base64url');
  }

  private createSignature(message: string): string {
    return createHmac('sha256', this.jwtSecret).update(message).digest('base64url');
  }
}
