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
import { RoleProvider } from './context/RoleContext';

function ProtectedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers/*" element={<Customers />} />
        <Route path="catalog/*" element={<Catalog />} />
        <Route path="proposals/*" element={<Proposals />} />
        <Route path="sales-pipeline/*" element={<SalesPipeline />} />
        <Route path="dispatch/*" element={<DispatchHub />} />
        <Route path="marketing/*" element={<Marketing />} />
        <Route path="finance/*" element={<Finance />} />
        <Route path="operations/*" element={<Operations />} />
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
