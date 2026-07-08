import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, MapPin, Wrench, ShieldAlert, Calendar, History, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubcontractorJobHistory({ subcontractorId, crews, onInspectJob }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!crews || crews.length === 0) {
            setJobs([]);
            setLoading(false);
            return;
        }

        const crewIds = crews.map(c => c.id);
        
        async function fetchHistory() {
            try {
                setLoading(true);
                // Fetch service calls assigned to these crews
                let allSvcCalls = [];
                for (const cid of crewIds) {
                     const { data, error } = await supabase.from('service_calls')
                         .select('id, created_at, status, urgency, issue_description, scheduled_start, assigned_techs, households(household_name, addresses(city, street_address))')
                         .contains('assigned_techs', [cid]);
                     if (!error && data) allSvcCalls = [...allSvcCalls, ...data];
                }

                // Fetch opportunities assigned to these crews
                const { data: opps, error: oppError } = await supabase
                    .from('opportunities')
                    .select('id, created_at, status, urgency_level, issue_description, scheduled_date, scheduled_time_block, assigned_crew_id, households(household_name, addresses(city, street_address)), proposal_data')
                    .in('assigned_crew_id', crewIds);

                if (oppError) throw oppError;

                // De-duplicate service calls in case multiple crews were assigned (unlikely but possible)
                const uniqueSvcCalls = Array.from(new Map(allSvcCalls.map(item => [item.id, item])).values());

                const formattedSvcCalls = uniqueSvcCalls.map(c => ({
                    ...c,
                    type: 'SERVICE',
                    sortDate: new Date(c.scheduled_start || c.created_at).getTime(),
                    urgency_level: c.urgency
                }));

                const formattedOpps = (opps || []).map(o => ({
                    ...o,
                    type: o.proposal_data?.type === 'MAINTENANCE' ? 'MAINTENANCE' : 'INSTALL',
                    sortDate: new Date(o.scheduled_date || o.created_at).getTime()
                }));

                const combined = [...formattedSvcCalls, ...formattedOpps].sort((a, b) => b.sortDate - a.sortDate);
                setJobs(combined);
            } catch (err) {
                console.error("Error fetching job history:", err);
                toast.error("Failed to load job history");
            } finally {
                setLoading(false);
            }
        }
        
        fetchHistory();
    }, [subcontractorId, crews]);

    if (loading) {
        return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Loading job history...</div>;
    }

    if (jobs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl m-6 bg-slate-50/50">
                <History size={32} className="mb-3 opacity-20" />
                <p className="font-bold">No history available for this subcontractor.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4 max-h-full overflow-y-auto custom-scrollbar">
            {jobs.map(job => {
                const isService = job.type === 'SERVICE';
                const isMaintenance = job.type === 'MAINTENANCE';
                
                let badgeTheme = 'bg-blue-100 text-blue-700 border-blue-200';
                if (isService) badgeTheme = 'bg-rose-100 text-rose-700 border-rose-200';
                else if (isMaintenance) badgeTheme = 'bg-indigo-100 text-indigo-700 border-indigo-200';

                let urgencyColor = 'bg-slate-100 text-slate-600';
                if (job.urgency_level === 'EMERGENCY') urgencyColor = 'bg-red-100 text-red-700';
                else if (job.urgency_level === 'HIGH') urgencyColor = 'bg-orange-100 text-orange-700';
                
                const addr = job.households?.addresses;
                const location = Array.isArray(addr) ? addr[0]?.city || addr[0]?.street_address : addr?.city || addr?.street_address || 'Unknown Location';
                const clientName = (job.households?.household_name || 'Unknown Client').replace(/ Account$/i, '').trim();

                return (
                    <div 
                        key={job.id} 
                        onClick={() => onInspectJob && onInspectJob(job, job.type)}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <h4 className="font-black text-slate-900 text-sm tracking-tight leading-tight group-hover:text-primary-600 transition-colors">
                                    {clientName}
                                </h4>
                                <span className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                                    {new Date(job.created_at).toLocaleDateString()}
                                    <span className="text-slate-300">&bull;</span>
                                    <span className="font-mono uppercase tracking-widest text-slate-400">
                                        {isService ? `SVC-${job.id.substring(0, 4)}` : `OPP-${job.id.substring(0, 4)}`}
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {(job.urgency_level === 'EMERGENCY' || job.urgency_level === 'HIGH') && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${urgencyColor}`}>
                                        {job.urgency_level}
                                    </span>
                                )}
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black border ${badgeTheme}`}>
                                    {job.type}
                                </span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-2.5 border border-slate-100/80 mb-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 mb-1">
                                <MapPin size={12} className="text-slate-400"/> {location}
                            </div>
                            <p className="text-[11px] font-bold text-slate-700 line-clamp-2 pl-3 border-l-2 border-primary-200">
                                {job.issue_description || 'No description provided.'}
                            </p>
                        </div>
                        
                        <div className="flex justify-between items-center mt-auto">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span className={`px-2 py-0.5 rounded ${job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {job.status}
                                </span>
                            </div>
                            <div className="text-[10px] font-black text-primary-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                                View Details <ArrowRight size={12} strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
