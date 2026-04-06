import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, Users, BookOpen, FileCheck, ClipboardList, Settings, LogOut, ArrowRight, UserCheck } from 'lucide-react';
import { useCustomers } from '../context/CustomerContext';
import { useProposals } from '../context/ProposalContext';

const STATIC_COMMANDS = [
  { id: 'dash', name: 'Go to Dashboard', icon: LayoutDashboard, route: '/dashboard', section: 'Navigation' },
  { id: 'pipe', name: 'Open Sales Pipeline', icon: ClipboardList, route: '/sales-pipeline', section: 'Navigation' },
  { id: 'cust', name: 'View Customers', icon: Users, route: '/customers', section: 'Navigation' },
  { id: 'cat', name: 'Equipment Catalog', icon: BookOpen, route: '/catalog', section: 'Navigation' },
  { id: 'prop', name: 'Create New Proposal', icon: FileCheck, route: '/proposals?action=new', section: 'Actions' },
  { id: 'addcust', name: 'Add New Customer', icon: Users, route: '/customers?action=new', section: 'Actions' },
  { id: 'settings', name: 'Operations & Settings', icon: Settings, route: '/operations', section: 'System' },
];

export default function CommandMenu({ isOpen, setIsOpen }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const { customers } = useCustomers();
  const { proposals } = useProposals();
  const navigate = useNavigate();

  // Keyboard Event Listeners for Cmd+K and Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle Menu
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const getDynamicResults = () => {
    if (!query) return STATIC_COMMANDS;
    
    const q = query.toLowerCase();
    const staticMatches = STATIC_COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(q));
    
    const customerMatches = customers
      .filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
      .map(c => ({
         id: `c_${c.id}`,
         name: `${c.name}`,
         icon: UserCheck,
         route: '/customers',
         section: 'Customers'
      }))
      .slice(0, 3); // Max 3 static customers

    const proposalMatches = proposals
      .filter(p => p.customer?.toLowerCase().includes(q) || p.status?.toLowerCase().includes(q))
      .map(p => ({
         id: `p_${p.id}`,
         name: `Quote for ${p.customer} ($${p.amount})`,
         icon: FileCheck,
         route: '/proposals',
         section: 'Proposals'
      }))
      .slice(0, 3);

    return [...staticMatches, ...customerMatches, ...proposalMatches];
  };

  const filteredCommands = getDynamicResults();

  // Up/Down Navigation inside Menu
  useEffect(() => {
    const handleNavigation = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredCommands.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(filteredCommands[activeIndex]);
      }
    };
    document.addEventListener('keydown', handleNavigation);
    return () => document.removeEventListener('keydown', handleNavigation);
  }, [isOpen, activeIndex, filteredCommands]);

  const handleSelect = (command) => {
    if (command) {
      setIsOpen(false);
      navigate(command.route);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] p-4 pt-[10vh] flex justify-center">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Spotlight Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 relative z-10 flex flex-col max-h-[70vh]"
          >
            {/* Search Input Area */}
            <div className="flex items-center px-4 border-b border-slate-100">
              <Search className="text-slate-400 mr-3" size={24} />
              <input
                ref={inputRef}
                className="w-full bg-transparent text-slate-800 text-lg py-5 outline-none placeholder:text-slate-300 font-medium"
                placeholder="Where to? (e.g. Add Customer...)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
              />
              <div className="hidden sm:flex text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase tracking-widest pointer-events-none">
                ESC to close
              </div>
            </div>

            {/* Scrollable Results List */}
            <div className="overflow-y-auto p-2 flex-grow">
              {filteredCommands.length > 0 ? (
                <div className="py-2">
                  <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Suggested Actions
                  </div>
                  {filteredCommands.map((cmd, idx) => {
                     const isSelected = activeIndex === idx;
                     return (
                       <button
                         key={cmd.id}
                         onClick={() => handleSelect(cmd)}
                         onMouseEnter={() => setActiveIndex(idx)}
                         className={`w-full text-left flex items-center px-4 py-3 rounded-xl transition-colors ${
                           isSelected ? 'bg-primary-50 text-primary-900' : 'text-slate-600 hover:bg-slate-50'
                         }`}
                       >
                         <div className={`p-2 rounded-lg mr-4 ${isSelected ? 'bg-primary-100/50 text-primary-600' : 'bg-slate-100/50 text-slate-400'}`}>
                           <cmd.icon size={18} />
                         </div>
                         <div className="flex-1 flex flex-col items-start gap-0.5">
                           <span className="font-semibold block">{cmd.name}</span>
                           <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{cmd.section}</span>
                         </div>
                         {isSelected && <ArrowRight size={16} className="text-primary-500" />}
                       </button>
                     );
                  })}
                </div>
              ) : (
                <div className="py-12 px-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-300 mb-4">
                     <Search size={24} />
                  </div>
                  <p className="text-slate-500 font-medium">No results found for "{query}"</p>
                  <p className="text-slate-400 text-sm mt-1">Try searching for generic actions like "Lead" or "Catalog"</p>
                </div>
              )}
            </div>
            
            {/* Footer Toolbar */}
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400 flex items-center gap-4">
              <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1 shadow-sm font-mono text-[10px]">↑</kbd><kbd className="bg-white border rounded px-1 shadow-sm font-mono text-[10px]">↓</kbd> to navigate</span>
              <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1 shadow-sm font-mono text-[10px]">↵</kbd> to select</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
