import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const RoleContext = createContext();

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
};

export const RoleProvider = ({ children }) => {
  // Try to load from localStorage so it persists across refreshes
  const { user } = useAuth();
  
  // Legacy mapping: handle any cached SUPER_ADMIN values from prior migration
  let mappedRole = user?.role || ROLES.SALES;
  if (mappedRole === 'SUPER_ADMIN') mappedRole = ROLES.ADMIN;

  const activeRole = mappedRole;

  return (
    <RoleContext.Provider value={{ activeRole, ROLES }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  return useContext(RoleContext);
};
