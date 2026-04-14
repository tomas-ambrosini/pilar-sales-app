import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Customers from './pages/Customers';
import Catalog from './pages/CatalogEditor';
import Proposals from './pages/Proposals';
import PublicQuoteView from './pages/PublicQuoteView';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import FirstSetup from './pages/FirstSetup';
import PromoCodes from './pages/PromoCodes';
import AccountManagement from './pages/AccountManagement';
import TemplateSettings from './pages/TemplateSettings';
import SalesPipeline from './pages/SalesPipeline';
import DispatchHub from './pages/DispatchHub';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerProvider } from './context/CustomerContext';
import { CatalogProvider } from './context/CatalogContext';
import { ProposalProvider } from './context/ProposalContext';
import { RoleProvider, useRole, ROLES } from './context/RoleContext';
import { NotificationsProvider } from './context/NotificationsContext';

const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const { activeRole } = useRole();
  
  if (!user) return <Navigate to="/" replace />;
  
  // Map simulated long role to route code
  const roleCode = 
      activeRole === ROLES.ADMIN ? 'ADMIN' :
      activeRole === ROLES.MANAGER ? 'MANAGER' :
      'SALES';
  
  if (!allowedRoles.includes(roleCode)) {
    // Hard rejection fallback matrices 
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function MainRouter() {
  const { user } = useAuth();

  if (user?.must_change_password) {
    return (
      <Routes>
        <Route path="*" element={<FirstSetup />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/quote/:id" element={<PublicQuoteView />} />
      
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route path="/" element={<Layout />}>
          {/* SALES DOMAINS */}
          <Route path="customers/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}><Customers /></RoleRoute>} />
          <Route path="proposals/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}><Proposals /></RoleRoute>} />
          
          {/* MANAGER DOMAINS */}
          <Route path="catalog/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']}><Catalog /></RoleRoute>} />
          <Route path="promo-codes/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']}><PromoCodes /></RoleRoute>} />
          <Route path="pipeline/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']}><SalesPipeline /></RoleRoute>} />
          <Route path="dispatch/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']}><DispatchHub /></RoleRoute>} />

          {/* SUPER ADMIN EXCLUSIVE DOMAINS */}
          <Route path="account-management/*" element={<RoleRoute allowedRoles={['ADMIN']}><AccountManagement /></RoleRoute>} />
          <Route path="template-settings/*" element={<RoleRoute allowedRoles={['ADMIN']}><TemplateSettings /></RoleRoute>} />
          
          {/* WILDCARDS / DEFAULTS */}
          <Route index element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES']}><Dashboard /></RoleRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
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
                <NotificationsProvider>
                  <BrowserRouter>
                    <MainRouter />
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
                </NotificationsProvider>
              </RoleProvider>
          </ProposalProvider>
        </CatalogProvider>
      </CustomerProvider>
    </AuthProvider>
  );
}

export default App;
