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
import TemplateDashboard from './pages/TemplateDashboard';
import FinancialSettings from './pages/FinancialSettings';
import FinanceDashboard from './pages/FinanceDashboard';
import Sales from './pages/Sales';
import DispatchHub from './pages/DispatchHub';
import Tasks from './pages/Tasks';
import CompanyCalendar from './pages/CompanyCalendar';
import ServiceHub from './pages/ServiceHub';
import TechnicianMyDay from './pages/TechnicianMyDay';
import CustomerTracker from './pages/CustomerTracker';
import ExecutiveAnalytics from './pages/ExecutiveAnalytics';
import CampPointsTracker from './pages/CampPointsTracker';
import WebsiteLayout from './pages/website-mock/WebsiteLayout';
import HomeMock from './pages/website-mock/Home';
import ServicesMock from './pages/website-mock/Services';
import IndustriesMock from './pages/website-mock/Industries';
import AboutMock from './pages/website-mock/About';
import FAQsMock from './pages/website-mock/FAQs';
import ContactMock from './pages/website-mock/Contact';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerProvider } from './context/CustomerContext';
import { CatalogProvider } from './context/CatalogContext';
import { ProposalProvider } from './context/ProposalContext';
import { RoleProvider, useRole, ROLES } from './context/RoleContext';
import { NotificationsProvider } from './context/NotificationsContext';

const TomasOnlyRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || (!user.email?.toLowerCase().includes('tomas') && !user.email?.toLowerCase().includes('admin'))) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const { activeRole } = useRole();
  
  if (!user) return <Navigate to="/" replace />;
  
  const roleCode = activeRole;
  
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
      <Route path="/tracker/:id" element={<CustomerTracker />} />
      <Route path="/website-mock" element={<WebsiteLayout />}>
        <Route index element={<HomeMock />} />
        <Route path="services" element={<ServicesMock />} />
        <Route path="industries" element={<IndustriesMock />} />
        <Route path="faqs" element={<FAQsMock />} />
        <Route path="about" element={<AboutMock />} />
        <Route path="contact" element={<ContactMock />} />
      </Route>
      <Route path="/camp-points" element={
        <TomasOnlyRoute>
          <CampPointsTracker />
        </TomasOnlyRoute>
      } />
      
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route path="/" element={<Layout />}>
          {/* SALES DOMAINS */}
          <Route path="customers/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'DISPATCHER']}><Customers /></RoleRoute>} />
          <Route path="tasks/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'DISPATCHER']}><Tasks /></RoleRoute>} />
          <Route path="calendar/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'DISPATCHER']}><CompanyCalendar /></RoleRoute>} />
          <Route path="service/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'DISPATCHER']}><ServiceHub /></RoleRoute>} />
          <Route path="my-day" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'DISPATCHER']}><TechnicianMyDay /></RoleRoute>} />
          
          {/* MANAGER DOMAINS */}
          <Route path="catalog/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']}><Catalog /></RoleRoute>} />
          <Route path="sales/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'DISPATCHER']}><Sales /></RoleRoute>} />
          <Route path="dispatch" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'DISPATCHER']}><DispatchHub /></RoleRoute>} />

          {/* SUPER ADMIN EXCLUSIVE DOMAINS */}
          <Route path="analytics" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']}><ExecutiveAnalytics /></RoleRoute>} />
          <Route path="account-management/*" element={<RoleRoute allowedRoles={['ADMIN']}><AccountManagement /></RoleRoute>} />
          <Route path="template-settings/*" element={<RoleRoute allowedRoles={['ADMIN']}><TemplateDashboard /></RoleRoute>} />
          <Route path="finance/*" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']}><FinanceDashboard /></RoleRoute>} />
          
          {/* WILDCARDS / DEFAULTS */}
          <Route index element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'DISPATCHER']}><Dashboard /></RoleRoute>} />
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
