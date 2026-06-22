import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, MapPin, Phone, User, Clock, AlertTriangle, CheckCircle, Navigation, MessageSquare, ChevronDown, Wrench, DollarSign, X } from 'lucide-react';
import { formatCustomerName } from '../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
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
                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 border border-orange-100">
                            <Navigation size={28} className="text-orange-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">Ready for Dispatch</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1 text-center max-w-[200px]">Select your vehicle above to sync today's route.</p>
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
    const [isSigning, setIsSigning] = useState(false);
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [paymentCollected, setPaymentCollected] = useState(false);

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

    const handleGenerateInvoice = async (signatureData = null, signedBy = null) => {
        if (!invoiceAmount) return;
        setUpdating(true);
        setIsSigning(false);
        try {
            const amt = parseFloat(invoiceAmount);
            
            let targetProposalId = null;
            let targetCustomerId = job.customer_id || job.customers?.id || null;
            
            if (!isService) {
                const { data: propData } = await supabase.from('proposals')
                    .select('id, customer_id')
                    .eq('associated_opportunity_id', job.id)
                    .eq('status', 'Approved')
                    .single();
                
                if (propData) {
                    targetProposalId = propData.id;
                    if (propData.customer_id) targetCustomerId = propData.customer_id;
                }
            }

            // Generate the invoice record
            const { error: invError } = await supabase.from('invoices').insert({
                proposal_id: targetProposalId,
                customer_id: targetCustomerId,
                total_contract_amount: amt,
                deposit_collected: paymentCollected ? amt : 0,
                balance_due: paymentCollected ? 0 : amt,
                status: paymentCollected ? 'Paid in Full' : 'Partial Payment',
                due_date: new Date().toISOString(),
                customer_signature: signatureData,
                signed_by: signedBy,
                signed_at: signatureData ? new Date().toISOString() : null
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
                const { data: latestSvc } = await supabase.from('service_calls').select('issue_description').eq('id', job.id).single();
                const newDesc = (latestSvc?.issue_description || job.issue_description || '') + noteEntry;
                await supabase.from('service_calls').update({ issue_description: newDesc }).eq('id', job.id);
            } else {
                const { data: latestOpp } = await supabase.from('opportunities').select('proposal_data').eq('id', job.id).single();
                const pData = latestOpp?.proposal_data || job.proposal_data || {};
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
                className={`p-4 flex items-start justify-between cursor-pointer active:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50/50' : ''}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-500 border border-slate-200">
                        {index}
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-base leading-tight tracking-tight">{customerName}</h3>
                        <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-1.5">
                            <MapPin size={12} className="text-slate-400"/> <span className="truncate max-w-[180px]">{address ? address.city : 'No Address'}</span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                        {isBroadcasting && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-600"></span>
                            </span>
                        )}
                        {job.status || 'Pending'}
                    </span>
                    {job.urgency === 'EMERGENCY' && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-rose-100 shadow-sm">
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
                                    <MapPin size={18} className="text-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Navigate</span>
                                </a>
                                <a href={`tel:${phone}`} className="group relative flex flex-col items-center gap-1.5 bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200 active:scale-95 transition-all shadow-sm">
                                    <Phone size={18} className="text-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Call Client</span>
                                </a>
                            </div>

                            {/* Issue / Notes */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquare size={14}/> Dispatch Notes</h4>
                                <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed relative z-10">
                                    {(() => {
                                        let rawNote = isService ? job.issue_description : (job.proposal_data?.dispatch_notes || job.issue_description);
                                        rawNote = rawNote ? rawNote.replace(/^[ |\n]+/, '').trim() : '';
                                        return rawNote || 'No dispatch notes provided.';
                                    })()}
                                </p>
                            </div>

                            {/* Add Field Note */}
                            <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/10 transition-all flex items-end gap-2">
                                <textarea 
                                    className="flex-1 bg-transparent p-2 text-sm font-medium text-slate-900 outline-none resize-none h-[50px] placeholder:text-slate-400"
                                    placeholder="Add field notes..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                                <button 
                                    onClick={saveNote}
                                    disabled={updating || !note.trim()}
                                    className="h-[50px] w-[50px] bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm active:scale-95 shrink-0"
                                >
                                    <CheckCircle size={18} />
                                </button>
                            </div>

                            {/* Status Controls */}
                            <div className="pt-2">
                                {isGeneratingInvoice ? (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 shadow-inner">
                                        <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-1.5"><DollarSign size={12}/> Finalize & Invoice</h4>
                                        
                                        <div className="flex flex-col gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Final Amount</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">$</span>
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        step="0.01"
                                                        value={invoiceAmount}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '' || parseFloat(val) >= 0) setInvoiceAmount(val);
                                                        }}
                                                        className="w-full bg-white border border-slate-200 rounded-lg text-lg font-black text-slate-900 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all pl-8 pr-3 py-2 shadow-sm"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => setPaymentCollected(!paymentCollected)}
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-all active:scale-[0.98] ${paymentCollected ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                                            >
                                                <div className="flex flex-col text-left">
                                                    <span className="text-sm font-bold text-slate-900">Payment Collected</span>
                                                    <span className={`text-[10px] font-semibold ${paymentCollected ? 'text-emerald-600' : 'text-slate-400'}`}>Paid on site via card or check</span>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${paymentCollected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                    <CheckCircle size={14} strokeWidth={3} />
                                                </div>
                                            </button>

                                            <div className="flex gap-2 mt-1">
                                                <button 
                                                    onClick={() => setIsGeneratingInvoice(false)}
                                                    disabled={updating}
                                                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => setIsSigning(true)}
                                                    disabled={updating || !invoiceAmount}
                                                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                                >
                                                    {updating ? 'Processing...' : 'Customer Sign-Off'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-2">Update Job Status</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button 
                                                onClick={() => updateStatus('En Route')}
                                                disabled={updating}
                                                className="bg-yellow-50/80 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 font-black text-[11px] uppercase tracking-wider py-4 rounded-xl shadow-sm active:scale-95 transition-all flex flex-col justify-center items-center gap-2"
                                            >
                                                <Truck size={18}/> En Route
                                            </button>
                                            <button 
                                                onClick={() => updateStatus('Working')}
                                                disabled={updating}
                                                className="bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] uppercase tracking-wider py-4 rounded-xl shadow-sm active:scale-95 transition-all flex flex-col justify-center items-center gap-2"
                                            >
                                                <Wrench size={18}/> Working
                                            </button>
                                            <button 
                                                onClick={() => setIsGeneratingInvoice(true)}
                                                disabled={updating}
                                                className="bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[11px] uppercase tracking-wider py-4 rounded-xl shadow-sm active:scale-95 transition-all flex flex-col justify-center items-center gap-2"
                                            >
                                                <CheckCircle size={18}/> Finish
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SignatureModal 
                isOpen={isSigning} 
                onClose={() => setIsSigning(false)} 
                onSubmit={handleGenerateInvoice} 
                amount={invoiceAmount} 
            />
        </motion.div>
    );
}

function SignatureModal({ isOpen, onClose, onSubmit, amount }) {
    const sigCanvas = useRef(null);
    const [name, setName] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight relative z-10">Customer Sign-Off</h2>
                        <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-widest relative z-10">Total Amount: ${parseFloat(amount || 0).toFixed(2)}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors relative z-10">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="mb-5">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Printed Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                            <span>Signature</span>
                            <button onClick={() => sigCanvas.current.clear()} className="text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">Clear Canvas</button>
                        </label>
                        <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                            <SignatureCanvas 
                                ref={sigCanvas}
                                penColor="#0f172a"
                                canvasProps={{className: "w-full h-48 cursor-crosshair"}}
                            />
                        </div>
                    </div>
                    <div className="mt-4 bg-slate-100/50 rounded-xl p-4 border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed text-center">
                            By signing above, I acknowledge that the service described has been completed to my satisfaction and agree to the final amount due.
                        </p>
                    </div>
                </div>
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 active:scale-[0.98] transition-all">
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if (sigCanvas.current.isEmpty()) {
                                toast.error('Please provide a signature to authorize the work.');
                                return;
                            }
                            if (!name.trim()) {
                                toast.error('Please provide a printed name.');
                                return;
                            }
                            onSubmit(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png'), name);
                        }} 
                        className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
                    >
                        Accept & Sign
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
