import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const RoleContext = createContext();

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
  DISPATCHER: 'DISPATCHER',
  TECHNICIAN: 'TECHNICIAN',
  SUBCONTRACTOR: 'SUBCONTRACTOR'
};

export const DEPARTMENTS = {
  ADMINISTRATION: 'ADMINISTRATION',
  FINANCE: 'FINANCE',
  SALES: 'SALES',
  SERVICE: 'SERVICE',
  INSTALL: 'INSTALL'
};

export const RoleProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Map user role (fallback to SALES if none provided for legacy users)
  let mappedRole = user?.role || ROLES.SALES;
  if (mappedRole === 'SUPER_ADMIN') mappedRole = ROLES.ADMIN;
  
  const activeRole = mappedRole;
  const activeDepartment = user?.department || DEPARTMENTS.SALES;

  // Access Control Helpers
  const canViewFinancials = () => {
    return !(activeRole === ROLES.TECHNICIAN || activeRole === ROLES.SUBCONTRACTOR);
  };

  const isSubcontractor = () => activeRole === ROLES.SUBCONTRACTOR;
  const isTechnician = () => activeRole === ROLES.TECHNICIAN;
  
  const canEditSystemSettings = () => activeRole === ROLES.ADMIN;

  const value = {
    activeRole,
    activeDepartment,
    ROLES,
    DEPARTMENTS,
    canViewFinancials,
    isSubcontractor,
    isTechnician,
    canEditSystemSettings
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  return useContext(RoleContext);
};
