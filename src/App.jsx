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
import Messages from './pages/Messages';
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
        <Route path="messages/*" element={<Messages />} />
        <Route path="marketing/*" element={<Marketing />} />
        <Route path="finance/*" element={<Finance />} />
        <Route path="operations/*" element={<Operations />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CustomerProvider>
        <CatalogProvider>
          <ProposalProvider>
            <RoleProvider>
              <BrowserRouter>
                <ProtectedRoutes />
              </BrowserRouter>
            </RoleProvider>
          </ProposalProvider>
        </CatalogProvider>
      </CustomerProvider>
    </AuthProvider>
  );
}

export default App;
