import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Bell, MapPin, Calendar, DollarSign, ShieldCheck } from 'lucide-react';
import { formatCustomerName } from '../utils/formatters';

export default function MaintenanceList({ agreements, setSelectedJob, setSchedulingJob, setViewingInvoices }) {
    if (agreements.length === 0) {
        return (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center h-64 text-center p-6">
                <ShieldCheck size={48} className="text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No Agreements Found</h3>
                <p className="text-slate-400 text-sm mt-1">There are no maintenance plans matching this view.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {agreements.map(job => (
                <motion.div 
                    onClick={() => setSelectedJob(job)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={job.id} 
                    className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col xl:flex-row gap-6 items-start xl:items-center cursor-pointer"
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                                {formatCustomerName(job.households?.household_name || 'Unknown')}
                            </h3>
                            {job.isDueForService && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Clock size={10} /> Service Due
                                </span>
                            )}
                            {job.isExpiringSoon && (
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Bell size={10} /> Expiring Soon
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1">
                            <MapPin size={14} className="text-slate-400" />
                            {Array.isArray(job.households?.addresses) ? job.households.addresses[0]?.street_address : job.households?.addresses?.street_address || 'No address provided'}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-8 px-0 xl:px-8 border-l-0 xl:border-l border-r-0 xl:border-r border-slate-100 shrink-0 w-full xl:w-auto">
                        <div>
                            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1">Plan Tier</p>
                            <p className="font-bold text-slate-700 capitalize">{job.proposal_data?.frequency || 'Standard'} Maintenance</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1">Units Covered</p>
                            <p className="font-bold text-slate-700">{job.proposal_data?.units_covered || 1} System(s)</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0 w-full xl:w-48">
                        <button onClick={(e) => { e.stopPropagation(); setSchedulingJob(job); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white border border-transparent px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                            <Calendar size={16} /> Schedule
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setViewingInvoices(job); }} className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                            <DollarSign size={16} /> Invoice
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
