import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const RoleContext = createContext();

export const ROLES = {
  ADMIN: 'ADMIN',
  SALES: 'SALES',
};

export const RoleProvider = ({ children }) => {
  // Try to load from localStorage so it persists across refreshes
  const { user } = useAuth();
  // Role mapping: if user lacks a role, fallback to SALES. If not logged in, null.
  const activeRole = user?.role || ROLES.SALES;

  return (
    <RoleContext.Provider value={{ activeRole, ROLES }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  return useContext(RoleContext);
};
