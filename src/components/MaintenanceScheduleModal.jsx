import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Wrench, Clock, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function MaintenanceScheduleModal({ isOpen, onClose, agreement, user }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    if (!isOpen || !agreement) return null;

    const handleSchedule = async () => {
        if (!date) {
            toast.error("Please select a date.");
            return;
        }

        setSaving(true);
        try {
            // Create a Service Call for the maintenance visit
            const { error: callError } = await supabase.from('service_calls').insert([{
                customer_id: agreement.customer_id || agreement.households?.id || null, 
                call_type: 'Maintenance Visit',
                urgency: 'Low',
                issue_description: `Scheduled Maintenance Visit.\nDate: ${date}\nTime: ${time}\nNotes: ${notes}`,
                status: 'Scheduled',
                scheduled_start: date ? new Date(`${date}T${time || '09:00'}`).toISOString() : null,
                tags: [`MAINTENANCE_AGREEMENT:${agreement.id}`, `INTAKEN_BY:${user?.full_name || 'System'}`]
            }]);

            if (callError) throw callError;
            
            // Log activity on the opportunity
            await supabase.from('activity_logs').insert({
                opportunity_id: agreement.id,
                activity_type: 'Maintenance Scheduled',
                description: `A maintenance visit was scheduled for ${date} ${time}. Notes: ${notes}`,
                created_by: user?.id
            });

            toast.success("Maintenance Visit scheduled successfully!");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to schedule maintenance visit.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex justify-end overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ x: '100%', opacity: 0.5 }} 
                    animate={{ x: 0, opacity: 1 }} 
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Calendar className="text-blue-500" size={20} />
                                Schedule Visit
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">Setup next maintenance for {agreement.households?.household_name || 'Customer'}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preferred Date</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg p-3 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preferred Time (Optional)</label>
                            <input 
                                type="time" 
                                value={time} 
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg p-3 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dispatcher Notes</label>
                            <textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                placeholder="Any specific instructions for the technician..."
                                className="w-full border border-slate-200 rounded-lg p-3 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSchedule}
                            disabled={saving || !date}
                            className="px-5 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Scheduling...' : 'Confirm Schedule'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
