import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Subcontractors from './pages/Subcontractors';
import MaintenanceWizard from './pages/MaintenanceWizard';
import TemplateDashboard from './pages/TemplateDashboard';
import FinancialSettings from './pages/FinancialSettings';
import FinanceDashboard from './pages/FinanceDashboard';
import Sales from './pages/Sales';
import DispatchHub from './pages/DispatchHub';
import Tasks from './pages/Tasks';
import CompanyCalendar from './pages/CompanyCalendar';
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
import { supabase } from './supabaseClient';

import Unauthorized from './pages/Unauthorized';

const RoleRoute = ({ children, allowedRoles, allowedDepartments }) => {
  const { user } = useAuth();
  const { activeRole, activeDepartment, ROLES } = useRole();
  
  if (!user) return <Navigate to="/" replace />;
  
  if (activeRole === ROLES.SUPER_ADMIN) return children;
  
  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedDepartments && !allowedDepartments.includes(activeDepartment)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

const ProposalsRedirect = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('tab', 'proposals');
  return <Navigate to={`/sales?${params.toString()}`} replace />;
};

function MainRouter() {
  const { user } = useAuth();

  const localSetupComplete = localStorage.getItem(`setup_complete_${user?.id}`) === 'true';

  if (user?.must_change_password && !localSetupComplete) {
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

      
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route path="/" element={<Layout />}>
          {/* SALES DOMAINS */}
          <Route path="customers/*" element={<RoleRoute><Customers /></RoleRoute>} />
          <Route path="tasks/*" element={<RoleRoute><Tasks /></RoleRoute>} />
          <Route path="calendar/*" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'MANAGER', 'COORDINATOR']}><CompanyCalendar /></RoleRoute>} />
          <Route path="my-day" element={<RoleRoute allowedRoles={['FIELD_WORKER', 'SUPER_ADMIN']}><TechnicianMyDay /></RoleRoute>} />
          
          {/* MANAGER DOMAINS */}
          <Route path="catalog/*" element={<RoleRoute><Catalog /></RoleRoute>} />
          <Route path="sales/*" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'MANAGER', 'COORDINATOR']} allowedDepartments={['SALES', 'EXECUTIVE', 'INSIDE_SALES']}><Sales /></RoleRoute>} />
          <Route path="dispatch" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'MANAGER', 'COORDINATOR']} allowedDepartments={['DISPATCH', 'SERVICE', 'INSTALL', 'SALES', 'INSIDE_SALES', 'EXECUTIVE']}><DispatchHub /></RoleRoute>} />

          {/* SUPER ADMIN EXCLUSIVE DOMAINS */}
          <Route path="camp-points" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR']}><CampPointsTracker /></RoleRoute>} />
          <Route path="analytics" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR']} allowedDepartments={['EXECUTIVE', 'FINANCE']}><ExecutiveAnalytics /></RoleRoute>} />
          <Route path="account-management/*" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'MANAGER']}><AccountManagement /></RoleRoute>} />
          <Route path="subcontractors" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'MANAGER']} allowedDepartments={['ADMINISTRATION', 'INSTALL']}><Subcontractors /></RoleRoute>} />
          <Route path="template-settings/*" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR']} allowedDepartments={['ADMINISTRATION', 'MARKETING']}><TemplateDashboard /></RoleRoute>} />
          <Route path="finance/*" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'MANAGER']} allowedDepartments={['FINANCE', 'EXECUTIVE']}><FinanceDashboard /></RoleRoute>} />
          
          {/* WILDCARDS / DEFAULTS */}
          <Route path="maintenance-wizard" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'DIRECTOR', 'MANAGER', 'COORDINATOR']} allowedDepartments={['DISPATCH', 'SERVICE', 'SALES']}><MaintenanceWizard /></RoleRoute>} />
          <Route path="proposals/*" element={<ProposalsRedirect />} />
          <Route path="unauthorized" element={<Unauthorized />} />
          <Route index element={<RoleRoute><Dashboard /></RoleRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}

import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';

const AuthenticatedProviders = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) return children;

  return (
    <CustomerProvider>
      <CatalogProvider>
        <ProposalProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </ProposalProvider>
      </CatalogProvider>
    </CustomerProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RoleProvider>
          <BrowserRouter>
            <AuthenticatedProviders>
              <MainRouter />
            </AuthenticatedProviders>
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
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
