import { useAuth } from "./useAuth";

type AppRole = 'agriculteur' | 'veterinaire' | 'acheteur' | 'investisseur' | 'admin';

interface RoleConfig {
  allowedRoutes: string[];
  navItems: string[];
  menuItems: string[];
  dashboardType: 'agriculteur' | 'veterinaire' | 'acheteur' | 'investisseur' | 'admin';
}

const roleConfigs: Record<AppRole, RoleConfig> = {
  agriculteur: {
    allowedRoutes: ['/dashboard', '/agriculteur', '/parcelles', '/cultures', '/betail', '/marketplace', '/marketplace/farmer', '/iot', '/devices', '/ia', '/farmer-investments', '/settings', '/voice', '/communaute', '/elearning', '/logistique', '/kyc'],
    navItems: ['/dashboard', '/agriculteur', '/cultures', '/betail', '/marketplace/farmer'],
    menuItems: ['/parcelles', '/farmer-investments', '/iot', '/devices', '/ia', '/voice', '/communaute', '/elearning', '/logistique', '/kyc', '/settings'],
    dashboardType: 'agriculteur',
  },
  veterinaire: {
    allowedRoutes: ['/dashboard', '/betail', '/marketplace', '/marketplace/buyer', '/veterinaire', '/settings', '/communaute', '/elearning', '/kyc'],
    navItems: ['/dashboard', '/veterinaire', '/betail', '/marketplace/buyer'],
    menuItems: ['/communaute', '/elearning', '/kyc', '/settings'],
    dashboardType: 'veterinaire',
  },
  acheteur: {
    allowedRoutes: ['/dashboard', '/marketplace', '/marketplace/buyer', '/acheteur', '/settings', '/communaute', '/elearning', '/logistique', '/kyc'],
    navItems: ['/dashboard', '/acheteur', '/marketplace/buyer'],
    menuItems: ['/communaute', '/elearning', '/logistique', '/kyc', '/settings'],
    dashboardType: 'acheteur',
  },
  investisseur: {
    allowedRoutes: ['/dashboard', '/marketplace', '/marketplace/investor', '/investisseur', '/settings', '/communaute', '/elearning', '/kyc'],
    navItems: ['/dashboard', '/investisseur', '/marketplace/investor'],
    menuItems: ['/communaute', '/elearning', '/kyc', '/settings'],
    dashboardType: 'investisseur',
  },
  admin: {
    allowedRoutes: ['/dashboard', '/agriculteur', '/parcelles', '/cultures', '/betail', '/marketplace', '/marketplace/farmer', '/marketplace/buyer', '/marketplace/investor', '/iot', '/devices', '/ia', '/admin', '/settings', '/farmer-investments', '/voice', '/communaute', '/elearning', '/logistique', '/investisseur', '/veterinaire', '/acheteur', '/kyc'],
    navItems: ['/dashboard', '/agriculteur', '/cultures', '/betail', '/marketplace'],
    menuItems: ['/parcelles', '/farmer-investments', '/iot', '/devices', '/ia', '/voice', '/communaute', '/elearning', '/logistique', '/admin', '/kyc', '/settings'],
    dashboardType: 'admin',
  },
};

export function useRoleAccess() {
  const { roles, hasRole } = useAuth();
  
  // Get the primary role (first role or default to agriculteur)
  const primaryRole: AppRole = (roles[0] as AppRole) || 'agriculteur';
  
  const config = roleConfigs[primaryRole] || roleConfigs.agriculteur;
  
  const canAccessRoute = (route: string): boolean => {
    // Admin can access everything
    if (hasRole('admin')) return true;
    
    // Check if any of user's roles allow access
    return roles.some(role => {
      const roleConfig = roleConfigs[role as AppRole];
      return roleConfig?.allowedRoutes.includes(route);
    });
  };
  
  const getNavItems = (): string[] => {
    // Combine nav items from all roles (unique)
    const allNavItems = new Set<string>();
    roles.forEach(role => {
      const roleConfig = roleConfigs[role as AppRole];
      roleConfig?.navItems.forEach(item => allNavItems.add(item));
    });
    return Array.from(allNavItems);
  };
  
  const getMenuItems = (): string[] => {
    const allMenuItems = new Set<string>();
    roles.forEach(role => {
      const roleConfig = roleConfigs[role as AppRole];
      roleConfig?.menuItems.forEach(item => allMenuItems.add(item));
    });
    return Array.from(allMenuItems);
  };
  
  const getDashboardType = () => config.dashboardType;
  
  const isAgriculteur = hasRole('agriculteur');
  const isVeterinaire = hasRole('veterinaire');
  const isAcheteur = hasRole('acheteur');
  const isInvestisseur = hasRole('investisseur');
  const isAdmin = hasRole('admin');
  
  return {
    primaryRole,
    roles,
    canAccessRoute,
    getNavItems,
    getMenuItems,
    getDashboardType,
    isAgriculteur,
    isVeterinaire,
    isAcheteur,
    isInvestisseur,
    isAdmin,
  };
}
