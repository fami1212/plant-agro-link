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
    allowedRoutes: ['/dashboard', '/parcelles', '/cultures', '/betail', '/marketplace', '/iot'],
    navItems: ['/dashboard', '/parcelles', '/cultures', '/betail', '/marketplace'],
    menuItems: ['/iot', '/settings'],
    dashboardType: 'agriculteur',
  },
  veterinaire: {
    allowedRoutes: ['/dashboard', '/betail', '/marketplace'],
    navItems: ['/dashboard', '/betail', '/marketplace'],
    menuItems: ['/settings'],
    dashboardType: 'veterinaire',
  },
  acheteur: {
    allowedRoutes: ['/dashboard', '/marketplace'],
    navItems: ['/dashboard', '/marketplace'],
    menuItems: ['/settings'],
    dashboardType: 'acheteur',
  },
  investisseur: {
    allowedRoutes: ['/dashboard', '/marketplace', '/investisseur', '/settings'],
    navItems: ['/dashboard', '/investisseur', '/marketplace'],
    menuItems: ['/settings'],
    dashboardType: 'investisseur',
  },
  admin: {
    allowedRoutes: ['/dashboard', '/parcelles', '/cultures', '/betail', '/marketplace', '/iot', '/admin', '/settings'],
    navItems: ['/dashboard', '/parcelles', '/cultures', '/betail', '/marketplace'],
    menuItems: ['/iot', '/admin', '/settings'],
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
