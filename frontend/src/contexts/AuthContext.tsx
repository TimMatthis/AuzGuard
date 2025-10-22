import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (role: UserRole, orgId?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token in localStorage
    const storedToken = localStorage.getItem('auzguard_token');
    if (storedToken) {
      try {
        // For demo purposes, we'll create a mock user from the token
        const mockUser = createMockUserFromToken(storedToken);
        setToken(storedToken);
        setUser(mockUser);
      } catch (error) {
        localStorage.removeItem('auzguard_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (role: UserRole, orgId?: string) => {
    // For demo purposes, generate a mock token
    const mockToken = generateMockToken(role, orgId);
    const mockUser = createMockUser(role, orgId);
    
    localStorage.setItem('auzguard_token', mockToken);
    setToken(mockToken);
    setUser(mockUser);
  };

  const logout = () => {
    localStorage.removeItem('auzguard_token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (action: string): boolean => {
    if (!user) return false;
    
    const permissions: Record<UserRole, string[]> = {
      viewer: ['read'],
      developer: ['read', 'edit_rules', 'simulate'],
      compliance: ['read', 'edit_rules', 'simulate', 'publish_rules', 'manage_overrides'],
      admin: ['read', 'edit_rules', 'simulate', 'publish_rules', 'manage_overrides', 'manage_routes', 'manage_users', 'manage_settings'],
      chat: [] // Chat-only users have no general app permissions
    };

    return permissions[user.role]?.includes(action) || false;
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper functions for demo purposes
function createMockUser(role: UserRole, orgId?: string): User {
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

function createMockUserFromToken(token: string): User {
  // For demo purposes, decode a simple token format
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      org_id: payload.org_id,
      created_at: new Date(payload.iat * 1000).toISOString(),
      last_login: new Date().toISOString()
    };
  } catch {
    throw new Error('Invalid token');
  }
}

function generateMockToken(role: UserRole, orgId?: string): string {
  const payload = {
    sub: `user_${role}_${Date.now()}`,
    email: `${role}@auzguard.com`,
    role,
    org_id: orgId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iss: 'auzguard',
    aud: 'auzguard-api'
  };

  // Create a properly formatted JWT token for development
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  // For development, we'll create a mock signature that the backend can validate
  // The backend uses HMAC-SHA256 with the JWT secret
  const mockSignature = 'dev-mock-signature-' + btoa(headerB64 + '.' + payloadB64).replace(/[^A-Za-z0-9]/g, '').substring(0, 20);
  
  return `${headerB64}.${payloadB64}.${mockSignature}`;
}
