import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, CalendarClock, ShieldAlert, ChevronRight, Wrench, Sparkles } from 'lucide-react';
import { formatCustomerName } from '../utils/formatters';

export default function MaintenanceAlerts({ agreements, setSelectedJob }) {
    
    // Generate alerts based on agreement status
    const generateAlerts = () => {
        const alerts = [];
        
        agreements.forEach(job => {
            if (job.isDueForService) {
                alerts.push({
                    id: `service-${job.id}`,
                    type: 'service',
                    job,
                    title: 'Service Due',
                    message: `${formatCustomerName(job.households?.household_name)} is due for their maintenance tune-up.`,
                    priority: 'high',
                    icon: CalendarClock,
                    color: 'text-amber-600',
                    bg: 'bg-gradient-to-br from-amber-100 to-orange-100',
                    border: 'border-amber-200/50',
                    glow: 'shadow-[0_4px_15px_rgba(245,158,11,0.15)]'
                });
            } else if (job.isExpiringSoon) {
                alerts.push({
                    id: `expiry-${job.id}`,
                    type: 'expiry',
                    job,
                    title: 'Upcoming Renewal',
                    message: `${formatCustomerName(job.households?.household_name)}'s contract expires in less than 30 days.`,
                    priority: 'medium',
                    icon: ShieldAlert,
                    color: 'text-purple-600',
                    bg: 'bg-gradient-to-br from-purple-100 to-fuchsia-100',
                    border: 'border-purple-200/50',
                    glow: 'shadow-[0_4px_15px_rgba(168,85,247,0.15)]'
                });
            }
        });

        // Sort: high priority first
        return alerts.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (a.priority !== 'high' && b.priority === 'high') return 1;
            return 0;
        });
    };

    const alerts = generateAlerts();

    return (
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
            <div className="bg-slate-50/50 border-b border-slate-200/60 px-6 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shadow-md">
                        <Bell size={14} className="text-white" />
                    </div>
                    <h3 className="font-black text-slate-800 text-lg tracking-tight">Alert Center</h3>
                </div>
                {alerts.length > 0 && (
                    <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
                        {alerts.length} Action{alerts.length !== 1 && 's'}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-slate-50/30">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-80">
                        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 rounded-full flex items-center justify-center mb-5 shadow-inner">
                            <Sparkles size={32} className="text-emerald-400" />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                        </div>
                        <h4 className="font-black text-slate-700 text-lg">All Clear!</h4>
                        <p className="text-xs text-center px-6 mt-1.5 font-medium text-slate-500">You're fully caught up. No pending tune-ups or expirations.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {alerts.map((alert, idx) => {
                            const Icon = alert.icon;
                            return (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                                    onClick={() => setSelectedJob(alert.job)}
                                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg group bg-white ${alert.border} ${alert.glow}`}
                                >
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/50 ${alert.bg}`}>
                                            <Icon size={20} className={alert.color} />
                                        </div>
                                        <div className="flex-1 pr-6">
                                            <h4 className={`text-[11px] font-black uppercase tracking-widest mb-1 ${alert.color}`}>
                                                {alert.title}
                                            </h4>
                                            <p className="text-sm font-semibold text-slate-700 leading-snug">
                                                {alert.message}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                                            <ChevronRight size={16} className={alert.color} />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
            
            {alerts.length > 0 && (
                <div className="p-5 border-t border-slate-200/60 bg-white shrink-0">
                    <button className="w-full py-3 bg-gradient-to-br from-slate-800 to-black hover:from-black hover:to-slate-900 text-white rounded-xl font-bold text-sm shadow-[0_4px_15px_rgba(0,0,0,0.15)] transition-all flex items-center justify-center gap-2 hover:scale-[1.02]">
                        <Wrench size={16} />
                        Process Batch ({alerts.length})
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-3 font-bold tracking-widest uppercase">Phase 4 Automation</p>
                </div>
            )}
        </div>
    );
}
