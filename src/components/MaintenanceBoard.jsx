import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Bell, MapPin, Calendar, DollarSign, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCustomerName } from '../utils/formatters';

const BoardColumn = ({ title, icon: Icon, colorClass, bgClass, headerBgClass, agreements, setSelectedJob, setSchedulingJob, setViewingInvoices }) => {
    return (
        <div className={`flex-1 min-w-[320px] max-w-sm rounded-2xl border ${bgClass} ${colorClass.border} flex flex-col overflow-hidden`}>
            <div className={`${headerBgClass} border-b ${colorClass.border} px-5 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icon size={18} className={colorClass.icon} />
                    <h3 className={`font-bold ${colorClass.text}`}>{title}</h3>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${colorClass.badgeBg} ${colorClass.badgeText}`}>
                    {agreements.length}
                </span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 no-scrollbar">
                {agreements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-400 opacity-50">
                        <ShieldCheck size={32} className="mb-2" />
                        <p className="text-xs font-medium">No agreements</p>
                    </div>
                ) : (
                    agreements.map((job, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full ${colorClass.accentBg}`} />
                            <div className="pl-2">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                                        {formatCustomerName(job.households?.household_name || 'Unknown')}
                                    </h4>
                                </div>
                                <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-3">
                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                    <span className="truncate">
                                        {Array.isArray(job.households?.addresses) ? job.households.addresses[0]?.street_address : job.households?.addresses?.street_address || 'No address'}
                                    </span>
                                </p>
                                
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Tier</span>
                                        <span className="text-xs font-bold text-slate-700 capitalize">{job.proposal_data?.frequency || 'Standard'}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSchedulingJob(job); }}
                                            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200 flex items-center justify-center transition-colors"
                                            title="Schedule Service"
                                        >
                                            <Calendar size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setViewingInvoices(job); }}
                                            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 flex items-center justify-center transition-colors"
                                            title="View Invoices"
                                        >
                                            <DollarSign size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default function MaintenanceBoard({ agreements, setSelectedJob, setSchedulingJob, setViewingInvoices }) {
    // Categorize agreements
    const dueForService = agreements.filter(a => a.isDueForService);
    const expiringSoon = agreements.filter(a => a.isExpiringSoon && !a.isDueForService);
    const healthy = agreements.filter(a => !a.isDueForService && !a.isExpiringSoon);

    return (
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-h-[500px] no-scrollbar">
            <BoardColumn 
                title="Action Required" 
                icon={AlertCircle}
                colorClass={{
                    border: 'border-amber-200',
                    bg: 'bg-amber-50/30',
                    text: 'text-amber-900',
                    icon: 'text-amber-500',
                    badgeBg: 'bg-amber-100',
                    badgeText: 'text-amber-700',
                    accentBg: 'bg-amber-400'
                }}
                bgClass="bg-slate-50/50"
                headerBgClass="bg-amber-50"
                agreements={dueForService}
                setSelectedJob={setSelectedJob}
                setSchedulingJob={setSchedulingJob}
                setViewingInvoices={setViewingInvoices}
            />

            <BoardColumn 
                title="Upcoming Renewals" 
                icon={Bell}
                colorClass={{
                    border: 'border-purple-200',
                    bg: 'bg-purple-50/30',
                    text: 'text-purple-900',
                    icon: 'text-purple-500',
                    badgeBg: 'bg-purple-100',
                    badgeText: 'text-purple-700',
                    accentBg: 'bg-purple-400'
                }}
                bgClass="bg-slate-50/50"
                headerBgClass="bg-purple-50"
                agreements={expiringSoon}
                setSelectedJob={setSelectedJob}
                setSchedulingJob={setSchedulingJob}
                setViewingInvoices={setViewingInvoices}
            />

            <BoardColumn 
                title="Healthy Contracts" 
                icon={CheckCircle2}
                colorClass={{
                    border: 'border-emerald-200',
                    bg: 'bg-emerald-50/30',
                    text: 'text-emerald-900',
                    icon: 'text-emerald-500',
                    badgeBg: 'bg-emerald-100',
                    badgeText: 'text-emerald-700',
                    accentBg: 'bg-emerald-400'
                }}
                bgClass="bg-slate-50/50"
                headerBgClass="bg-emerald-50"
                agreements={healthy}
                setSelectedJob={setSelectedJob}
                setSchedulingJob={setSchedulingJob}
                setViewingInvoices={setViewingInvoices}
            />
        </div>
    );
}
