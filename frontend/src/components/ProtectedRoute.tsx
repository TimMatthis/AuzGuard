import { Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function hasPermission(userRole: UserRole, action: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    viewer: ['read'],
    developer: ['read', 'edit_rules', 'simulate'],
    compliance: ['read', 'edit_rules', 'simulate', 'publish_rules', 'manage_overrides'],
    admin: ['read', 'edit_rules', 'simulate', 'publish_rules', 'manage_overrides', 'manage_routes', 'manage_users', 'manage_settings', 'manage_api_keys'],
    chat: []
  };

  return permissions[userRole]?.includes(action) || false;
}
