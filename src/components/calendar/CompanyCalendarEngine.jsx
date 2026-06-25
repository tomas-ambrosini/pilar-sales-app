import React, { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import CalendarEventChip from './CalendarEventChip';

export function CompanyCalendarEngine({ events, onEventClick, onDateRangeChange, onEventDrop }) {
  const calendarRef = useRef(null);

  // Map our internal normalized event schema to FullCalendar's expected format
  const fcEvents = React.useMemo(() => {
    return events.map(ev => {
      // Map Tailwind color keys to actual hex codes for FullCalendar
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
        extendedProps: {
          ...ev // Keep our entire internal schema available in extendedProps
        }
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
    // Pass our internal event schema back to the parent
    if (onEventClick) {
      onEventClick(info.event.extendedProps);
    }
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
    if (onDateRangeChange) {
      onDateRangeChange(dateInfo.startStr, dateInfo.endStr);
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden fc-pilar-theme">
      {/* 
        We inject some global CSS specifically for the calendar wrapper 
        to ensure FullCalendar adopts the Pilar design aesthetic.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        .fc-pilar-theme .fc-theme-standard td, .fc-pilar-theme .fc-theme-standard th {
          border-color: #f1f5f9;
        }
        .fc-pilar-theme .fc-col-header-cell {
          padding: 12px 0;
          background: #f8fafc;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: 800;
        }
        .fc-pilar-theme .fc-daygrid-day-number {
          font-weight: 700;
          color: #334155;
          padding: 8px;
        }
        .fc-pilar-theme .fc-day-today {
          background-color: #f0fdf4 !important;
        }
        .fc-pilar-theme .fc-event {
          border-radius: 6px;
          padding: 2px 4px;
          font-size: 11px;
          font-weight: 700;
          border: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .fc-pilar-theme .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .fc-pilar-theme .fc-toolbar-title {
          font-weight: 900;
          font-size: 1.5rem;
          color: #0f172a;
          letter-spacing: -0.025em;
        }
        .fc-pilar-theme .fc-button-primary {
          background-color: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          box-shadow: none !important;
        }
        .fc-pilar-theme .fc-button-primary:not(:disabled):active,
        .fc-pilar-theme .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #0f172a;
          border-color: #0f172a;
          color: white;
        }
        @media (max-width: 768px) {
          .fc-pilar-theme .fc-header-toolbar {
            flex-direction: column;
            gap: 12px;
          }
          .fc-pilar-theme .fc-toolbar-title {
            font-size: 1.25rem;
          }
          .fc-pilar-theme .fc-button {
            padding: 4px 8px;
            font-size: 10px;
          }
        }
      `}} />
      <div className="p-4 md:p-6 h-full flex flex-col [&_.fc]:h-full">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
          }}
          editable={true}
          eventDrop={handleEventDropOrResize}
          eventResize={handleEventDropOrResize}
          events={fcEvents}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventContent={(eventInfo) => <CalendarEventChip eventInfo={eventInfo} />}
          height="100%"
          dayMaxEvents={3}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
        />
      </div>
    </div>
  );
}
