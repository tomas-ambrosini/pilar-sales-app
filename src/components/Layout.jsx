import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CommandMenu from './CommandMenu';
import { LayoutDashboard, Users, BookOpen, FileCheck, ClipboardList, Megaphone, DollarSign, Settings, Bell, LogOut, Search, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import './Layout.css';

const navGroups = [
  {
    title: 'Sales & CRM',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/customers', label: 'Customers', icon: Users },
      { path: '/catalog', label: 'Catalog', icon: BookOpen },
      { path: '/proposals', label: 'Proposals', icon: FileCheck },
      { path: '/sales-pipeline', label: 'Sales Pipeline', icon: ClipboardList }
    ]
  },
  {
    title: 'Marketing',
    items: [
      { path: '/marketing', label: 'Marketing', icon: Megaphone }
    ]
  },
  {
    title: 'Finance',
    items: [
      { path: '/finance', label: 'Finance', icon: DollarSign }
    ]
  },
  {
    title: 'Operations & IT',
    items: [
      { path: '/dispatch', label: 'Dispatch Hub', icon: Truck },
      { path: '/operations', label: 'Operations', icon: Settings }
    ]
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [activeModal, setActiveModal] = useState(null);
  const [isCommandMenuOpen, setCommandMenuOpen] = useState(false);

  const handleOpenModal = (title) => setActiveModal(title);
  const handleCloseModal = () => setActiveModal(null);

  return (
    <div className="layout">
      {/* Sidebar for Desktop/Tablet */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo" style={{ background: 'var(--color-primary-900)' }}>P</div>
          <span className="brand-text text-gradient">Pilar Home v12.0</span>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map((group, idx) => (
            <div key={idx} className="nav-group">
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="nav-icon" size={20} />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main-wrapper">
        {/* Top App Bar */}
        <header className="top-bar glass-panel">
          <div className="mobile-header">
            <div className="brand-logo" style={{ background: 'var(--color-primary-900)' }}>P</div>
            <span className="brand-text text-gradient">Pilar Home v12.0</span>
          </div>
          <div className="desktop-header-title">
            <span className="company-tag">Home Division</span>
          </div>
          <div className="top-bar-actions">
             <button
               className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm px-3 py-1.5 rounded-lg border border-slate-200 transition-colors mr-2 cursor-text"
               onClick={() => setCommandMenuOpen(true)}
               title="Search (Cmd+K)"
             >
               <Search size={16} />
               <span className="font-semibold px-2">Search...</span>
               <kbd className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-widest border border-slate-300 rounded px-1.5 py-0.5 bg-white">Cmd K</kbd>
             </button>
             
             <button className="icon-btn" aria-label="Notifications" onClick={() => handleOpenModal('Notifications')}>
               <Bell size={20} />
               <span className="badge"></span>
             </button>
             <button className="icon-btn avatar-btn" aria-label="User Profile" title={user?.name} onClick={() => handleOpenModal('Profile Settings')}>
               <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name?.charAt(0) || 'U'}</span>
             </button>
             <button className="icon-btn" aria-label="Logout" onClick={logout} style={{ color: 'var(--color-danger)' }} title="Logout">
               <LogOut size={20} />
             </button>
          </div>
        </header>

        <main className="main-content" style={{ overflowX: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              style={{ minHeight: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Nav for Mobile */}
      <nav className="bottom-nav glass-panel">
        {navGroups.flatMap(g => g.items).slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon-wrapper">
              <item.icon className="nav-icon" size={22} />
            </div>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Global Application Modals */}
      <Modal 
        isOpen={activeModal !== null} 
        onClose={handleCloseModal}
        title={activeModal}
      >
        <div className="modal-form" style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
            The <strong>{activeModal}</strong> feature is currently under active development.
          </p>
          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button className="btn-primary" onClick={handleCloseModal}>
              Got it
            </button>
          </div>
        </div>
      </Modal>
      <CommandMenu isOpen={isCommandMenuOpen} setIsOpen={setCommandMenuOpen} />
    </div>
  );
}
