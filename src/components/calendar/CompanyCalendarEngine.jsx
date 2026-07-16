import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import CalendarEventChip from './CalendarEventChip';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, List } from 'lucide-react';

export function CompanyCalendarEngine({ events, onEventClick, onDateRangeChange, onEventDrop }) {
  const calendarRef = useRef(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentTitle, setCurrentTitle] = useState('');

  const fcEvents = React.useMemo(() => {
    return (events || []).map(ev => {
      const colorMap = {
        blue: '#3b82f6',
        emerald: '#10b981',
        amber: '#f59e0b',
        purple: '#8b5cf6',
        red: '#ef4444',
        cyan: '#06b6d4',
        fuchsia: '#d946ef',
        slate: '#64748b'
      };

      const baseEvent = {
        id: ev.id,
        title: ev.title,
        backgroundColor: colorMap[ev.color_key] || colorMap.slate,
        borderColor: colorMap[ev.color_key] || colorMap.slate,
        extendedProps: { ...ev }
      };

      if (ev.metadata?.recurrence_rule) {
        return {
          ...baseEvent,
          rrule: ev.metadata.recurrence_rule,
          duration: ev.end_date ? (new Date(ev.end_date) - new Date(ev.start_date)) : undefined
        };
      }

      return {
        ...baseEvent,
        start: ev.start_date,
        end: ev.end_date || ev.start_date
      };
    });
  }, [events]);

  const handleEventClick = (info) => {
    if (onEventClick) onEventClick(info.event.extendedProps);
  };

  const handleEventDropOrResize = (info) => {
    if (onEventDrop) {
      onEventDrop({
        event: info.event.extendedProps,
        newStart: info.event.startStr,
        newEnd: info.event.endStr,
        revert: info.revert
      });
    }
  };

  const handleDatesSet = (dateInfo) => {
    setCurrentTitle(dateInfo.view.title);
    if (onDateRangeChange) {
      onDateRangeChange(dateInfo.startStr, dateInfo.endStr);
    }
  };

  const changeView = (viewName) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(viewName);
      setCurrentView(viewName);
    }
  };

  const navigateCal = (action) => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      if (action === 'prev') api.prev();
      if (action === 'next') api.next();
      if (action === 'today') api.today();
    }
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden fc-pilar-theme">
      {/* Custom Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-white z-10 shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button onClick={() => navigateCal('prev')} className="p-1.5 text-slate-600 hover:bg-white rounded-md hover:shadow-sm transition-all"><ChevronLeft size={18} /></button>
            <button onClick={() => navigateCal('today')} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-white rounded-md hover:shadow-sm transition-all">Today</button>
            <button onClick={() => navigateCal('next')} className="p-1.5 text-slate-600 hover:bg-white rounded-md hover:shadow-sm transition-all"><ChevronRight size={18} /></button>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{currentTitle}</h2>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
          <button onClick={() => changeView('dayGridMonth')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'dayGridMonth' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarIcon size={14}/> Month</button>
          <button onClick={() => changeView('timeGridWeek')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'timeGridWeek' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Clock size={14}/> Week</button>
          <button onClick={() => changeView('listWeek')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${currentView === 'listWeek' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><List size={14}/> List</button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .fc-pilar-theme .fc-header-toolbar { display: none !important; }
        .fc-pilar-theme .fc-theme-standard td, .fc-pilar-theme .fc-theme-standard th { border-color: #f1f5f9; }
        .fc-pilar-theme .fc-col-header-cell { padding: 12px 0; background: #f8fafc; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #64748b; font-weight: 800; }
        .fc-pilar-theme .fc-daygrid-day-number { font-weight: 700; color: #334155; padding: 8px; }
        .fc-pilar-theme .fc-day-today { background-color: #f0fdf4 !important; }
        .fc-pilar-theme .fc-event { border-radius: 6px; padding: 2px 4px; font-size: 11px; font-weight: 700; border: none; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; overflow: hidden; }
        .fc-pilar-theme .fc-event:hover { transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .fc-pilar-theme .fc-view-harness { flex-grow: 1; }
      `}} />
      <div className="flex-1 w-full min-h-0 relative p-4 [&_.fc]:h-full">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          editable={true}
          eventDrop={handleEventDropOrResize}
          eventResize={handleEventDropOrResize}
          events={fcEvents}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventContent={(eventInfo) => <CalendarEventChip eventInfo={eventInfo} />}
          height="100%"
          dayMaxEvents={3}
          eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
        />
      </div>
    </div>
  );
}
