import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, MapPin, Phone, User, Clock, AlertTriangle, CheckCircle, Navigation, MessageSquare, ChevronDown, Wrench, DollarSign } from 'lucide-react';
import { formatCustomerName } from '../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocationTracking } from '../hooks/useLocationTracking';

export default function TechnicianMyDay() {
    const [crews, setCrews] = useState([]);
    const [selectedCrewId, setSelectedCrewId] = useState(() => localStorage.getItem('technician_crew_id') || '');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCrews();
    }, []);

    useEffect(() => {
        if (selectedCrewId) {
            localStorage.setItem('technician_crew_id', selectedCrewId);
            fetchMyDay();
        } else {
            setJobs([]);
        }
    }, [selectedCrewId]);

    const fetchCrews = async () => {
        const { data } = await supabase.from('crews').select('*').eq('is_active', true).order('crew_name');
        if (data) setCrews(data);
    };

    const fetchMyDay = async () => {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        
        try {
            // Fetch Service Calls assigned to this crew today
            const { data: svcData } = await supabase.from('service_calls').select(`
                id, status, urgency, call_type, issue_description, scheduled_start,
                households ( household_name, contacts ( primary_phone ), addresses!households_service_address_id_fkey ( street_address, city ) )
            `).contains('assigned_techs', [selectedCrewId]).gte('scheduled_start', `${today}T00:00:00`).lte('scheduled_start', `${today}T23:59:59`);

            // Fetch Installs/Opportunities assigned to this crew today
            const { data: oppData } = await supabase.from('opportunities').select(`
                id, status, urgency_level, issue_description, scheduled_date, scheduled_time_block, proposal_data,
                households ( household_name, contacts ( primary_phone ), addresses!households_service_address_id_fkey ( street_address, city ) )
            `).eq('assigned_crew_id', selectedCrewId).eq('scheduled_date', today);

            const combined = [
                ...(svcData || []).map(s => ({ ...s, __type: 'SERVICE' })),
                ...(oppData || []).map(o => ({ ...o, __type: 'SALES' }))
            ].sort((a, b) => {
                const timeA = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
                const timeB = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
                return timeA - timeB;
            });

            setJobs(combined);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            toast.error("Failed to load your route.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-orange-500/30">
            {/* Header matches Pilar standard: White, soft shadows, clean typography */}
            <div className="bg-white px-5 pt-8 pb-6 shadow-sm border-b border-slate-200 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">My Route</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                        <Truck size={20} className="text-orange-600" />
                    </div>
                </div>

                <div className="relative group">
                    <div className="relative flex items-center bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                        <select 
                            className="w-full bg-transparent text-slate-900 px-4 py-3 text-sm font-bold appearance-none outline-none z-10 cursor-pointer"
                            value={selectedCrewId}
                            onChange={e => setSelectedCrewId(e.target.value)}
                        >
                            <option value="" className="text-slate-500">Select your Truck / Crew...</option>
                            {crews.map(c => (
                                <option key={c.id} value={c.id}>{c.crew_name}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-4 mt-6 relative z-10 space-y-4">
                {!selectedCrewId ? (
                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Navigation size={28} className="text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Ready for Dispatch</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1 text-center max-w-[200px]">Select your vehicle above to sync today's route.</p>
                    </motion.div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Syncing...</span>
                    </div>
                ) : jobs.length === 0 ? (
                    <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                            <CheckCircle size={28} className="text-emerald-500" />
                        </div>
                        <h3 className="font-black text-slate-900 text-lg">Route Clear</h3>
                        <p className="text-sm text-slate-500 mt-1 font-medium">You have no pending assignments. Enjoy your day!</p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {jobs.map((job, idx) => (
                            <JobCard key={job.id} job={job} index={idx + 1} onUpdate={fetchMyDay} crewId={selectedCrewId} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function JobCard({ job, index, onUpdate, crewId }) {
    const [expanded, setExpanded] = useState(false);
    const [note, setNote] = useState('');
    const [updating, setUpdating] = useState(false);
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const [invoiceAmount, setInvoiceAmount] = useState('');

    const isService = job.__type === 'SERVICE';
    const customerName = formatCustomerName(job.households?.household_name);
    const address = job.households?.addresses?.[0];
    const phone = isService 
        ? job.households?.contacts?.[0]?.primary_phone
        : job.households?.contacts?.[0]?.primary_phone;

    // Call the custom hook to broadcast location if this job is "En Route"
    const isEnRoute = job.status === 'En Route';
    const { isBroadcasting } = useLocationTracking(crewId, job.id, isEnRoute);

    // Status config matching Pilar Dashboard aesthetics
    let statusConfig = { bg: "bg-slate-100", text: "text-slate-700" };
    if (job.status === 'En Route') statusConfig = { bg: "bg-yellow-100", text: "text-yellow-700" };
    if (job.status === 'Working') statusConfig = { bg: "bg-blue-100", text: "text-blue-700" };
    if (job.status === 'Completed' || job.status === 'COMPLETED') statusConfig = { bg: "bg-emerald-100", text: "text-emerald-700" };

    const updateStatus = async (newStatus) => {
        setUpdating(true);
        try {
            const table = isService ? 'service_calls' : 'opportunities';
            const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', job.id);
            if (error) throw error;
            toast.success(`Status: ${newStatus}`);
            onUpdate();
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (!invoiceAmount) return;
        setUpdating(true);
        try {
            // Generate the invoice record
            const { error: invError } = await supabase.from('invoices').insert({
                household_id: job.household_id || job.households?.id || null,
                opportunity_id: isService ? null : job.id,
                service_call_id: isService ? job.id : null,
                amount: parseFloat(invoiceAmount),
                status: 'PAID', // Auto mark paid for demo effect
                due_date: new Date().toISOString()
            });

            if (invError) throw invError;

            // Complete the job
            const table = isService ? 'service_calls' : 'opportunities';
            const newStatus = isService ? 'Completed' : 'COMPLETED';
            const { error: statError } = await supabase.from(table).update({ status: newStatus }).eq('id', job.id);
            
            if (statError) throw statError;

            toast.success('Job Completed & Invoice Recorded!');
            setIsGeneratingInvoice(false);
            onUpdate();
        } catch (err) {
            console.error(err);
            toast.error("Failed to finalize job & invoice");
        } finally {
            setUpdating(false);
        }
    };

    const saveNote = async () => {
        if (!note.trim()) return;
        setUpdating(true);
        try {
            const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const noteEntry = `\n[TECH ${timestamp}]: ${note}`;

            if (isService) {
                const newDesc = (job.issue_description || '') + noteEntry;
                await supabase.from('service_calls').update({ issue_description: newDesc }).eq('id', job.id);
            } else {
                const pData = job.proposal_data || {};
                const newNotes = (pData.dispatch_notes || '') + noteEntry;
                await supabase.from('opportunities').update({ proposal_data: { ...pData, dispatch_notes: newNotes } }).eq('id', job.id);
            }
            toast.success("Note saved!");
            setNote('');
            onUpdate();
        } catch (err) {
            toast.error("Failed to save note");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md"
        >
            {/* Card Header (Always visible) */}
            <div 
                className="p-4 flex items-start justify-between cursor-pointer active:bg-slate-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-500 border border-slate-200">
                        {index}
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-base leading-tight tracking-tight">{customerName}</h3>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                            <MapPin size={12}/> <span className="truncate max-w-[180px]">{address ? address.city : 'No Address'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
                        {isBroadcasting && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-600"></span>
                            </span>
                        )}
                        {job.status || 'Pending'}
                    </span>
                    {job.urgency === 'EMERGENCY' && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-100">
                            <AlertTriangle size={10}/> Emergency
                        </span>
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50"
                    >
                        <div className="p-4 space-y-5">
                            {/* Action Buttons: Maps & Call */}
                            <div className="grid grid-cols-2 gap-3">
                                <a href={`maps://?q=${address?.street_address}, ${address?.city}`} className="group relative flex flex-col items-center gap-1.5 bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200 active:scale-95 transition-all shadow-sm">
                                    <MapPin size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Navigate</span>
                                </a>
                                <a href={`tel:${phone}`} className="group relative flex flex-col items-center gap-1.5 bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200 active:scale-95 transition-all shadow-sm">
                                    <Phone size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Call Client</span>
                                </a>
                            </div>

                            {/* Issue / Notes */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquare size={12}/> Dispatch Notes</h4>
                                <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {isService ? job.issue_description : (job.proposal_data?.dispatch_notes || job.issue_description || 'No notes provided.')}
                                </p>
                            </div>

                            {/* Add Field Note */}
                            <div>
                                <div className="flex gap-2">
                                    <textarea 
                                        className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none h-[60px] placeholder:text-slate-400 transition-all shadow-sm"
                                        placeholder="Add field notes..."
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                    />
                                    <button 
                                        onClick={saveNote}
                                        disabled={updating || !note.trim()}
                                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 flex flex-col items-center justify-center disabled:opacity-50 transition-colors shadow-sm active:scale-95"
                                    >
                                        <CheckCircle size={18} className="mb-0.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Save</span>
                                    </button>
                                </div>
                            </div>

                            {/* Status Controls */}
                            <div className="pt-2">
                                {isGeneratingInvoice ? (
                                    <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-4 mt-3">
                                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><DollarSign size={12}/> Finalize & Invoice</h4>
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Final Amount ($)</label>
                                                <input 
                                                    type="number" 
                                                    value={invoiceAmount}
                                                    onChange={e => setInvoiceAmount(e.target.value)}
                                                    className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                                    placeholder="e.g. 250.00"
                                                />
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <button 
                                                    onClick={() => setIsGeneratingInvoice(false)}
                                                    className="flex-1 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-200 text-xs shadow-sm hover:bg-slate-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleGenerateInvoice}
                                                    disabled={updating || !invoiceAmount}
                                                    className="flex-1 py-2.5 rounded-lg font-black text-white bg-emerald-600 hover:bg-emerald-700 text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {updating ? 'Processing...' : 'Collect & Complete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Update Job Status</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button 
                                                onClick={() => updateStatus('En Route')}
                                                disabled={updating}
                                                className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-all flex justify-center items-center gap-1.5"
                                            >
                                                <Truck size={14}/> En Route
                                            </button>
                                            <button 
                                                onClick={() => updateStatus('Working')}
                                                disabled={updating}
                                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-all flex justify-center items-center gap-1.5"
                                            >
                                                <Wrench size={14}/> Working
                                            </button>
                                            <button 
                                                onClick={() => setIsGeneratingInvoice(true)}
                                                disabled={updating}
                                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-all flex justify-center items-center gap-1.5"
                                            >
                                                <CheckCircle size={14}/> Finish
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
