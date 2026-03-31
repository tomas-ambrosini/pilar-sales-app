import React, { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export const ROLES = {
  ADMIN: 'System Admin',
  SALES: 'Sales Rep',
  DISPATCH: 'Call Center / Dispatch',
  SUBCONTRACTOR: 'Subcontractor / Crew'
};

export const RoleProvider = ({ children }) => {
  // Try to load from localStorage so it persists across refreshes
  const getInitialRole = () => {
    const savedRole = localStorage.getItem('pilar_simulated_role');
    return savedRole ? savedRole : ROLES.ADMIN;
  };

  const [activeRole, setActiveRole] = useState(getInitialRole);

  useEffect(() => {
    localStorage.setItem('pilar_simulated_role', activeRole);
  }, [activeRole]);

  return (
    <RoleContext.Provider value={{ activeRole, setActiveRole, ROLES }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  return useContext(RoleContext);
};
