import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, User, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const getStartOfWeek = () => {
   const d = new Date();
   d.setHours(0,0,0,0);
   const day = d.getDay();
   const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Transform to strict Monday start
   return new Date(d.setDate(diff));
};

export default function DispatchCalendar({ pipeline, onScheduleJob, onCardClick }) {
   const [crews, setCrews] = useState([]);
   const [loading, setLoading] = useState(true);
   const [baseDate, setBaseDate] = useState(getStartOfWeek());

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

   // Universal DND Handler
   const handleDragEnd = (result) => {
      const { destination, source, draggableId } = result;

      // Drop outside scope or back into the same exact place
      if (!destination) return;
      if (destination.droppableId === source.droppableId) return;

      let newCrewId = null;
      let newDate = null;

      if (destination.droppableId !== 'unassigned') {
         const parts = destination.droppableId.split('::');
         newCrewId = parts[0];
         newDate = parts[1]; // Format: 'YYYY-MM-DD'
      }

      onScheduleJob(draggableId, newCrewId, newDate);
   };

   // Master State Variables
   const allWonJobs = pipeline['Deal Won'] || [];
   const unassignedJobs = allWonJobs.filter(j => !j.scheduled_date);

   // Data Engine (Sliding 7-Day window)
   const days = Array.from({length: 7}).map((_, i) => {
       const d = new Date(baseDate);
       d.setDate(baseDate.getDate() + i);
       return {
          obj: d,
          isoStr: d.toISOString().split('T')[0] // Native postgres Date storage format
       };
   });

   // Draggable Job Card Definition (Used in Matrix array and Tray array)
   const JobCard = ({ job, index, isMatrix }) => (
      <Draggable key={job.id} draggableId={job.id} index={index}>
         {(provided, snapshot) => (
            <div 
               ref={provided.innerRef}
               {...provided.draggableProps}
               {...provided.dragHandleProps}
               onClick={() => onCardClick && onCardClick(job)}
               className={`bg-white border rounded-md p-2 cursor-grab active:cursor-grabbing hover:border-primary-400 transition-all relative overflow-hidden flex flex-col justify-between ${isMatrix ? 'w-full mb-2 h-[80px]' : 'w-64 shrink-0 mx-2'} ${snapshot.isDragging ? 'ring-2 ring-primary-500 shadow-2xl opacity-100 scale-105 rotate-2 z-[999]' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
            >
               <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: isMatrix ? '#10b981' : '#fbbf24' }}></div>
               <div className="pl-1">
                  <div className="flex justify-between font-bold text-[10px] text-slate-800 mb-0.5">
                     <span className="truncate pr-1">{job.customerName}</span>
                     <span className="text-slate-400 font-mono">#{job.displayId}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{job.address}</div>
               </div>
               
               {/* Time Badge Engine */}
               {isMatrix && (
                   <div className="pl-1 mt-1 shrink-0">
                      {job.scheduled_time_block ? (
                         <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            <Clock size={10} /> {job.scheduled_time_block.replace('Exact: ', '')}
                         </span>
                      ) : (
                         <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse shadow-sm">
                            ⚠️ Time Required
                         </span>
                      )}
                   </div>
               )}
            </div>
         )}
      </Draggable>
   );


   if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading Dispatch Engine...</div>;

   return (
     <DragDropContext onDragEnd={handleDragEnd}>
     <div className="flex flex-col h-full gap-4 pb-4">
        {/* TOP MATRIX: The Calendar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-auto text-sm min-h-[500px]">
           <div 
              className="grid min-w-[1400px]"
              style={{ gridTemplateColumns: '224px repeat(7, minmax(160px, 1fr))' }}
           >
              {/* Top Left Header (Controls) */}
              <div className="h-12 border-b border-r border-slate-200 flex items-center justify-between px-2 font-bold text-slate-500 uppercase text-[11px] tracking-wider bg-slate-100 shadow-sm sticky top-0 left-0 z-30">
                 <button onClick={() => shiftDays(-7)} className="hover:bg-slate-200 p-1 rounded transition-colors tooltip" title="Previous Week"><ChevronLeft size={16} /></button>
                 <span>Dispatch Views</span>
                 <button onClick={() => shiftDays(7)} className="hover:bg-slate-200 p-1 rounded transition-colors tooltip" title="Next Week"><ChevronRight size={16} /></button>
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
                    
                    {/* Sticky Left Y-Axis Label */}
                    <div className="min-h-[128px] border-b border-r border-slate-200 flex flex-col justify-center px-4 py-4 gap-1 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] sticky left-0 z-10 relative">
                       <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: crew.color_code || '#3b82f6'}}></div>
                       <span className="font-bold text-slate-700">{crew.crew_name}</span>
                       <span className="text-[10px] text-slate-400 capitalize bg-slate-100 px-2 py-0.5 rounded-full w-max">Active Team</span>
                    </div>

                    {/* Droppable Day Cells for this Crew */}
                    {days.map((day, i) => {
                       const dropId = `${crew.id}::${day.isoStr}`;
                       const cellJobs = allWonJobs.filter(j => j.scheduled_date === day.isoStr && j.assigned_crew_id === crew.id);

                       return (
                          <Droppable key={dropId} droppableId={dropId}>
                             {(provided, snapshot) => (
                                <div 
                                   className={`min-h-[128px] border-b border-r border-slate-200 bg-[#fbfbfb] p-2 relative flex flex-col border-dashed border-b-slate-100 group ${snapshot.isDraggingOver ? 'bg-primary-50 ring-2 ring-inset ring-primary-300' : 'hover:bg-slate-50'}`}
                                   ref={provided.innerRef}
                                   {...provided.droppableProps}
                                >
                                    <div className="w-full h-full flex flex-col">
                                       {cellJobs.map((job, idx) => (
                                          <JobCard key={job.id} job={job} index={idx} isMatrix={true} />
                                       ))}
                                       {provided.placeholder}
                                       {cellJobs.length === 0 && !snapshot.isDraggingOver && (
                                          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded shadow-sm self-end mt-auto cursor-default absolute bottom-2 right-2">
                                             Available Slot
                                          </span>
                                       )}
                                    </div>
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
        <div className="min-h-[160px] bg-slate-100 rounded-lg border border-slate-300 p-4 shadow-inner flex flex-col shrink-0">
           <div className="flex items-center gap-2 font-bold text-slate-700 mb-3 pb-2 border-b border-slate-200">
              <Calendar size={16} /> 
              Unassigned Jobs <span className="font-normal text-slate-400 text-xs">(Awaiting Scheduling)</span>
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs ml-auto shadow-sm">{unassignedJobs.length} Ready</span>
           </div>
           
           <Droppable droppableId="unassigned" direction="horizontal">
              {(provided, snapshot) => (
                 <div 
                    className={`flex overflow-x-auto pb-2 items-center min-h-[85px] px-1 ${snapshot.isDraggingOver ? 'ring-2 ring-amber-300 rounded shadow-md' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                 >
                    {unassignedJobs.map((job, idx) => (
                       <JobCard key={job.id} job={job} index={idx} isMatrix={false} />
                    ))}
                    {provided.placeholder}
                    
                    {unassignedJobs.length === 0 && (
                       <div className="text-sm text-slate-500 font-medium italic w-full text-left pl-4 flex-1">
                          No approved deals currently pending assignment. Good job!
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
