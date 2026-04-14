import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const RoleContext = createContext();

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
};

export const RoleProvider = ({ children }) => {
  // Try to load from localStorage so it persists across refreshes
  const { user } = useAuth();
  
  // Legacy role mapping handler incase cached credentials still hold ADMIN
  let mappedRole = user?.role || ROLES.SALES;
  if (mappedRole === 'ADMIN') mappedRole = ROLES.SUPER_ADMIN;

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
