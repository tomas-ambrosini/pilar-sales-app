import React from 'react';
import { Clock, AlertCircle, CheckCircle2, User, Zap, Lock, DollarSign, FileText, BadgeAlert } from 'lucide-react';

/**
 * CalendarEventChip
 * A highly scalable UI primitive for rendering events within the Unified Company Calendar.
 * Designed to support future advanced dispatch workflows (avatars, priority badges, overflow).
 */
export default function CalendarEventChip({ eventInfo }) {
  const { event, timeText } = eventInfo;
  const props = event.extendedProps;
  
  const isBlocking = props.is_blocking;
  const isUrgent = props.priority === 'URGENT' || props.priority === 'EMERGENCY' || props.is_overdue;
  const hasAvatar = props.assigned_users && props.assigned_users.length > 0;
  const isFinancial = props.event_type === 'FINANCE_EVENT';

  // Render a compact or dense mode depending on the view type
  const isListMode = eventInfo.view.type.includes('list');

  if (isListMode) {
    return (
      <div className="flex items-center gap-2 w-full overflow-hidden">
        {isBlocking && <Lock size={12} className="text-slate-400 shrink-0" />}
        {isUrgent && <Zap size={12} className="text-amber-500 shrink-0" />}
        {isFinancial && <DollarSign size={12} className="text-emerald-500 shrink-0" />}
        <span className="font-bold truncate text-sm">{event.title} {props.customer_name ? `- ${props.customer_name}` : ''}</span>
        <span className="text-xs text-slate-500 ml-auto shrink-0 font-medium">{props.status}</span>
      </div>
    );
  }

  // Standard Grid View Chip
  return (
    <div className="group relative flex flex-col w-full h-full p-1 overflow-visible">
      {/* Interactive Tooltip Card - Shown on Hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[260px] bg-slate-900 rounded-xl shadow-2xl border border-slate-700/50 p-4 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-[100] transform origin-bottom flex flex-col gap-2">
         <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-white text-sm leading-tight">{event.title}</h4>
            {isUrgent && <BadgeAlert size={16} className="text-red-400 shrink-0 animate-pulse" />}
         </div>
         {timeText && (
           <div className="flex items-center gap-1.5 text-slate-300 text-xs font-medium">
             <Clock size={12} /> {timeText}
           </div>
         )}
         <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-slate-700">
            {props.customer_name && <span className="text-xs text-slate-400">Customer: <strong className="text-slate-200">{props.customer_name}</strong></span>}
            {props.location && <span className="text-xs text-slate-400">Loc: <strong className="text-slate-200">{props.location}</strong></span>}
            {props.status && <span className="text-xs text-slate-400">Status: <strong className="text-white">{props.status}</strong></span>}
         </div>
         {hasAvatar && (
            <div className="flex -space-x-1 mt-2">
              {props.assigned_users.map((u, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title={u.name}>
                   {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" /> : (u.name?.charAt(0) || 'U')}
                </div>
              ))}
            </div>
         )}
         {/* Tooltip Arrow */}
         <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-700/50 rotate-45"></div>
      </div>

      {/* Main Chip Visuals */}
      <div className="flex items-start justify-between gap-1 w-full h-full relative z-10">
        <span className="font-bold truncate leading-tight flex-1 tracking-tight" style={{ fontSize: '10px' }}>
          {isBlocking && <Lock size={9} className="inline mr-1 opacity-70" />}
          {isUrgent && (
            <span className="relative inline-flex h-2 w-2 mr-1.5 top-px">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
          {isFinancial && <DollarSign size={9} className="inline mr-1 opacity-90 text-yellow-200" />}
          {event.title}
        </span>
        
        {/* Avatars */}
        {hasAvatar && (
          <div className="shrink-0 w-3.5 h-3.5 bg-white/20 rounded-full flex items-center justify-center border border-white/40 overflow-hidden ml-1">
             {props.assigned_users[0].avatar_url ? (
               <img src={props.assigned_users[0].avatar_url} className="w-full h-full object-cover" />
             ) : (
               <User size={8} className="opacity-80" />
             )}
          </div>
        )}
      </div>
      
      {/* Optional Sub-line */}
      {!event.allDay && timeText && (
        <div className="text-[9.5px] opacity-90 truncate flex items-center gap-1 mt-0.5 font-medium tracking-tight">
          {timeText} {props.customer_name ? `- ${props.customer_name}` : ''}
        </div>
      )}
    </div>
  );
}
