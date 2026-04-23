import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import { Search, LayoutDashboard, Users, BookOpen, FileCheck, ClipboardList, Settings, LogOut, ArrowRight, UserCheck, DollarSign } from 'lucide-react';
import { useCustomers } from '../context/CustomerContext';
import { useProposals } from '../context/ProposalContext';
import { useRole, ROLES } from '../context/RoleContext';

const STATIC_COMMANDS = [
  { id: 'dash', name: 'Go to Home', icon: LayoutDashboard, route: '/', section: 'Navigation', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES] },
  { id: 'cust', name: 'View Customers', icon: Users, route: '/customers', section: 'Navigation', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES] },
  { id: 'addcust', name: 'Add New Customer', icon: Users, route: '/customers?action=new', section: 'Actions', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES] },
  { id: 'prop_list', name: 'View Proposals', icon: FileCheck, route: '/proposals', section: 'Navigation', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES] },
  { id: 'prop', name: 'Create New Proposal', icon: FileCheck, route: '/proposals?action=new', section: 'Actions', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES] },
  { id: 'cat', name: 'Equipment Catalog', icon: BookOpen, route: '/catalog', section: 'Navigation', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
  { id: 'finance_promos', name: 'Promo Campaigns', icon: DollarSign, route: '/finance?tab=promos', section: 'Finance', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
  { id: 'finance_margins', name: 'Global Margins & Taxes', icon: DollarSign, route: '/finance?tab=margins', section: 'Finance', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
  { id: 'finance_invoices', name: 'Deposits & Invoices', icon: DollarSign, route: '/finance?tab=invoices', section: 'Finance', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
  { id: 'template_settings', name: 'Template Settings', icon: Settings, route: '/template-settings', section: 'System', allowedRoles: [ROLES.ADMIN] },
  { id: 'settings', name: 'Account Management', icon: Settings, route: '/account-management', section: 'System', allowedRoles: [ROLES.ADMIN] },
  { id: 'pipe', name: 'Pipeline Ops', icon: ClipboardList, route: '/pipeline', section: 'Navigation', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
  { id: 'dispatch', name: 'Dispatch', icon: ClipboardList, route: '/dispatch', section: 'Navigation', allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
];

export default function CommandMenu({ isOpen, setIsOpen }) {
  const { customers } = useCustomers();
  const { proposals } = useProposals();
  const { activeRole } = useRole();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Clear search on open/close
  useEffect(() => {
     if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  const isSearching = searchQuery.trim().length > 0;
  const q = searchQuery.toLowerCase();

  const filteredStatic = STATIC_COMMANDS
     .filter(cmd => cmd.allowedRoles.includes(activeRole))
     .filter(cmd => !isSearching || cmd.name.toLowerCase().includes(q) || cmd.section.toLowerCase().includes(q));

  const filteredCustomers = isSearching 
    ? customers.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)).slice(0, 5)
    : [];

  const filteredProposals = isSearching
    ? proposals.filter(p => p.customer?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)).slice(0, 5)
    : [];

  // Global Keyboard Event Listener for Cmd+K and Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  const handleSelect = (command) => {
    if (command) {
      setIsOpen(false);
      navigate(command.route);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] p-4 pt-[10vh] flex justify-center items-start modal-layout-wrapper">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed -inset-10 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Spotlight Palette using CMDK */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-900/10 rounded-2xl overflow-hidden border border-slate-200 relative z-10 flex flex-col"
          >
            <Command 
               className="flex flex-col w-full h-full text-slate-800 bg-transparent rounded-2xl" 
               loop 
               shouldFilter={false}
               onKeyDown={(e) => {
                 if (e.key === 'Escape') setIsOpen(false);
               }}
            >
              <div className="flex items-center px-4 border-b border-slate-100 bg-white/50">
                <Search className="text-slate-400 mr-2 shrink-0" size={20} />
                <Command.Input 
                  className="w-full bg-transparent text-slate-800 text-lg py-4 border-none outline-none placeholder:text-slate-400 font-medium h-14" 
                  placeholder="What do you need? (e.g. Add Customer...)" 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <div className="hidden sm:flex text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase tracking-widest pointer-events-none shrink-0 ml-2">
                  ESC to close
                </div>
              </div>

              <Command.List className="max-h-[550px] overflow-y-auto overflow-x-hidden p-2 transition-all">
                <Command.Empty className="py-14 text-center text-sm">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-300 mb-4">
                     <Search size={24} />
                  </div>
                  <p className="text-slate-500 font-medium">No results found.</p>
                </Command.Empty>

                {filteredStatic.length > 0 && (
                  <Command.Group heading="Navigation & Actions" className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest">
                     {filteredStatic.map(cmd => (
                        <Command.Item
                           key={cmd.id}
                           value={cmd.id}
                           onSelect={() => handleSelect(cmd)}
                           className="flex items-center gap-3 px-3 py-3 text-sm rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-900 text-slate-700 hover:bg-slate-50 transition-colors my-0.5 font-semibold group"
                        >
                           <div className="p-1.5 rounded-md bg-slate-100/80 text-slate-500 group-data-[selected=true]:bg-primary-100 group-data-[selected=true]:text-primary-600 transition-colors">
                              <cmd.icon size={16} />
                           </div>
                           <div className="flex flex-col flex-1">
                              <span>{cmd.name}</span>
                           </div>
                        </Command.Item>
                     ))}
                  </Command.Group>
                )}

                {filteredCustomers.length > 0 && (
                  <>
                    <Command.Separator className="h-px bg-slate-100 mx-[-8px] my-2" />
                    <Command.Group heading="Customers" className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest">
                       {filteredCustomers.map(c => (
                          <Command.Item
                             key={`c_${c.id}`}
                             value={`c_${c.id}`}
                             onSelect={() => handleSelect({ route: `/customers/${c.id}` })}
                             className="flex items-center gap-3 px-3 py-3 text-sm rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-900 text-slate-700 hover:bg-slate-50 transition-colors my-0.5 font-semibold group"
                          >
                             <div className="p-1.5 rounded-md bg-slate-100/80 text-slate-500 group-data-[selected=true]:bg-primary-100 group-data-[selected=true]:text-primary-600 transition-colors">
                                <UserCheck size={16} />
                             </div>
                             <div className="flex flex-col flex-1">
                                <span>{c.name}</span>
                                <span className="text-[10px] font-medium text-slate-400">{c.email || c.phone || 'No contact info'}</span>
                             </div>
                          </Command.Item>
                       ))}
                    </Command.Group>
                  </>
                )}
                
                {filteredProposals.length > 0 && (
                  <>
                    <Command.Separator className="h-px bg-slate-100 mx-[-8px] my-2" />
                    <Command.Group heading="Proposals" className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest">
                       {filteredProposals.map(p => (
                          <Command.Item
                             key={`p_${p.id}`}
                             value={`p_${p.id}`}
                             onSelect={() => handleSelect({ route: `/proposals` })}
                             className="flex items-center gap-3 px-3 py-3 text-sm rounded-lg cursor-pointer data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-900 text-slate-700 hover:bg-slate-50 transition-colors my-0.5 font-semibold group"
                          >
                             <div className="p-1.5 rounded-md bg-slate-100/80 text-slate-500 group-data-[selected=true]:bg-primary-100 group-data-[selected=true]:text-primary-600 transition-colors">
                                <FileCheck size={16} />
                             </div>
                             <div className="flex flex-col flex-1">
                                <span>Quote for {p.customer}</span>
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">${p.amount} • {p.status}</span>
                             </div>
                          </Command.Item>
                       ))}
                    </Command.Group>
                  </>
                )}
              </Command.List>

              {/* Footer Toolbar */}
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-4 hidden sm:flex">
                  <span className="flex items-center gap-1"><kbd className="bg-white border text-slate-500 rounded px-1.5 py-0.5 shadow-sm font-mono text-[9px] font-bold">↑</kbd><kbd className="bg-white border text-slate-500 rounded px-1.5 py-0.5 shadow-sm font-mono text-[9px] font-bold">↓</kbd> to navigate</span>
                  <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1 text-slate-500 py-0.5 shadow-sm font-mono text-[9px] font-bold tracking-wider">ENTER</kbd> to select</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   Pilar Home Command Palette
                </div>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
