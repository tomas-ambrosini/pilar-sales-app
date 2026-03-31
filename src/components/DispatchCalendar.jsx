import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, User, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const getStartOfWeek = () => {
   const d = new Date();
   d.setHours(0,0,0,0);
   const day = d.getDay();
   const diff = d.getDate() - day + (day === 0 ? -6 : 1);
   return new Date(d.setDate(diff));
};

export default function DispatchCalendar({ pipeline, onScheduleJob, onCardClick }) {
   const [crews, setCrews] = useState([]);
   const [loading, setLoading] = useState(true);
   const [baseDate, setBaseDate] = useState(getStartOfWeek());
   const [drawerFilter, setDrawerFilter] = useState('All');

   const shiftDays = (diff) => {
      const newD = new Date(baseDate);
      newD.setDate(newD.getDate() + diff);
      setBaseDate(newD);
   };

   useEffect(() => {
      fetchCrews();
   }, []);

   const fetchCrews = async () => {
      const { data, error } = await supabase.from('crews').select('*').order('crew_name');
      if (data) setCrews(data);
      setLoading(false);
   };

   const handleDragEnd = (result) => {
      const { destination, source, draggableId } = result;

      if (!destination) return;
      if (destination.droppableId === source.droppableId) return;

      let newCrewId = null;
      let newDate = null;

      if (destination.droppableId !== 'unassigned') {
         const parts = destination.droppableId.split('::');
         newCrewId = parts[0];
         newDate = parts[1];
      }

      onScheduleJob(draggableId, newCrewId, newDate);
   };

   const allInstalls = pipeline['Deal Won'] || [];
   const allSurveys = pipeline['Site Survey Scheduled'] || [];
   const allNewLeads = pipeline['New Lead'] || [];

   const allBoardJobs = [...allInstalls, ...allSurveys, ...allNewLeads].filter(j => !!j.scheduled_date);
   
   const allUnassigned = [...allInstalls, ...allNewLeads].filter(j => !j.scheduled_date);
   const unassignedJobs = allUnassigned.filter(j => {
      if (drawerFilter === 'All') return true;
      if (drawerFilter === 'Installs') return j.status === 'Deal Won';
      if (drawerFilter === 'Surveys') return j.status === 'New Lead';
      return true;
   });

   const getInitials = (name) => {
      if (!name || name === 'Unknown') return 'UK';
      const parts = name.split(' ');
      if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
   };

   const days = Array.from({length: 7}).map((_, i) => {
       const d = new Date(baseDate);
       d.setDate(baseDate.getDate() + i);
       return {
          obj: d,
          isoStr: d.toISOString().split('T')[0]
       };
   });

   const JobCard = ({ job, index, isMatrix }) => {
      const isInstall = job.status === 'Deal Won';
      const themeColor = isInstall ? 'emerald' : 'purple';
      const bgMap = { emerald: 'bg-emerald-500', purple: 'bg-purple-500' };
      const textMap = { emerald: 'text-emerald-700', purple: 'text-purple-700' };
      const lightBgMap = { emerald: 'bg-emerald-50 border-emerald-200', purple: 'bg-purple-50 border-purple-200' };

      return (
         <Draggable key={job.id} draggableId={job.id} index={index}>
            {(provided, snapshot) => (
               <div 
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  onClick={() => onCardClick && onCardClick(job)}
                  className={`bg-white border rounded-xl p-3 cursor-pointer active:cursor-grabbing transition-all relative overflow-hidden flex flex-col justify-between 
                     ${isMatrix ? 'w-full mb-2 h-[105px]' : 'w-[280px] shrink-0 mx-2'} 
                     ${snapshot.isDragging 
                        ? 'ring-4 ring-primary-500/20 shadow-2xl shadow-primary-500/30 scale-[1.03] rotate-1 z-[999] border-primary-500' 
                        : 'border-slate-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.06)] hover:shadow-lg hover:border-slate-300'}`}
               >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${bgMap[themeColor]}`}></div>
                  
                  <div className="flex items-start gap-2 pl-1 mb-2">
                     <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 ${bgMap[themeColor]}`}>
                        {getInitials(job.customerName)}
                     </div>
                     <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex justify-between items-center mb-0.5">
                           <span className="font-bold text-[11px] text-slate-800 truncate pr-2">{job.customerName}</span>
                           <span className="text-slate-400 font-mono text-[9px] bg-slate-100 px-1 rounded">#{job.displayId}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                           <MapPin size={10} className="shrink-0" /> {job.address}
                        </div>
                     </div>
                  </div>
                  
                  <div className="pl-1 shrink-0 flex items-center justify-between mt-auto">
                     <span className={`inline-flex items-center gap-1 border text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${lightBgMap[themeColor]} ${textMap[themeColor]}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${bgMap[themeColor]} animate-pulse`}></div>
                        {isInstall ? 'Installation' : 'Diagnostic Survey'}
                     </span>
                  </div>

                  {isMatrix && (
                      <div className="pl-1 mt-1.5 shrink-0 border-t border-slate-100 pt-1.5">
                         {job.scheduled_time_block ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 text-[10px] font-bold">
                               <Clock size={12} className="text-slate-400"/> {job.scheduled_time_block.replace('Exact: ', '')}
                            </span>
                         ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-bold animate-pulse">
                               ⚠️ Time Required
                            </span>
                         )}
                      </div>
                  )}
               </div>
            )}
         </Draggable>
      );
   };

   if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading Dispatch Engine...</div>;

   return (
     <DragDropContext onDragEnd={handleDragEnd}>
     <div className="flex flex-col h-full gap-4 pb-4">
        {/* TOP MATRIX: The Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto text-sm min-h-[500px]">
           <div 
              className="grid min-w-[1400px]"
              style={{ gridTemplateColumns: '224px repeat(7, minmax(160px, 1fr))' }}
           >
              {/* Top Left Header (Controls) */}
              <div className="h-12 border-b border-r border-slate-200 flex items-center justify-between px-2 font-bold text-slate-500 uppercase text-[11px] tracking-wider bg-slate-50 shadow-sm sticky top-0 left-0 z-30">
                 <button onClick={() => shiftDays(-7)} className="hover:bg-slate-200 p-1 rounded transition-colors tooltip flex items-center gap-1" title="Previous Week"><ChevronLeft size={16} /></button>
                 <span className="flex items-center gap-1"><Calendar size={14}/> Dispatch Views</span>
                 <button onClick={() => shiftDays(7)} className="hover:bg-slate-200 p-1 rounded transition-colors tooltip flex items-center gap-1" title="Next Week"><ChevronRight size={16} /></button>
              </div>

              {/* Top Day Headers X-Axis */}
              {days.map((day, i) => (
                 <div key={`header-${i}`} className="h-12 border-b border-slate-200 bg-slate-50 flex flex-col items-center justify-center font-semibold text-slate-600 sticky top-0 z-20 shadow-sm shadow-slate-200/50">
                    <span className="text-[10px] uppercase tracking-wider">{day.obj.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                    <span className={i === 0 ? "text-primary-600 font-bold" : ""}>{day.obj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                 </div>
              ))}

              {/* Grid Rows (Y-Axis Crews mapped across X-Axis Days) */}
              {crews.map(crew => (
                 <React.Fragment key={crew.id}>
                    <div className="min-h-[140px] border-b border-r border-slate-200 flex flex-col justify-center px-4 py-4 gap-1 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] sticky left-0 z-10 relative">
                       <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: crew.color_code || '#3b82f6'}}></div>
                       <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {crew.crew_name}</span>
                       <span className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-max mt-1">Active Team</span>
                    </div>

                    {/* Droppable Day Cells for this Crew */}
                    {days.map((day, i) => {
                       const dropId = `${crew.id}::${day.isoStr}`;
                       const cellJobs = allBoardJobs.filter(j => j.scheduled_date === day.isoStr && j.assigned_crew_id === crew.id);

                       return (
                          <Droppable key={dropId} droppableId={dropId}>
                             {(provided, snapshot) => (
                                <div 
                                   className={`min-h-[140px] border-b border-r border-slate-100 p-2 relative flex flex-col group transition-all duration-200 
                                      ${snapshot.isDraggingOver ? 'bg-primary-50/60 shadow-inner' : 'bg-transparent hover:bg-slate-50/80 cursor-pointer'}`}
                                   ref={provided.innerRef}
                                   {...provided.droppableProps}
                                >
                                    <div className="w-full h-full flex flex-col relative z-10">
                                       {cellJobs.map((job, idx) => (
                                          <JobCard key={job.id} job={job} index={idx} isMatrix={true} />
                                       ))}
                                       {provided.placeholder}
                                       {cellJobs.length === 0 && !snapshot.isDraggingOver && (
                                          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow-sm self-end mt-auto cursor-default absolute bottom-2 right-2 flex items-center gap-1">
                                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Available Slot
                                          </span>
                                       )}
                                    </div>
                                    {snapshot.isDraggingOver && (
                                       <div className="absolute inset-0 border-2 border-primary-400 border-dashed rounded-lg pointer-events-none opacity-50 m-1"></div>
                                    )}
                                </div>
                             )}
                          </Droppable>
                       );
                    })}
                 </React.Fragment>
              ))}
           </div>
        </div>

        {/* BOTTOM DRAWER: Horizontal Droppable Pipeline Staging Area */}
        <div className="min-h-[180px] bg-slate-50/80 backdrop-blur-md rounded-xl border border-slate-200/80 p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] flex flex-col shrink-0 relative z-40">
           <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                 <Calendar size={18} className="text-primary-600" /> 
                 Unassigned Jobs Console
                 <span className="bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-md text-[10px] tracking-wide ml-2 shadow-sm">{allUnassigned.length} Ready</span>
              </div>

              {/* Smart Interactive Filters */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                 <button onClick={() => setDrawerFilter('All')} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${drawerFilter === 'All' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}>
                    All Jobs
                 </button>
                 <button onClick={() => setDrawerFilter('Surveys')} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${drawerFilter === 'Surveys' ? 'bg-purple-100 text-purple-800 shadow-sm' : 'text-slate-600 hover:text-purple-700 hover:bg-slate-50'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Surveys
                 </button>
                 <button onClick={() => setDrawerFilter('Installs')} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${drawerFilter === 'Installs' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Installs
                 </button>
              </div>
           </div>
           
           <Droppable droppableId="unassigned" direction="horizontal">
              {(provided, snapshot) => (
                 <div 
                    className={`flex overflow-x-auto pb-2 items-center min-h-[110px] px-1 transition-all rounded-lg ${snapshot.isDraggingOver ? 'bg-amber-50 shadow-inner' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                 >
                    {unassignedJobs.map((job, idx) => (
                       <JobCard key={job.id} job={job} index={idx} isMatrix={false} />
                    ))}
                    {provided.placeholder}
                    
                    {unassignedJobs.length === 0 && (
                       <div className="text-sm text-slate-500 font-medium italic w-full text-left pl-4 flex-1 opacity-70">
                          No {drawerFilter !== 'All' ? drawerFilter.toLowerCase() : 'deals'} pending assignment right now. Clean queue!
                       </div>
                    )}
                 </div>
              )}
           </Droppable>
        </div>
     </div>
     </DragDropContext>
   );
}
