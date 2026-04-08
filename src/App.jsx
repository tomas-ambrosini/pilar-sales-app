import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Catalog from './pages/CatalogEditor';
import Proposals from './pages/Proposals';
import Marketing from './pages/Marketing';
import Finance from './pages/Finance';
import Operations from './pages/Operations';
import SalesPipeline from './pages/SalesPipeline';
import DispatchHub from './pages/DispatchHub';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerProvider } from './context/CustomerContext';
import { CatalogProvider } from './context/CatalogContext';
import { ProposalProvider } from './context/ProposalContext';
import { RoleProvider, useRole, ROLES } from './context/RoleContext';

import FieldTech from './pages/FieldTech';

const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const { activeRole } = useRole();
  
  if (!user) return <Navigate to="/" replace />;
  
  // Map simulated long role to route code
  const roleCode = 
      activeRole === ROLES.ADMIN ? 'ADMIN' :
      activeRole === ROLES.DISPATCH ? 'DISPATCH' :
      activeRole === ROLES.SUBCONTRACTOR ? 'SUBCONTRACTOR' :
      'SALES';
  
  if (!allowedRoles.includes(roleCode)) {
    // Hard rejection fallback matrices dictated by Master Plan Section 8
    if (roleCode === 'ADMIN') return <Navigate to="/dashboard" replace />;
    if (roleCode === 'SALES') return <Navigate to="/sales-pipeline" replace />;
    if (roleCode === 'DISPATCH') return <Navigate to="/dispatch" replace />;
    if (roleCode === 'SUBCONTRACTOR') return <Navigate to="/tech" replace />;
    if (roleCode === 'CUSTOMER') return <Navigate to="/portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function ProtectedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* SUBCONTRACTOR SHARED DOMAIN */}
        <Route path="tech/*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH', 'SUBCONTRACTOR']}><FieldTech /></RoleRoute>} />
        
        {/* SALES & OPS DOMAINS */}
        <Route path="dashboard" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH', 'SALES']}><Dashboard /></RoleRoute>} />
        <Route path="customers/*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH', 'SALES']}><Customers /></RoleRoute>} />
        <Route path="proposals/*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH', 'SALES']}><Proposals /></RoleRoute>} />
        <Route path="sales-pipeline/*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH', 'SALES']}><SalesPipeline /></RoleRoute>} />
        
        {/* HIGH CLEARANCE OPS */}
        <Route path="dispatch/*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH']}><DispatchHub /></RoleRoute>} />
        <Route path="dispatch-hub/*" element={<Navigate to="/dispatch" replace />} />
        <Route path="operations/*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH']}><Operations /></RoleRoute>} />
        <Route path="finance/*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH']}><Finance /></RoleRoute>} />
        
        {/* GLOBAL EXECUTIVE ADMIN */}
        <Route path="catalog/*" element={<RoleRoute allowedRoles={['ADMIN']}><Catalog /></RoleRoute>} />
        <Route path="marketing/*" element={<RoleRoute allowedRoles={['ADMIN']}><Marketing /></RoleRoute>} />
        
        {/* WILDCARDS / DEFAULTS */}
        <Route index element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH', 'SALES']}><Navigate to="/dashboard" replace /></RoleRoute>} />
        <Route path="*" element={<RoleRoute allowedRoles={['ADMIN', 'DISPATCH', 'SALES']}><Navigate to="/dashboard" replace /></RoleRoute>} />
      </Route>
    </Routes>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <CatalogProvider>
          <ProposalProvider>
              <RoleProvider>
              <BrowserRouter>
                <ProtectedRoutes />
                <Toaster 
                  position="top-right" 
                  toastOptions={{
                    duration: 5000,
                    style: {
                      background: '#334155',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)'
                    }
                  }} 
                />
              </BrowserRouter>
              </RoleProvider>
          </ProposalProvider>
        </CatalogProvider>
      </CustomerProvider>
    </AuthProvider>
  );
}

export default App;
