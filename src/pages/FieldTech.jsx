import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Clock, CheckCircle, Zap, Shield, ChevronLeft, Phone, Camera, FileText, AlertTriangle } from 'lucide-react';

export default function FieldTech() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  
  // For demo, we assume the logged in tech is viewing all assigned or unassigned dispatch jobs
  useEffect(() => {
    fetchTechJobs();
    
    const channel = supabase.channel('realtime_tech_jobs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
            fetchTechJobs();
        })
        .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchTechJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id, work_order_number, status, urgency_level, execution_payload,
          scheduled_date, scheduled_time_block,
          households ( 
             id, household_name, 
             contacts ( primary_phone ),
             addresses!households_service_address_id_fkey ( street_address, city, state, zip )
          )
        `)
        .neq('status', 'Completed') // Only show active jobs
        .not('scheduled_date', 'is', null) // Only show scheduled jobs
        .order('scheduled_date', { ascending: true });

      if (error && error.code !== 'PGRST205') throw error;
      if (data) setJobs(data);
    } catch (err) {
      console.error("Failed to load tech jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
     if (!activeJob) return;
     
     const { error } = await supabase
       .from('work_orders')
       .update({ status: newStatus })
       .eq('id', activeJob.id);
       
     if (!error) {
         setActiveJob(prev => ({ ...prev, status: newStatus }));
         fetchTechJobs();
     } else {
         alert("Failed to update status. Check network.");
     }
  };

  // Render the list of today's jobs
  const renderRouteList = () => (
    <div className="mobile-route-container fade-in">
      <div className="px-4 py-6">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Today's Route</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle size={48} className="text-emerald-300 mb-4" />
            <h3 className="font-bold text-slate-600 mb-1">You're all clear!</h3>
            <p className="text-sm text-slate-400">No active work orders assigned to you today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => {
               const rawAddr = job.households?.addresses;
               const addr = Array.isArray(rawAddr) ? rawAddr[0] : rawAddr;
               const addressStr = addr ? `${addr.street_address}, ${addr.city}` : 'Unknown Address';
               const isEnRoute = job.status === 'En Route';
               const isInProgress = job.status === 'In Progress';
               
               return (
                 <motion.div 
                    whileTap={{ scale: 0.98 }}
                    key={job.id} 
                    className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${isInProgress ? 'border-primary-500' : isEnRoute ? 'border-amber-400' : 'border-slate-100'} cursor-pointer`}
                    onClick={() => setActiveJob(job)}
                 >
                    <div className="flex justify-between items-start mb-3">
                       <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-1 rounded">
                          {job.scheduled_time_block || 'FLEX'}
                       </span>
                       <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${isInProgress ? 'bg-primary-100 text-primary-700' : isEnRoute ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                          {job.status}
                       </span>
                    </div>
                    
                    <h3 className="font-black text-lg text-slate-800 leading-tight mb-1">{job.households?.household_name}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium mb-4">
                       <MapPin size={14}/> {addressStr}
                    </p>

                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between">
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Task Info</p>
                          <p className="font-bold text-slate-700 text-sm">
                             {job.execution_payload?.tierName ? `Install: ${job.execution_payload.tierName.toUpperCase()}` : 'General Work Order'}
                          </p>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-slate-200 flex flex-center text-slate-500"><ChevronLeft className="rotate-180" size={16}/></div>
                    </div>
                 </motion.div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Render the active job execution view
  const renderActiveJob = () => {
     if (!activeJob) return null;
     
     const rawAddr = activeJob.households?.addresses;
     const addr = Array.isArray(rawAddr) ? rawAddr[0] : rawAddr;
     const addressStr = addr ? `${addr.street_address}, ${addr.city}, ${addr.state || ''} ${addr.zip || ''}` : 'Unknown Address';
     
     const rawContacts = activeJob.households?.contacts;
     const phone = Array.isArray(rawContacts) ? rawContacts[0]?.primary_phone : rawContacts?.primary_phone;
     const isEnRoute = activeJob.status === 'En Route';
     const isInProgress = activeJob.status === 'In Progress';
     const installSpec = activeJob.execution_payload;

     return (
       <motion.div 
         className="mobile-execution-view"
         initial={{ x: '100%' }}
         animate={{ x: 0 }}
         exit={{ x: '100%' }}
         transition={{ type: 'spring', damping: 25, stiffness: 200 }}
       >
          <div className="execution-header rounded-none relative pt-4">
            {/* Top Navigation */}
             <div className="flex justify-between items-center mb-6">
                <button className="w-10 h-10 rounded-full bg-white shadow flex-center border border-slate-200" onClick={() => setActiveJob(null)}>
                   <ChevronLeft size={20} className="text-slate-700"/>
                </button>
                <span className="text-xs font-black tracking-widest uppercase text-slate-500 bg-white shadow-sm px-3 py-1.5 rounded-full border border-slate-200">
                   #{activeJob.work_order_number}
                </span>
             </div>

             <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">{activeJob.households?.household_name}</h2>
             
             {/* Map Button */}
             <a href={`maps://?q=${encodeURIComponent(addressStr)}`} className="bg-slate-800 text-white rounded-xl p-4 flex items-center justify-between shadow-lg mt-6 active:scale-95 transition-transform">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-700 flex-center"><Navigation size={18} className="text-emerald-400"/></div>
                   <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Navigate To</p>
                      <p className="font-bold text-sm leading-tight max-w-[200px] truncate">{addressStr}</p>
                   </div>
                </div>
             </a>

             {/* Phone Button */}
             {phone && (
                <a href={`tel:${phone}`} className="bg-white border border-slate-200 text-slate-700 rounded-xl p-4 flex items-center justify-between mt-3 active:scale-95 transition-transform font-bold">
                   <div className="flex items-center gap-2"><Phone size={18} className="text-primary-500"/> Call Customer</div>
                   <span className="text-slate-400 font-mono text-sm">{phone}</span>
                </a>
             )}
          </div>

          <div className="p-4 space-y-6 pb-32">
             {/* Execution Specs */}
             <div className="bg-white border border-primary-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-bl-[100px] -z-0"></div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-primary-600 mb-4 flex items-center gap-1.5 relative z-10"><FileText size={14}/> Execution Order</h3>
                
                {installSpec ? (
                   <div className="relative z-10">
                      <div className="text-2xl font-black text-slate-800 mb-1">{installSpec?.brand} <span className="text-slate-400 font-medium text-lg">{installSpec?.tons}T</span></div>
                      <p className="text-sm font-bold text-slate-500 mb-4">SEER Rating: {installSpec?.seer || 'Standard'}</p>
                      
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Scope of Work</p>
                         {installSpec.features?.map((f, i) => (
                           <p key={i} className="text-xs font-medium text-slate-600 flex items-start gap-1.5"><CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5"/> {f}</p>
                         ))}
                      </div>
                   </div>
                ) : (
                   <p className="text-sm font-medium text-slate-500 relative z-10">No specific equipment payload found. Standard service execution.</p>
                )}
             </div>

             <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1.5"><AlertTriangle size={14}/> Urgency</h3>
                 <p className="text-sm font-bold text-slate-700">{activeJob.urgency_level || 'Standard'}</p>
             </div>
          </div>

          {/* Locked Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 pb-8 flex gap-3 z-50">
             {!isEnRoute && !isInProgress && (
                <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-lg" onClick={() => handleStatusUpdate('En Route')}>
                   START ROUTE
                </button>
             )}
             {isEnRoute && (
                <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-95 transition-all text-lg" onClick={() => handleStatusUpdate('In Progress')}>
                   ARRIVE ON SITE
                </button>
             )}
             {isInProgress && (
                <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all text-lg" onClick={() => handleStatusUpdate('Completed')}>
                   COMPLETE JOB
                </button>
             )}
          </div>
       </motion.div>
     );
  };

  return (
    <div className="max-w-md mx-auto relative pb-20">
       <AnimatePresence>
          {activeJob ? renderActiveJob() : renderRouteList()}
       </AnimatePresence>
    </div>
  );
}
