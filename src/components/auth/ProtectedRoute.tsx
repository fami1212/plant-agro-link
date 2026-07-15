import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useKycStatus } from '@/hooks/useKycStatus';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'agriculteur' | 'veterinaire' | 'acheteur' | 'investisseur' | 'admin';
  allowedRoles?: ('agriculteur' | 'veterinaire' | 'acheteur' | 'investisseur' | 'admin')[];
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, rolesLoading, hasRole } = useAuth();
  const { canAccessRoute } = useRoleAccess();
  const { kyc, loading: kycLoading, isApproved } = useKycStatus();
  const location = useLocation();

  // Wait for both session AND roles to load before any access decision,
  // otherwise users get redirected to /dashboard with an empty roles list.
  if (loading || (user && (rolesLoading || kycLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Force KYC completion and admin approval before allowing app access.
  // Admins bypass; /kyc, /settings, /auth remain reachable so users can act.
  const kycExempt =
    location.pathname.startsWith('/kyc') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/auth');
  if (!hasRole('admin') && !isApproved && !kycExempt) {
    return <Navigate to="/kyc" replace state={{ reason: kyc?.status ?? 'pending' }} />;
  }

  // Check if route is accessible based on role
  if (!canAccessRoute(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific required role
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Check if user has any of the allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    if (!hasAllowedRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
