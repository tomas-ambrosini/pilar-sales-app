import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Bell, MapPin, Calendar, DollarSign, ShieldCheck, ChevronRight, Settings } from 'lucide-react';
import { formatCustomerName } from '../utils/formatters';

export default function MaintenanceList({ agreements, setSelectedJob, setSchedulingJob, setViewingInvoices }) {
    if (agreements.length === 0) {
        return (
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 border-dashed rounded-3xl flex flex-col items-center justify-center h-[350px] text-center p-8 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <ShieldCheck size={36} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">No Agreements Found</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium max-w-xs">We couldn't find any maintenance plans matching your current view criteria.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {agreements.map((job, idx) => (
                <motion.div 
                    onClick={() => setSelectedJob(job)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={job.id} 
                    className="group bg-white border border-slate-200/60 rounded-2xl p-5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 flex flex-col xl:flex-row flex-wrap gap-6 items-start xl:items-center cursor-pointer overflow-hidden relative"
                >
                    {/* Subtle hover gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/10 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex-1 min-w-[240px] relative z-10 w-full xl:w-auto">
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <h3 className="font-black text-slate-800 text-xl tracking-tight group-hover:text-blue-600 transition-colors">
                                {formatCustomerName(job.households?.household_name || 'Unknown')}
                            </h3>
                            {job.isDueForService && (
                                <span className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200/50 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm shrink-0">
                                    <Clock size={12} /> Service Due
                                </span>
                            )}
                            {job.isExpiringSoon && (
                                <span className="bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-800 border border-purple-200/50 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm shrink-0">
                                    <Bell size={12} /> Expiring Soon
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                            <MapPin size={16} className="text-slate-400 shrink-0" />
                            {Array.isArray(job.households?.addresses) ? job.households.addresses[0]?.street_address : job.households?.addresses?.street_address || 'No address provided'}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:gap-6 px-0 xl:px-8 border-l-0 xl:border-l border-r-0 xl:border-r border-slate-100 shrink-0 w-full xl:w-auto relative z-10">
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex-1 xl:min-w-[130px]">
                            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1 flex items-center gap-1"><Settings size={10} /> Plan Tier</p>
                            <p className="font-bold text-slate-700 capitalize text-sm">{job.proposal_data?.frequency || 'Standard'}</p>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex-1 xl:min-w-[130px]">
                            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1">Units Covered</p>
                            <p className="font-bold text-slate-700 text-sm">{job.proposal_data?.units_covered || 1} System(s)</p>
                        </div>
                    </div>

                    <div className="flex flex-row xl:flex-col gap-2.5 shrink-0 w-full xl:w-40 relative z-10">
                        <button onClick={(e) => { e.stopPropagation(); setSchedulingJob(job); }} className="flex-1 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_2px_10px_rgba(37,99,235,0.2)] hover:shadow-[0_4px_15px_rgba(37,99,235,0.3)] border border-blue-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                            <Calendar size={16} /> Schedule
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setViewingInvoices(job); }} className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                            <DollarSign size={16} /> Invoice
                        </button>
                    </div>
                    
                    <div className="hidden 2xl:flex absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:-translate-x-0 transition-all duration-300 pointer-events-none">
                        <ChevronRight size={24} className="text-blue-200" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
