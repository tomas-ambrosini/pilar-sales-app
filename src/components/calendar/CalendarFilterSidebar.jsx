import React, { useState, useEffect } from 'react';
import { Filter, Users, LayoutGrid, Calendar as CalendarIcon, MapPin, Briefcase, FileText, Banknote, ShieldAlert, Zap } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export function CalendarFilterSidebar({ filters, setFilters, departments, eventTypes }) {
  const toggleEventType = (code) => {
    setFilters(prev => {
      const current = prev.event_types || [];
      if (current.includes(code)) {
        return { ...prev, event_types: current.filter(c => c !== code) };
      } else {
        return { ...prev, event_types: [...current, code] };
      }
    });
  };

  const setDepartmentFilter = (deptId) => {
    setFilters(prev => ({ ...prev, department_id: deptId }));
  };

  const getIconForType = (iconString) => {
    switch (iconString) {
      case 'Briefcase': return <Briefcase size={14} />;
      case 'MapPin': return <MapPin size={14} />;
      case 'FileText': return <FileText size={14} />;
      case 'Banknote': return <Banknote size={14} />;
      case 'ShieldAlert': return <ShieldAlert size={14} />;
      case 'Zap': return <Zap size={14} />;
      default: return <CalendarIcon size={14} />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-1">
          <CalendarIcon size={20} className="text-primary-500" strokeWidth={2.5} />
          Master View
        </h2>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Global Aggregation</p>
      </div>

      {/* Department Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <LayoutGrid size={14} /> Departments
          </h3>
        </div>
        <div className="flex flex-row flex-wrap md:flex-col gap-2 md:gap-1.5">
          <button 
            onClick={() => setDepartmentFilter('ALL')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${(!filters.department_id || filters.department_id === 'ALL') ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <div className={`w-2 h-2 rounded-full ${(!filters.department_id || filters.department_id === 'ALL') ? 'bg-slate-400' : 'bg-slate-300'}`}></div>
            Company (All)
          </button>
          
          {departments.map(dept => (
            <button 
              key={dept.id}
              onClick={() => setDepartmentFilter(dept.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${filters.department_id === dept.id ? `bg-${dept.color_theme}-100 text-${dept.color_theme}-800 shadow-sm border border-${dept.color_theme}-200` : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
            >
              <div className={`w-2 h-2 rounded-full bg-${dept.color_theme}-500`}></div>
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-200/60 w-full"></div>

      {/* Event Types Filter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Filter size={14} /> Event Types
          </h3>
        </div>
        <div className="flex flex-row flex-wrap md:flex-col gap-2 md:gap-1.5">
          {eventTypes.map(type => {
            const isActive = filters.event_types?.includes(type.code);
            return (
              <button 
                key={type.id}
                onClick={() => toggleEventType(type.code)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all border ${isActive ? `bg-white shadow-sm border-slate-200 text-slate-800` : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`text-${type.default_color}-500 flex items-center justify-center p-1 rounded-md ${isActive ? `bg-${type.default_color}-50` : ''}`}>
                     {getIconForType(type.icon)}
                  </div>
                  {type.name}
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isActive ? 'bg-primary-500 border-primary-500' : 'border-slate-300 bg-white'}`}>
                  {isActive && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 4.5L3.5 6.5L8.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
