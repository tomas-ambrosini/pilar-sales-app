import React, { useState } from 'react';
import { CalendarFilterSidebar } from '../components/calendar/CalendarFilterSidebar';
import { CompanyCalendarEngine } from '../components/calendar/CompanyCalendarEngine';
import { useCompanyCalendarEvents } from '../hooks/useCompanyCalendarEvents';
import { mutateCalendarEvent } from '../lib/calendar/mutationSources';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import OpportunityOverviewModal from '../components/OpportunityOverviewModal';
import ServiceCallModal from '../components/ServiceCallModal';
// Import other modals here when needed (e.g. Task Modal, etc.)

export default function CompanyCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [filters, setFilters] = useState({
    department_id: 'ALL',
    // By default, let's select all event types we know about
    event_types: ['SALES_APPT', 'PROJECT_INSTALL', 'TASK_DEADLINE', 'FINANCE_EVENT', 'HR_ADMIN', 'SERVICE_DISPATCH']
  });

  // Target routing state
  const [inspectingOpportunityId, setInspectingOpportunityId] = useState(null);
  const [inspectingServiceCallId, setInspectingServiceCallId] = useState(null);

  const { events, loading, refetch } = useCompanyCalendarEvents(dateRange.start, dateRange.end, filters);

  const handleDateRangeChange = (startStr, endStr) => {
    setDateRange({ start: startStr, end: endStr });
  };

  const handleEventDrop = async ({ event, newStart, newEnd, revert }) => {
    // Only allow mutations on specific tables, or block if it's a read-only event
    if (event.source_table === 'proposals') {
      toast.error("Cannot reschedule finalized contracts via Drag & Drop.");
      revert();
      return;
    }

    const toastId = toast.loading(`Rescheduling ${event.title}...`);
    const success = await mutateCalendarEvent(event, newStart, newEnd, user?.id);
    
    if (success) {
      toast.success("Successfully rescheduled!", { id: toastId });
      refetch();
    } else {
      toast.error("Failed to reschedule event. Check permissions.", { id: toastId });
      revert();
    }
  };

  const handleEventClick = (eventData) => {
    console.log("Calendar Event Clicked:", eventData);
    
    // Routing switch based on the adapter's route_target
    switch (eventData.route_target) {
      case 'opportunity_overview':
        setInspectingOpportunityId(eventData.opportunity_id);
        break;
      case 'service_call_modal':
        setInspectingServiceCallId(eventData.source_id);
        break;
      case 'proposal_viewer':
        if (eventData.opportunity_id) {
            navigate(`/proposals?action=resume_opp&opp_id=${eventData.opportunity_id}`);
        } else {
            navigate('/proposals');
        }
        break;
      case 'dispatch_hub':
        navigate('/dispatch');
        break;
      case 'task_editor':
        navigate('/'); // Routes to dashboard for tasks right now
        break;
      default:
        console.log("No specific route target defined for:", eventData.route_target);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 relative">
      
      {/* Background Blobs for aesthetics */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary-100/30 blur-3xl"></div>
          <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-purple-100/30 blur-3xl"></div>
      </div>

      {/* Sidebar Filter Panel */}
      <CalendarFilterSidebar filters={filters} setFilters={setFilters} />

      {/* Main Calendar Engine Wrapper */}
      <div className="flex-1 p-4 md:p-8 flex flex-col min-w-0 z-10 relative">
        
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl m-4 md:m-8">
            <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        <CompanyCalendarEngine 
          events={events} 
          onEventClick={handleEventClick} 
          onDateRangeChange={handleDateRangeChange}
          onEventDrop={handleEventDrop}
        />

      </div>

      {/* Extraneous Modals Hookup */}
      {inspectingOpportunityId && (
        <OpportunityOverviewModal
          job={{ id: inspectingOpportunityId }} // Mock job object, the modal fetches real data
          isOpen={!!inspectingOpportunityId}
          onClose={() => setInspectingOpportunityId(null)}
          onUpdate={() => {}}
        />
      )}
      
      {inspectingServiceCallId && (
        <ServiceCallModal
          callId={inspectingServiceCallId}
          onClose={() => setInspectingServiceCallId(null)}
          onUpdate={refetch}
        />
      )}

    </div>
  );
}
