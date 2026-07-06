import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, User, ChevronLeft, ChevronRight, MapPin, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatQuoteId } from '../utils/formatters';
import { PIPELINE_STATES, PipelineController } from '../utils/pipelineControls';
import { useProposals } from '../context/ProposalContext';
import toast from 'react-hot-toast';
import OpportunityOverviewModal from '../components/OpportunityOverviewModal';
import ServiceCallModal from '../components/ServiceCallModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getToday = () => {
   const d = new Date();
   d.setHours(0,0,0,0);
   return d;
};

const TIME_BLOCKS = Array.from({ length: 24 }).map((_, i) => {
    const hour = i;
    const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
    const value = `${hour.toString().padStart(2, '0')}:00`;
    return { label, value, hour };
});

export default function DispatchCalendar({ isSubView = false }) {
   const { user } = useAuth();
   const { proposals } = useProposals();
   const [crews, setCrews] = useState([]);
   const [loading, setLoading] = useState(true);
   const [baseDate, setBaseDate] = useState(getToday());
   const [viewMode, setViewMode] = useState('day'); // 'week' | 'day'
   const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'working', 'morning', 'afternoon', 'after_hours'
   const [unassignedQueue, setUnassignedQueue] = useState([]);
   const [scheduledJobs, setScheduledJobs] = useState([]);
   const [inspectingJob, setInspectingJob] = useState(null);
   const dateInputRef = useRef(null);
   const navigate = useNavigate();

   useEffect(() => {
      fetchData();
      const oppChannel = supabase.channel('realtime_cal_opps')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => fetchData())
        .subscribe();
      
      const svcChannel = supabase.channel('realtime_cal_svc')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, () => fetchData())
        .subscribe();

      return () => {
         supabase.removeChannel(oppChannel);
         supabase.removeChannel(svcChannel);
      };
   }, [baseDate]);

   const fetchData = async () => {
      try {
         const { data: crewsData } = await supabase.from('crews').select('*').eq('is_active', true).order('crew_name');
         if (crewsData) setCrews(crewsData);

         // Fetch Opportunities (Sales)
         const { data: opps } = await supabase.from('opportunities').select(`
             id, created_at, status, urgency_level, scheduled_date, scheduled_time_block, assigned_crew_id, issue_description, household_id, proposal_data,
             households ( household_name, contacts ( primary_phone, email ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
         `).in('status', [PIPELINE_STATES.NEEDS_SCHEDULING, PIPELINE_STATES.SCHEDULED, PIPELINE_STATES.COMPLETED]).eq('is_active', true);

         // Fetch Service Calls (Service)
         const { data: svc } = await supabase.from('service_calls').select(`
             id, created_at, status, urgency, call_type, tags, issue_description, customer_id, assigned_techs, scheduled_start, scheduled_end,
             households ( household_name, contacts ( primary_phone, email ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
         `).in('status', ['Pending', 'Scheduled', 'Dispatched', 'In Progress', 'Completed']);

         const normalizedOpps = (opps || []).map(o => {
             let targetAddress = null;
             if (o.households?.addresses && o.households.addresses.length > 0) {
                 if (o.service_address_id) targetAddress = o.households.addresses.find(a => a.id === o.service_address_id);
                 if (!targetAddress) targetAddress = o.households.addresses.find(a => a.is_primary_residence) || o.households.addresses[0];
                 o.households.addresses = [targetAddress]; // simplify for downstream components
             }
             return { ...o, __type: 'SALES' };
         });
         const normalizedSvc = (svc || []).map(s => {
             const propertyTag = s.tags?.find(t => typeof t === 'string' && t.startsWith('PROPERTY:'));
             const propertyId = propertyTag ? propertyTag.replace('PROPERTY:', '') : null;
             let targetAddress = null;
             if (s.households?.addresses && s.households.addresses.length > 0) {
                 if (propertyId) targetAddress = s.households.addresses.find(a => a.id === propertyId);
                 if (!targetAddress) targetAddress = s.households.addresses.find(a => a.is_primary_residence) || s.households.addresses[0];
                 s.households.addresses = [targetAddress]; // simplify for downstream components
             }
             let timeBlock = null;
             let localDateStr = null;
             if (s.scheduled_start) {
                 const d = new Date(s.scheduled_start);
                 const startHour = d.getHours();
                 const block = TIME_BLOCKS.find(b => b.hour === startHour);
                 timeBlock = block ? block.value : '08:00';
                 // Get YYYY-MM-DD in local time
                 localDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
             }
             let techs = s.assigned_techs;
             if (typeof techs === 'string') {
                 try { 
                     techs = JSON.parse(techs); 
                 } catch (e) { 
                     const match = techs.match(/([a-f0-9-]{36})/gi);
                     techs = match || []; 
                 }
             }
             let parsedTags = s.tags;
             if (typeof parsedTags === 'string') {
                 try { parsedTags = JSON.parse(parsedTags); }
                 catch(e) {
                     const m = parsedTags.match(/^{?(.*?)}?$/);
                     if (m && m[1]) {
                         parsedTags = m[1].split(',').map(s => {
                             let clean = s.trim();
                             if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
                             return clean;
                         }).filter(Boolean);
                     } else {
                         parsedTags = [];
                     }
                 }
             }

             return {
                 __type: 'SERVICE',
                 id: s.id,
                 created_at: s.created_at,
                 status: s.status,
                 urgency_level: s.urgency,
                 call_type: s.call_type,
                 tags: Array.isArray(parsedTags) ? parsedTags : [],
                 issue_description: s.issue_description,
                 household_id: s.customer_id,
                 households: s.households,
                 assigned_crew_id: techs && techs.length > 0 ? techs[0] : null,
                 scheduled_date: localDateStr,
                 scheduled_time_block: timeBlock,
                 scheduled_start: s.scheduled_start,
                 scheduled_end: s.scheduled_end
             };
         });

         const allJobs = [...normalizedOpps, ...normalizedSvc];

         setUnassignedQueue(allJobs.filter(j => !j.assigned_crew_id));
         setScheduledJobs(allJobs.filter(j => !!j.assigned_crew_id));

      } catch (e) {
         toast.error("Failed to load calendar data.");
      } finally {
         setLoading(false);
      }
   };

   const handleDragEnd = async (result) => {
      if (!result.destination) return;
      const { source, destination, draggableId } = result;
      if (source.droppableId === destination.droppableId) return; // No reordering supported yet inside same cell

      const targetJob = [...unassignedQueue, ...scheduledJobs].find(j => j.id === draggableId);
      if (!targetJob) return;

      const isService = targetJob.__type === 'SERVICE';

      let newStatus = isService ? 'Scheduled' : PIPELINE_STATES.SCHEDULED;
      let newCrewId = null;
      let newDateStr = null;
      let newTimeBlock = null;
      
      let svcStartTime = null;
      let svcEndTime = null;

      if (destination.droppableId === 'unassigned') {
         // Moved back to queue
         newStatus = isService ? 'Pending' : PIPELINE_STATES.NEEDS_SCHEDULING;
      } else {
         // Moved to Calendar Cell
         const parts = destination.droppableId.split('::');
         if (parts.length === 3) {
             newCrewId = parts[0];
             newDateStr = parts[1];
             newTimeBlock = parts[2] !== 'ANY' ? parts[2] : '08:00';
             
             if (isService) {
                 const [hourStr] = newTimeBlock.split(':');
                 const startH = parseInt(hourStr, 10);
                 const endH = startH + 2; // Default 2 hr duration
                 
                 // Parse as local time then convert to ISO for DB
                 svcStartTime = new Date(`${newDateStr}T${hourStr.padStart(2, '0')}:00:00`).toISOString();
                 svcEndTime = new Date(`${newDateStr}T${endH.toString().padStart(2, '0')}:00:00`).toISOString();
             }
         }
      }

      // Optimistic UI
      const optimisticJob = {
          ...targetJob,
          status: newStatus,
          assigned_crew_id: newCrewId,
          scheduled_date: newDateStr,
          scheduled_time_block: newTimeBlock,
          ...(isService && { scheduled_start: svcStartTime, scheduled_end: svcEndTime })
      };

      if (destination.droppableId === 'unassigned') {
         setUnassignedQueue(prev => {
            const filtered = prev.filter(j => j.id !== draggableId);
            return [...filtered, optimisticJob];
         });
         setScheduledJobs(prev => prev.filter(j => j.id !== draggableId));
      } else {
         setScheduledJobs(prev => {
            const filtered = prev.filter(j => j.id !== draggableId);
            return [...filtered, optimisticJob];
         });
         setUnassignedQueue(prev => prev.filter(j => j.id !== draggableId));
      }

      // DB Push
      try {
          if (!isService) {
              // SALES LOGIC
              if (newStatus === PIPELINE_STATES.SCHEDULED) {
                  await supabase.from('opportunities').update({
                      assigned_crew_id: newCrewId,
                      scheduled_date: newDateStr,
                      scheduled_time_block: newTimeBlock
                  }).eq('id', draggableId);
                  if (targetJob.status !== PIPELINE_STATES.SCHEDULED) {
                      await PipelineController.scheduleDeal(draggableId, targetJob.status);
                  }
              } else {
                  await supabase.from('opportunities').update({
                      assigned_crew_id: null,
                      scheduled_date: null,
                      scheduled_time_block: null
                  }).eq('id', draggableId);
                  if (targetJob.status !== PIPELINE_STATES.NEEDS_SCHEDULING) {
                      await PipelineController.approveDeal(draggableId, targetJob.status); // Approving deal moves it to Needs Scheduling
                  }
              }
          } else {
              // SERVICE LOGIC
              const currentTags = targetJob.tags || [];
              const updatedTags = [...currentTags.filter(t => !t.startsWith('SCHEDULED_BY:')), `SCHEDULED_BY:${user?.full_name || 'System'}`];

              if (newStatus === 'Scheduled') {
                  const { error } = await supabase.from('service_calls').update({
                      status: 'Scheduled',
                      assigned_techs: [newCrewId],
                      scheduled_start: svcStartTime,
                      scheduled_end: svcEndTime,
                      tags: updatedTags
                  }).eq('id', draggableId);
                  if (error) throw error;
              } else {
                  const { error } = await supabase.from('service_calls').update({
                      status: 'Pending',
                      assigned_techs: [],
                      scheduled_start: null,
                      scheduled_end: null,
                      arrival_window_start: null,
                      arrival_window_end: null
                  }).eq('id', draggableId);
                  if (error) throw error;
              }
          }
      } catch (err) {
          toast.error(err.message);
          fetchData(); // Revert
      }
   };

   // Generators
   const days = Array.from({length: 7}).map((_, i) => {
      const d = new Date(baseDate);
      if (viewMode === 'week') {
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          d.setDate(diff + i);
      } else {
          d.setDate(d.getDate() + i);
      }
      // Use local timezone instead of UTC offset shift which can cause off-by-one errors
      const isoStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      return { obj: d, isoStr };
   });

   const shiftDate = (days) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      setBaseDate(d);
   };

   const getFilteredTimeBlocks = () => {
       switch (timeFilter) {
           case 'working': return TIME_BLOCKS.filter(b => b.hour >= 7 && b.hour <= 18);
           case 'morning': return TIME_BLOCKS.filter(b => b.hour >= 6 && b.hour <= 12);
           case 'afternoon': return TIME_BLOCKS.filter(b => b.hour >= 12 && b.hour <= 18);
           case 'after_hours': return TIME_BLOCKS.filter(b => b.hour < 7 || b.hour > 18);
           case 'all': default: return TIME_BLOCKS;
       }
   };
   const currentBlocks = viewMode === 'day' ? getFilteredTimeBlocks() : TIME_BLOCKS;

   const JobCard = ({ job, index }) => {
      const isService = job.__type === 'SERVICE';
      const associatedProposal = proposals?.find(p => p.proposal_data?.associated_opportunity_id === job.id || p.associated_opportunity_id === job.id);
      
      let displayId = formatQuoteId(job);
      if (isService) {
          displayId = `SVC-${job.id.substring(0, 4).toUpperCase()}`;
      } else {
          if (associatedProposal) {
              const propId = formatQuoteId(associatedProposal);
              displayId = propId.startsWith('P') ? `WO-${propId.substring(1)}` : `WO-${propId}`;
          } else if (displayId.startsWith('LEAD-')) {
              displayId = displayId.replace('LEAD-', 'WO-');
          }
      }

      const clientName = (job.households?.household_name || 'Unknown Client').replace(/ Account$/i, '').trim();
      const initials = clientName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

      let systemSummary = job.opportunity_type || 'General Service';
      let tagColor = 'bg-slate-100 text-slate-600 border-slate-200';
      
      if (isService) {
          systemSummary = job.call_type || 'Service Call';
          tagColor = 'bg-purple-50 text-purple-700 border-purple-200';
      } else {
          if (associatedProposal?.proposal_data?.systemTiers && associatedProposal.proposal_data.systemTiers.length > 0) {
              const numSystems = associatedProposal.proposal_data.systemTiers.length;
              systemSummary = `${numSystems} System Install`;
              tagColor = 'bg-blue-50 text-blue-700 border-blue-200';
          } else if (associatedProposal?.proposal_data?.accepted_tier_data) {
              const tData = associatedProposal.proposal_data.accepted_tier_data;
              systemSummary = `${tData.brand || 'Equipment'} Install ${tData.tons ? `(${tData.tons}T)` : ''}`.trim();
              tagColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          }
      }

      const addressObj = Array.isArray(job.households?.addresses) ? job.households.addresses[0] : job.households?.addresses;
      const city = addressObj?.city || 'No City';

      return (
      <Draggable draggableId={job.id} index={index}>
         {(provided, snapshot) => (
            <div
               ref={provided.innerRef}
               {...provided.draggableProps}
               {...provided.dragHandleProps}
               onClick={() => setInspectingJob(job)}
               className={`w-full min-w-0 p-3.5 shrink-0 rounded-[16px] flex flex-col transition-all duration-300 group select-none cursor-pointer overflow-hidden bg-white
                  ${snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-primary-400 scale-[1.02]' : 'hover:shadow-lg hover:-translate-y-0.5 hover:ring-slate-300 shadow-sm ring-1 ring-slate-200/60'}
               `}
               style={
                   snapshot.isDragging || snapshot.isDropAnimating
                   ? { ...provided.draggableProps.style, ...(snapshot.isDropAnimating ? { transitionDuration: '0.001s' } : {}) }
                   : {}
               }
            >
               <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="flex items-center gap-2.5 w-full min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-[10px] shrink-0 shadow-inner">
                         {initials}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                         <span className="font-black text-slate-800 text-[13px] leading-tight truncate">{clientName}</span>
                         <span className="text-[9px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5 w-full min-w-0 truncate">
                             <span className="font-mono tracking-widest truncate">{displayId}</span>
                         </span>
                      </div>
                  </div>
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 shadow-sm border border-white ring-2 ${job.urgency_level === 'High' ? 'bg-red-500 ring-red-100' : job.urgency_level === 'Medium' ? 'bg-amber-500 ring-amber-100' : 'bg-slate-300 ring-slate-100'}`}></div>
               </div>
               
               <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/80 flex flex-col gap-2 mt-auto">
                   <div className="flex justify-between items-center w-full">
                       <span className={`text-[9px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded truncate max-w-[65%] ${tagColor}`}>
                           {systemSummary}
                       </span>
                       <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 truncate"><MapPin size={10} className="shrink-0 text-slate-400"/> {city}</span>
                   </div>
                   {job.scheduled_time_block && (
                      <div className="flex mt-1">
                          <span className="w-full text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100/50 border border-emerald-200/50 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5">
                              <Clock size={12} strokeWidth={2.5}/>
                              {job.scheduled_time_block}
                          </span>
                      </div>
                   )}
               </div>
            </div>
         )}
      </Draggable>
      );
   };

   return (
       <div className={isSubView ? "flex flex-col gap-6 h-full overflow-hidden" : "p-4 md:p-8 flex flex-col gap-6 h-[calc(100vh-64px)] overflow-hidden bg-white/50"}>
           {/* Header block mirroring Proposals.jsx */}
           <div className={`flex flex-col md:flex-row items-start md:items-center gap-4 shrink-0 ${isSubView ? 'justify-end' : 'justify-between'}`}>
               {!isSubView && (
                   <div>
                       <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-1">
                           <Calendar className="text-primary-600" size={28} />
                           Dispatch & Routing
                       </h1>
                       <p className="text-slate-500 font-medium">Assign crews and time-blocks to approved jobs.</p>
                   </div>
               )}
               <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar w-full md:w-auto">
                   <div className="flex shrink-0 items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1 gap-1.5">
                       <button onClick={() => shiftDate(viewMode === 'day' ? -1 : -7)} className="p-1.5 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors text-slate-400"><ChevronLeft size={18}/></button>
                       
                       <span className="font-bold text-xs text-slate-700 text-center min-w-[140px] tracking-wide">
                           {viewMode === 'day' ? days[0].obj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'}) : `${days[0].obj.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})} - ${days[6].obj.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}`}
                       </span>
                       
                       <div className="relative flex items-center justify-center group">
                           <button onClick={() => dateInputRef.current?.showPicker()} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-500 bg-white border border-slate-200 group-hover:border-slate-300 shadow-sm">
                              <Calendar size={14}/>
                           </button>
                           <input 
                               ref={dateInputRef}
                               type="date"
                               className="absolute w-0 h-0 opacity-0 -z-10"
                               value={days[0].isoStr}
                               onChange={(e) => {
                                   if (e.target.value) {
                                       const [year, month, day] = e.target.value.split('-');
                                       setBaseDate(new Date(year, month - 1, day));
                                   }
                               }}
                           />
                       </div>

                       <button onClick={() => shiftDate(viewMode === 'day' ? 1 : 7)} className="p-1.5 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors text-slate-400"><ChevronRight size={18}/></button>
                   </div>

                   <div className="flex shrink-0 items-center gap-2 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                       {viewMode === 'day' && (
                           <select 
                               value={timeFilter}
                               onChange={(e) => setTimeFilter(e.target.value)}
                               className="px-3 py-2 text-sm font-bold bg-transparent text-slate-500 hover:text-slate-800 outline-none cursor-pointer border-r border-slate-200 mr-1 pr-4"
                           >
                               <option value="all">All Hours</option>
                               <option value="working">Working Hours</option>
                               <option value="morning">Morning Only</option>
                               <option value="afternoon">Afternoon Only</option>
                               <option value="after_hours">After Hours</option>
                           </select>
                       )}
                       <button onClick={() => setViewMode('day')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'day' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Day View</button>
                       <button onClick={() => setViewMode('week')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'week' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Week View</button>
                   </div>
               </div>
           </div>

           <DragDropContext onDragEnd={handleDragEnd}>
               <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 min-h-0 min-w-0 bg-white relative">
                               {viewMode === 'day' ? (
                                    // DAY VIEW (Time Blocks on X, Crews on Y)
                                    <div className="w-full h-full overflow-auto grid [--crew-col:120px] md:[--crew-col:220px] [--time-col:140px] md:[--time-col:180px]" style={{ gridTemplateColumns: `var(--crew-col) repeat(${currentBlocks.length}, minmax(var(--time-col), 1fr))`, gridTemplateRows: `48px repeat(${crews.length}, minmax(150px, 1fr))` }}>
                                        <div className="sticky top-0 left-0 z-30 bg-white border-b border-r border-slate-200 h-12"></div>
                                        
                                        {currentBlocks.map(block => (
                                            <div key={block.value} className="sticky top-0 z-20 h-12 flex items-center justify-center bg-white border-b border-r border-slate-200">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{block.label}</span>
                                            </div>
                                        ))}

                                        {crews.map(crew => (
                                            <React.Fragment key={crew.id}>
                                                <div className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 flex items-center p-3 font-bold text-slate-800 gap-3 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: crew.color_code || '#cbd5e1' }}></div> 
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs md:text-sm line-clamp-2 md:truncate leading-tight">{crew.crew_name}</span>
                                                    </div>
                                                </div>
                                                {currentBlocks.map((block, idx) => {
                                                    const dropId = `${crew.id}::${days[0].isoStr}::${block.value}`;
                                                    const cellJobs = scheduledJobs.filter(j => j.scheduled_date === days[0].isoStr && j.assigned_crew_id === crew.id && (j.scheduled_time_block === block.value || (!j.scheduled_time_block && block.value === '08:00') || (j.scheduled_time_block === 'MORNING' && block.value === '08:00') || (j.scheduled_time_block === 'AFTERNOON' && block.value === '12:00') || (j.scheduled_time_block === 'ALL_DAY' && block.value === '08:00')));
                                                    return (
                                                        <div key={dropId} className="relative border-b border-r border-slate-200 min-h-0">
                                                            <Droppable droppableId={dropId}>
                                                                {(provided, snapshot) => (
                                                                    <div ref={provided.innerRef} {...provided.droppableProps} 
                                                                        className={`absolute inset-0 overflow-y-auto p-2 flex flex-col gap-2 transition-colors
                                                                        ${snapshot.isDraggingOver ? 'bg-primary-50 ring-inset ring-2 ring-primary-200' : 'bg-transparent hover:bg-slate-50/50'}
                                                                        `}>
                                                                        {cellJobs.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
                                                                        {provided.placeholder}
                                                                    </div>
                                                                )}
                                                            </Droppable>
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                               ) : (
                                   // WEEK VIEW (Days on X, Crews on Y)
                                   <div className="w-full h-full overflow-auto grid [--crew-col:120px] md:[--crew-col:220px] [--time-col:200px] md:[--time-col:260px]" style={{ gridTemplateColumns: `var(--crew-col) repeat(7, minmax(var(--time-col), 1fr))`, gridTemplateRows: `48px repeat(${crews.length}, minmax(150px, 1fr))` }}>
                                       <div className="sticky top-0 left-0 z-30 bg-white border-b border-r border-slate-200 h-12"></div>
                                       {days.map(d => (
                                           <div key={d.isoStr} className="sticky top-0 z-20 h-12 flex flex-col items-center justify-center bg-white border-b border-r border-slate-200">
                                               <span className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">{d.obj.toLocaleDateString('en-US', {weekday: 'short'})}</span>
                                               <span className="text-sm font-bold text-slate-800">{d.obj.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                                           </div>
                                       ))}
                                       {crews.map(crew => (
                                            <React.Fragment key={crew.id}>
                                                <div className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 flex items-center p-3 font-bold text-slate-800 gap-3 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: crew.color_code || '#cbd5e1' }}></div> 
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs md:text-sm line-clamp-2 md:truncate leading-tight">{crew.crew_name}</span>
                                                    </div>
                                                </div>
                                               {days.map((d, idx) => {
                                                   const dropId = `${crew.id}::${d.isoStr}::ANY`;
                                                   const cellJobs = scheduledJobs.filter(j => j.scheduled_date === d.isoStr && j.assigned_crew_id === crew.id);
                                                    return (
                                                        <div key={dropId} className="relative border-b border-r border-slate-200 min-h-0">
                                                            <Droppable droppableId={dropId}>
                                                                {(provided, snapshot) => (
                                                                    <div ref={provided.innerRef} {...provided.droppableProps} 
                                                                        className={`absolute inset-0 overflow-y-auto p-2 flex flex-col gap-2 transition-colors
                                                                   ${snapshot.isDraggingOver ? 'bg-primary-50 ring-inset ring-2 ring-primary-200' : 'bg-transparent hover:bg-slate-50/50'}
                                                                   `}>
                                                                   {cellJobs.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
                                                                   {provided.placeholder}
                                                                </div>
                                                            )}
                                                        </Droppable>
                                                    </div>
                                                    );
                                               })}
                                           </React.Fragment>
                                       ))}
                                   </div>
                               )}
                           </div>

                   {/* BOTTOM DRAWER (Unassigned) */}
                   <div className="min-h-[140px] shrink-0 bg-slate-50 border-t border-slate-200 p-4 flex flex-col z-40 relative">
                       <div className="flex justify-between items-center mb-2 px-1">
                           <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Zap size={14} className="text-amber-500"/> Needs Scheduling <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{unassignedQueue.length}</span></h3>
                           <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase hidden md:block">Drag cards onto the calendar</span>
                       </div>
                       <Droppable droppableId="unassigned" direction="horizontal">
                           {(provided, snapshot) => (
                               <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 flex gap-4 overflow-x-auto pb-2 p-2 transition-all ${snapshot.isDraggingOver ? 'bg-primary-50/50 rounded-xl' : ''}`}>
                                   {unassignedQueue.length === 0 && !snapshot.isDraggingOver && (
                                       <div className="m-auto text-slate-400 font-bold text-sm flex items-center gap-2">
                                           <CheckCircle2 size={16} className="text-emerald-500"/> All approved deals have been scheduled!
                                       </div>
                                   )}
                                   {unassignedQueue.map((j, i) => (
                                       <div key={j.id} className="w-[85vw] sm:w-[260px] shrink-0">
                                          <JobCard job={j} index={i} />
                                       </div>
                                   ))}
                                   {provided.placeholder}
                               </div>
                           )}
                       </Droppable>
                   </div>
               </div>
           </DragDropContext>

           {inspectingJob && inspectingJob.__type === 'SERVICE' && (
               <ServiceCallModal 
                   callId={inspectingJob.id} 
                   onClose={() => setInspectingJob(null)} 
                   onUpdate={() => {
                       setInspectingJob(null);
                       fetchData();
                   }}
               />
           )}
           {inspectingJob && inspectingJob.__type !== 'SERVICE' && (
               <OpportunityOverviewModal 
                   isOpen={!!inspectingJob} 
                   onClose={() => setInspectingJob(null)} 
                   job={inspectingJob} 
                   onAction={async (job) => {
                      if (job.status === 'SCHEDULED') {
                          try {
                              await PipelineController.completeDeal(job.id, job.status);
                              toast.success('Job successfully marked as Completed!');
                              fetchData();
                          } catch (e) {
                              toast.error(e.message);
                          }
                      } else if (job.status === 'COMPLETED') {
                          navigate(`/invoices?action=view_invoice&opp_id=${job.id}`);
                      }
                   }}
               />
           )}
       </div>
   );
}
