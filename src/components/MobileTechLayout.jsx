import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map as MapIcon, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import MessagesDrawer from './MessagesDrawer';
import ProfileSettingsModal from './ProfileSettingsModal';
import { AnimatePresence } from 'framer-motion';

export default function MobileTechLayout() {
  const { user } = useAuth();
  const { isSubcontractor } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMessagesOpen, setMessagesOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    const handleOpenChat = () => setMessagesOpen(true);
    document.addEventListener('open-chat', handleOpenChat);
    return () => document.removeEventListener('open-chat', handleOpenChat);
  }, []);

  // Bottom Navigation Items
  const navItems = [
    { id: 'home', path: '/', icon: Home, label: 'Home' },
    { id: 'route', path: '/my-day', icon: MapIcon, label: 'Route' }
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-[env(safe-area-inset-bottom)] flex flex-col h-screen overflow-hidden text-slate-800 font-sans">
      
      {/* Premium Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-40 sticky top-0 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-black shadow-inner">
            P
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Pilar Home</h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              {isSubcontractor() ? 'Subcontractor Portal' : 'Technician Portal'}
            </p>
          </div>
        </div>
        <div 
          className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center font-bold text-primary-700 cursor-pointer overflow-hidden"
          onClick={() => setProfileOpen(true)}
        >
          {user?.email?.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* Main Content Area (Scrollable) */}
      <main className="flex-1 overflow-y-auto w-full relative z-0 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 pb-[env(safe-area-inset-bottom)] z-50">
        <div className="flex items-center justify-around h-16 px-2">
          
          {/* Static Routes */}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive(item.path) ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-all ${
                isActive(item.path) ? 'bg-primary-100' : 'bg-transparent'
              }`}>
                <item.icon size={22} className={isActive(item.path) ? 'text-primary-700' : ''} strokeWidth={isActive(item.path) ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${isActive(item.path) ? 'text-primary-700' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}

          {/* Messages Drawer Trigger */}
          <button
            onClick={() => setMessagesOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <div className="relative flex items-center justify-center w-12 h-8 rounded-full bg-transparent">
              <MessageCircle size={22} strokeWidth={2} />
              {hasUnreadMessages && (
                <span className="absolute top-0 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-semibold">Chat</span>
          </button>

          {/* Profile Modal Trigger */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <div className="relative flex items-center justify-center w-12 h-8 rounded-full bg-transparent">
              <User size={22} strokeWidth={2} />
            </div>
            <span className="text-[10px] mt-1 font-semibold">Profile</span>
          </button>

        </div>
      </nav>

      {/* Modals & Drawers */}
      <MessagesDrawer 
        isOpen={isMessagesOpen} 
        onClose={() => setMessagesOpen(false)} 
        onUnreadStatusChange={setHasUnreadMessages}
        isDocked={false} // Force overlay mode for mobile
        onToggleDock={() => {}} // Disabled on mobile
        onMinimize={() => setMessagesOpen(false)}
      />

      <AnimatePresence>
        {isProfileOpen && (
          <ProfileSettingsModal onClose={() => setProfileOpen(false)} />
        )}
      </AnimatePresence>

    </div>
  );
}
