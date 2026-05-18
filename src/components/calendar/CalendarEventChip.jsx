import React from 'react';
import { Clock, AlertCircle, CheckCircle2, User, Zap, Lock } from 'lucide-react';

/**
 * CalendarEventChip
 * A highly scalable UI primitive for rendering events within the Unified Company Calendar.
 * Designed to support future advanced dispatch workflows (avatars, priority badges, overflow).
 */
export default function CalendarEventChip({ eventInfo }) {
  const { event } = eventInfo;
  const props = event.extendedProps;
  
  const isBlocking = props.is_blocking;
  const isUrgent = props.priority === 'URGENT' || props.priority === 'EMERGENCY';
  const hasAvatar = props.assigned_users && props.assigned_users.length > 0;

  // Render a compact or dense mode depending on the view type
  const isListMode = eventInfo.view.type.includes('list');

  if (isListMode) {
    return (
      <div className="flex items-center gap-2 w-full overflow-hidden">
        {isBlocking && <Lock size={12} className="text-slate-400 shrink-0" />}
        {isUrgent && <Zap size={12} className="text-amber-500 shrink-0" />}
        <span className="font-bold truncate">{event.title}</span>
        <span className="text-xs text-slate-500 ml-auto shrink-0">{props.status}</span>
      </div>
    );
  }

  // Standard Grid View Chip
  return (
    <div className="flex flex-col w-full overflow-hidden p-0.5">
      <div className="flex items-start justify-between gap-1 w-full">
        <span className="font-bold truncate leading-tight flex-1" style={{ fontSize: '10px' }}>
          {isBlocking && <Lock size={9} className="inline mr-1 opacity-70" />}
          {isUrgent && <Zap size={9} className="inline mr-1 text-yellow-300" />}
          {event.title}
        </span>
        
        {/* Future Avatar/Resource slot */}
        {hasAvatar && (
          <div className="shrink-0 w-3 h-3 bg-white/20 rounded-full flex items-center justify-center border border-white/40">
            <User size={8} className="opacity-80" />
          </div>
        )}
      </div>
      
      {/* Optional Sub-line for duration/status if enough height exists (week/day views) */}
      {!event.allDay && (
        <div className="text-[9px] opacity-80 truncate flex items-center gap-1 mt-0.5">
          <Clock size={8} /> 
          {eventInfo.timeText}
        </div>
      )}
    </div>
  );
}
