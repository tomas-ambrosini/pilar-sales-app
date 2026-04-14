import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, ShieldAlert, LogOut, LayoutDashboard, Users, BookOpen, FileCheck, ClipboardList, Megaphone, DollarSign, Settings, Bell, Search, Truck, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useRole, ROLES } from '../context/RoleContext';
import Modal from './Modal';
import CommandMenu from './CommandMenu';
import MessagesDrawer from './MessagesDrawer';
import ProfileSettingsModal from './ProfileSettingsModal';
import NotificationsPanel from './NotificationsPanel';
import { useNotifications } from '../context/NotificationsContext';
import './Layout.css';

const navGroups = [
  {
    title: 'CRM MVP',
    allowedRoles: [ROLES.ADMIN, ROLES.SALES],
    items: [
      { path: '/', label: 'Home', icon: LayoutDashboard, allowedRoles: [ROLES.ADMIN, ROLES.SALES] },
      { path: '/customers', label: 'Customers', icon: Users, allowedRoles: [ROLES.ADMIN, ROLES.SALES] },
      { path: '/proposals', label: 'Proposals', icon: FileCheck, allowedRoles: [ROLES.ADMIN, ROLES.SALES] },
      { path: '/catalog', label: 'Catalog', icon: BookOpen, allowedRoles: [ROLES.ADMIN] },
      { path: '/promo-codes', label: 'Promo Codes', icon: Megaphone, allowedRoles: [ROLES.ADMIN] },
      { path: '/account-management', label: 'Account Mgmt', icon: Settings, allowedRoles: [ROLES.ADMIN] }
    ]
  },
  {
    title: 'Operations ERP (Legacy)',
    allowedRoles: [ROLES.ADMIN],
    items: [
      { path: '/pipeline', label: 'Pipeline Ops (ON HOLD)', icon: ClipboardList, allowedRoles: [ROLES.ADMIN] },
      { path: '/dispatch', label: 'Dispatch (ON HOLD)', icon: Truck, allowedRoles: [ROLES.ADMIN] }
    ]
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { activeRole } = useRole();
  const location = useLocation();
  const notificationsContext = useNotifications();
  const NotificationsUnreadCount = notificationsContext?.unreadCount || 0;
  const [activeModal, setActiveModal] = useState(null);
  const [isCommandMenuOpen, setCommandMenuOpen] = useState(false);
  const [isMessagesOpen, setMessagesOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [forceChannelId, setForceChannelId] = useState(null);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pilar-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });

  const isMessagesOpenRef = useRef(isMessagesOpen);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pilar-sidebar-collapsed', isSidebarCollapsed);
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    isMessagesOpenRef.current = isMessagesOpen;
  }, [isMessagesOpen]);

  useEffect(() => {
    if (!user) return;
    
    // Request Native OS Notification permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Clear notification when drawer opens
    if (isMessagesOpenRef.current) {
      setHasUnreadMessages(false);
    }

    const channelListener = supabase.channel(`global_tracker_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            
            const isMentioned = Boolean(user.full_name) && payload.new.body.toLowerCase().includes(`@${user.full_name.replace(/\s+/g, '').toLowerCase()}`);
            const currentDrawerState = isMessagesOpenRef.current;

            if (!currentDrawerState || isMentioned) {
               const title = isMentioned ? '🔔 You were Mentioned' : 'New Pilar Message';
               
               if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                 new Notification(title, { body: payload.new.body });
               }

               // In-app Toast popup
               toast((t) => (
                 <div 
                   onClick={() => {
                     setForceChannelId(payload.new.channel_id);
                     setMessagesOpen(true);
                     toast.dismiss(t.id);
                   }}
                   style={{ cursor: 'pointer' }}
                 >
                   <div style={{fontWeight: 'bold', marginBottom: '4px', color: isMentioned ? '#fcd34d' : '#38bdf8'}}>
                     {title}
                   </div>
                   <div style={{fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px'}}>
                     {payload.new.body}
                   </div>
                 </div>
               ),
                 {
                   duration: isMentioned ? 6000 : 4000,
                   position: 'top-center',
                   style: { 
                     borderLeft: isMentioned ? '4px solid #fcd34d' : '4px solid #38bdf8',
                     background: '#1e293b',
                     color: 'white',
                     padding: '12px 16px'
                   }
                 }
               );
            }

            if (!currentDrawerState) {
              setHasUnreadMessages(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelListener);
    };
  }, [user]);

  const handleOpenModal = (title) => setActiveModal(title);
  const handleCloseModal = () => setActiveModal(null);

  return (
    <div className="layout">
      {/* Sidebar for Desktop/Tablet */}
      <aside className={`sidebar flex flex-col ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo shadow-sm" style={{ background: 'var(--color-primary-900)' }}>P</div>
          <span className="brand-text text-gradient">Pilar Home</span>
        </div>
        <nav className="sidebar-nav">
          {navGroups
            .filter(group => group.allowedRoles.includes(activeRole))
            .map((group, idx) => {
              const visibleItems = group.items.filter(item => item.allowedRoles.includes(activeRole));
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="nav-group">
                  <div className="nav-group-title">{group.title}</div>
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => `nav-link group ${isActive ? 'active' : ''}`}
                    >
                      <item.icon className="nav-icon shrink-0" size={24} />
                      <span className="nav-label">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              );
          })}
        </nav>

        {/* Sidebar Toggle Button */}
        <div className="mt-auto p-4 border-t border-white/5">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center gap-3 p-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        {/* Top App Bar */}
        <header className="top-bar">
          <div className="mobile-header">
            <div className="brand-logo" style={{ background: 'var(--color-primary-900)' }}>P</div>
            <span className="brand-text text-gradient">Pilar Home</span>
          </div>
          <div className="desktop-header-title flex items-center gap-4">
            <span className="company-tag hidden md:inline-flex">Home Division</span>
            {/* RoleSwitcher Removed per Master Plan */}
          </div>
          <div className="top-bar-actions">
             <button
               className="hidden lg:flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-500 text-sm px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all mr-2 cursor-text"
               onClick={() => setCommandMenuOpen(true)}
               title="Search (Cmd+K)"
             >
               <Search size={16} />
               <span className="font-semibold px-2">Search...</span>
               <kbd className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-widest border border-slate-300 rounded px-1.5 py-0.5 bg-white">Cmd K</kbd>
             </button>
             
             <button className="icon-btn relative" aria-label="Messages" onClick={() => setMessagesOpen(true)}>
               <MessageCircle size={20} />
               {hasUnreadMessages && (
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
               )}
             </button>

             <div className="relative">
               <button className="icon-btn relative" aria-label="Notifications" onClick={() => setNotificationsOpen(!isNotificationsOpen)}>
                 <Bell size={20} />
                 {NotificationsUnreadCount > 0 && (
                   <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                 )}
               </button>
               <NotificationsPanel 
                 isOpen={isNotificationsOpen} 
                 onClose={() => setNotificationsOpen(false)} 
                 onOpenChat={(channelId) => {
                   setForceChannelId(channelId);
                   setMessagesOpen(true);
                   setNotificationsOpen(false);
                 }}
               />
             </div>

             <button className="icon-btn avatar-btn p-0 overflow-hidden border border-slate-200" aria-label="User Profile" title={user?.full_name || user?.name || user?.email} onClick={() => handleOpenModal('Profile Settings')}>
               {user?.avatar_url ? (
                 <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}</span>
               )}
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
        {navGroups
          .flatMap(g => g.items)
          .filter(item => item.allowedRoles.includes(activeRole))
          .slice(0, 5)
          .map((item) => (
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
      <AnimatePresence>
        {activeModal && activeModal !== 'Profile Settings' && (
          <Modal title={activeModal} onClose={handleCloseModal}>
            <div className="p-4 text-slate-500">
              <p>Content for {activeModal} goes here.</p>
            </div>
          </Modal>
        )}
        {activeModal === 'Profile Settings' && (
          <ProfileSettingsModal onClose={handleCloseModal} />
        )}
      </AnimatePresence>
      <CommandMenu isOpen={isCommandMenuOpen} setIsOpen={setCommandMenuOpen} />
      <MessagesDrawer 
        isOpen={isMessagesOpen} 
        onClose={() => setMessagesOpen(false)} 
        forceChannel={forceChannelId}
        onClearForceChannel={() => setForceChannelId(null)}
        onUnreadStatusChange={setHasUnreadMessages}
      />
    </div>
  );
}
