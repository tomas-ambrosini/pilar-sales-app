import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const RoleContext = createContext();

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DIRECTOR: 'DIRECTOR',
  MANAGER: 'MANAGER',
  COORDINATOR: 'COORDINATOR',
  FIELD_WORKER: 'FIELD_WORKER',
  
  // Legacy mappings for safe transition
  ADMIN: 'SUPER_ADMIN',
  SALES: 'COORDINATOR',
  DISPATCHER: 'COORDINATOR',
  TECHNICIAN: 'FIELD_WORKER',
  SUBCONTRACTOR: 'FIELD_WORKER'
};

export const DEPARTMENTS = {
  EXECUTIVE: 'EXECUTIVE',
  ADMINISTRATION: 'ADMINISTRATION',
  FINANCE: 'FINANCE',
  SALES: 'SALES',
  INSIDE_SALES: 'INSIDE_SALES',
  DISPATCH: 'DISPATCH',
  SERVICE: 'SERVICE',
  INSTALL: 'INSTALL',
  SUBCONTRACTOR: 'SUBCONTRACTOR'
};

export const RoleProvider = ({ children }) => {
  const { user } = useAuth();
  
  let mappedRole = typeof user?.role === 'string' ? user.role.trim().toUpperCase() : (user?.role || ROLES.FIELD_WORKER);
  
  // Safe mapping for legacy roles in DB
  if (mappedRole === 'ADMIN') mappedRole = ROLES.SUPER_ADMIN;
  if (mappedRole === 'SALES' || mappedRole === 'DISPATCHER') mappedRole = ROLES.MANAGER; // Elevated for early startup phase
  if (mappedRole === 'TECHNICIAN' || mappedRole === 'SUBCONTRACTOR') mappedRole = ROLES.FIELD_WORKER;

  const activeRole = mappedRole;
  const activeDepartment = typeof user?.department === 'string' ? user.department.trim().toUpperCase() : (user?.department || DEPARTMENTS.SERVICE);

  // Access Control Helpers
  const canEditSystemSettings = () => activeRole === ROLES.SUPER_ADMIN;
  
  const canViewFinancials = () => {
    return activeRole === ROLES.SUPER_ADMIN || 
           activeDepartment === DEPARTMENTS.FINANCE || 
           activeDepartment === DEPARTMENTS.EXECUTIVE ||
           activeRole === ROLES.DIRECTOR;
  };

  const isFieldWorker = () => activeRole === ROLES.FIELD_WORKER;
  const isManagerOrAbove = () => [ROLES.SUPER_ADMIN, ROLES.DIRECTOR, ROLES.MANAGER].includes(activeRole);
  const isDirectorOrAbove = () => [ROLES.SUPER_ADMIN, ROLES.DIRECTOR].includes(activeRole);
  
  const canEditPricing = () => {
      return activeRole === ROLES.SUPER_ADMIN || 
             (activeRole === ROLES.DIRECTOR && [DEPARTMENTS.FINANCE, DEPARTMENTS.SALES].includes(activeDepartment));
  };
  
  const canApproveProposals = () => {
      return activeRole === ROLES.SUPER_ADMIN || isManagerOrAbove();
  };
  
  // Legacy helpers for gradual refactor
  const isSubcontractor = () => activeDepartment === DEPARTMENTS.SUBCONTRACTOR || user?.role === 'SUBCONTRACTOR';
  const isTechnician = () => activeDepartment === DEPARTMENTS.SERVICE && isFieldWorker();

  const value = useMemo(() => ({
    activeRole,
    activeDepartment,
    ROLES,
    DEPARTMENTS,
    canViewFinancials,
    isFieldWorker,
    isManagerOrAbove,
    isDirectorOrAbove,
    canEditSystemSettings,
    canEditPricing,
    canApproveProposals,
    isSubcontractor,
    isTechnician
  }), [activeRole, activeDepartment]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
