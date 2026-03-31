import React, { useState } from 'react';
import { useRole, ROLES } from '../context/RoleContext';
import { ShieldAlert, ChevronDown, Check } from 'lucide-react';

export default function RoleSwitcher() {
  const { activeRole, setActiveRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg transition-colors mr-2 cursor-pointer shadow-sm"
      >
        <ShieldAlert size={14} className="text-indigo-500"/>
        <span className="text-xs font-bold whitespace-nowrap hidden sm:inline-block">Simulate Role:</span>
        <span className="text-xs font-black">{activeRole}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full right-2 mt-2 w-64 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-200 z-50 overflow-hidden text-left origin-top-right animate-in fade-in slide-in-from-top-2">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">View App As...</span>
            </div>
            <div className="p-1">
              {Object.values(ROLES).map(role => (
                <button
                  key={role}
                  onClick={() => {
                    setActiveRole(role);
                    setIsOpen(false);
                    // Force a reload to instantly clean state between simulated roles
                    window.location.href = '/dashboard';
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors ${
                    activeRole === role 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {role}
                  {activeRole === role && <Check size={16} className="text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
