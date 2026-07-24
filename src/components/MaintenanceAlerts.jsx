import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, CalendarClock, ShieldAlert, ChevronRight, Wrench } from 'lucide-react';
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
                    bg: 'bg-amber-50',
                    border: 'border-amber-200'
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
                    bg: 'bg-purple-50',
                    border: 'border-purple-200'
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Bell size={18} className="text-slate-700" />
                    <h3 className="font-black text-slate-800">Alert Center</h3>
                </div>
                {alerts.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-black px-2 py-0.5 rounded-full">
                        {alerts.length} Action{alerts.length !== 1 && 's'}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-slate-50/30">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                            <ShieldAlert size={32} className="text-slate-300" />
                        </div>
                        <h4 className="font-bold text-slate-600">All Clear!</h4>
                        <p className="text-xs text-center px-4 mt-1">No pending tune-ups or upcoming expirations.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {alerts.map((alert, idx) => {
                            const Icon = alert.icon;
                            return (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedJob(alert.job)}
                                    className={`relative p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group bg-white ${alert.border}`}
                                >
                                    <div className="flex gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.bg}`}>
                                            <Icon size={16} className={alert.color} />
                                        </div>
                                        <div className="flex-1 pr-6">
                                            <h4 className={`text-xs font-bold uppercase tracking-wide mb-1 ${alert.color}`}>
                                                {alert.title}
                                            </h4>
                                            <p className="text-sm font-medium text-slate-700 leading-snug">
                                                {alert.message}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                        <ChevronRight size={18} className={alert.color} />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
            
            {alerts.length > 0 && (
                <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                    <button className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2">
                        <Wrench size={16} />
                        Process Batch ({alerts.length})
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">Phase 4 Automation</p>
                </div>
            )}
        </div>
    );
}
