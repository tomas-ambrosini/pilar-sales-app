import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MapPin, Navigation, Phone, CheckCircle, Clock, FileText, XCircle, DollarSign, PenTool, Truck, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { formatCustomerName } from '../utils/formatters';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import { useLocationTracking } from '../hooks/useLocationTracking';

export default function TechnicianMyDay() {
    const { user } = useAuth();
    const { activeRole } = useRole();
    const [crews, setCrews] = useState([]);
    const [selectedCrewId, setSelectedCrewId] = useState(() => localStorage.getItem('technician_crew_id') || '');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCrews();
    }, [user, activeRole]);

    useEffect(() => {
        if (selectedCrewId) {
            localStorage.setItem('technician_crew_id', selectedCrewId);
            fetchMyDay();

            // Realtime Subscriptions
            const svcSub = supabase.channel('svc-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, payload => {
                    fetchMyDay();
                })
                .subscribe();

            const oppSub = supabase.channel('opp-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, payload => {
                    fetchMyDay();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(svcSub);
                supabase.removeChannel(oppSub);
            };
        } else {
            setJobs([]);
        }
    }, [selectedCrewId]);

    const fetchCrews = async () => {
        const { data } = await supabase.from('crews').select('*').eq('is_active', true).order('crew_name');
        if (data) {
            let availableCrews = data;
            
            if (user) {
                const userName = (user?.user_metadata?.full_name || '').toLowerCase().trim();
                const companyName = (user?.user_metadata?.company_name || '').toLowerCase().trim();
                const email = (user?.email || '').toLowerCase().trim();
                
                // Strict filter so techs/subs only see their own crews
                availableCrews = data.filter(c => {
                    const cName = c.crew_name.toLowerCase().trim();
                    const cEmail = (c.tech_email || '').toLowerCase().trim();
                    
                    if (cEmail && email && cEmail === email) return true;
                    if (!userName && !companyName) return false;
                    
                    return (userName && cName.includes(userName)) || 
                           (companyName && cName.includes(companyName)) ||
                           (userName && userName.includes(cName));
                });
                
                // Fallback: if exact match fails, maybe they don't have a crew set up yet
                if (availableCrews.length === 0) {
                     // If absolutely no match, show nothing. They must have a matching crew to view jobs.
                }
            }
            
            setCrews(availableCrews);
            
            // Auto-select the first match always
            if (availableCrews.length > 0) {
                if (!selectedCrewId || !availableCrews.find(c => c.id === selectedCrewId)) {
                    setSelectedCrewId(availableCrews[0].id);
                }
            }
        }
    };

    const fetchMyDay = async () => {
        setLoading(true);
        try {
            // Fetch jobs in a wide range to handle UTC boundaries, then filter locally
            const d = new Date();
            d.setDate(d.getDate() - 2);
            const past = d.toISOString().split('T')[0];
            d.setDate(d.getDate() + 4);
            const future = d.toISOString().split('T')[0];

            // Fetch Service Calls
            const { data: svcData } = await supabase.from('service_calls').select(`
                id, status, urgency, call_type, issue_description, scheduled_start, metadata, assigned_techs,
                households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
            `).gte('scheduled_start', `${past}T00:00:00`).lte('scheduled_start', `${future}T23:59:59`);

            // Fetch Installs/Opportunities
            const { data: oppData } = await supabase.from('opportunities').select(`
                id, status, urgency_level, issue_description, scheduled_date, scheduled_time_block, proposal_data, metadata, assigned_crew_id,
                households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
            `).gte('scheduled_date', past).lte('scheduled_date', future);

            const combined = [
                ...(svcData || []).map(s => ({ ...s, __type: 'SERVICE' })),
                ...(oppData || []).map(o => ({ ...o, __type: 'SALES' }))
            ];
            
            const todayStr = new Date().toDateString(); // local today, e.g. "Fri Jul 17 2026"
            
            const filteredJobs = combined.filter(job => {
                // Check if it belongs to selected crew
                let belongsToCrew = false;
                if (job.__type === 'SERVICE') {
                    let techs = job.assigned_techs;
                    if (typeof techs === 'string') {
                        try { techs = JSON.parse(techs); } 
                        catch (_) { techs = techs.match(/([a-f0-9-]{36})/gi) || []; }
                    }
                    if (Array.isArray(techs)) {
                        belongsToCrew = techs.some(t => typeof t === 'object' ? t.id === selectedCrewId : t === selectedCrewId);
                    }
                } else {
                    belongsToCrew = job.assigned_crew_id === selectedCrewId;
                }
                
                if (!belongsToCrew) return false;
                
                // Check if it's scheduled for today (local time)
                let jobDateStr = null;
                if (job.__type === 'SERVICE' && job.scheduled_start) {
                    let dateStr = job.scheduled_start.replace(' ', 'T');
                    if (!dateStr.includes('Z') && !dateStr.includes('+')) dateStr += 'Z'; // Force UTC if no timezone is provided by DB
                    jobDateStr = new Date(dateStr).toDateString();
                } else if (job.__type === 'SALES' && job.scheduled_date) {
                    // scheduled_date is YYYY-MM-DD
                    const [year, month, day] = job.scheduled_date.split('-');
                    jobDateStr = new Date(year, month - 1, day).toDateString();
                }
                
                return jobDateStr === todayStr;
            }).sort((a, b) => {
                const timeA = a.scheduled_start ? new Date(a.scheduled_start.replace(' ', 'T').concat(!a.scheduled_start.includes('Z') && !a.scheduled_start.includes('+') ? 'Z' : '')).getTime() : 0;
                const timeB = b.scheduled_start ? new Date(b.scheduled_start.replace(' ', 'T').concat(!b.scheduled_start.includes('Z') && !b.scheduled_start.includes('+') ? 'Z' : '')).getTime() : 0;
                return timeA - timeB;
            });

            setJobs(filteredJobs);
        } catch (error) {
            console.error("Error fetching jobs:", error);
            toast.error("Failed to load your route.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafc] pb-24 font-sans selection:bg-primary-500/30">
            {/* Crew Selection Area */}
            <div className="bg-white/70 backdrop-blur-xl px-5 pt-4 pb-4 border-b border-slate-100 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-800">Assigned Route</h1>
                        <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-0.5">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center border border-primary-200/50 shadow-sm">
                        <Truck size={20} className="text-primary-600" />
                    </div>
                </div>

                {crews.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-fit shadow-sm">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                         <span className="text-xs font-bold text-slate-700">
                             {crews.find(c => c.id === selectedCrewId)?.crew_name || crews[0].crew_name}
                         </span>
                    </div>
                )}
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
    
    const [materials, setMaterials] = useState(job.metadata?.materials_used || '');
    const [photos, setPhotos] = useState(job.metadata?.photos || []);
    const fileInputRef = useRef(null);
    const { isSubcontractor } = useRole();

    const isService = job.__type === 'SERVICE';
    const customerName = formatCustomerName(job.households?.household_name);
    const address = job.households?.addresses?.[0];
    const phone = isService 
        ? job.households?.contacts?.[0]?.primary_phone
        : job.households?.contacts?.[0]?.primary_phone;

    const isEnRoute = job.status === 'En Route';
    const { isBroadcasting } = useLocationTracking(crewId, job.id, isEnRoute);

    let statusConfig = { bg: "bg-slate-100", text: "text-slate-700" };
    if (job.status === 'En Route') statusConfig = { bg: "bg-yellow-100", text: "text-yellow-700" };
    if (job.status === 'Working') statusConfig = { bg: "bg-blue-100", text: "text-blue-700" };
    if (job.status === 'Completed' || job.status === 'COMPLETED') statusConfig = { bg: "bg-emerald-100", text: "text-emerald-700" };

    const updateStatus = async (newStatus) => {
        setUpdating(true);
        try {
            const table = isService ? 'service_calls' : 'opportunities';
            const timestamp = new Date().toISOString();
            
            const { data: existing } = await supabase.from(table).select('metadata').eq('id', job.id).single();
            const currentTimestamps = existing?.metadata?.status_timestamps || {};
            
            const newMeta = {
                ...(existing?.metadata || {}),
                status_timestamps: {
                    ...currentTimestamps,
                    [newStatus]: timestamp
                }
            };

            const { error } = await supabase.from(table).update({ status: newStatus, metadata: newMeta }).eq('id', job.id);
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

            const table = isService ? 'service_calls' : 'opportunities';
            const newStatus = isService ? 'Completed' : 'COMPLETED';
            const timestamp = new Date().toISOString();
            
            const { data: existing } = await supabase.from(table).select('metadata').eq('id', job.id).single();
            const currentTimestamps = existing?.metadata?.status_timestamps || {};
            
            const newMeta = {
                ...(existing?.metadata || {}),
                status_timestamps: {
                    ...currentTimestamps,
                    [newStatus]: timestamp
                }
            };

            const { error: statError } = await supabase.from(table).update({ status: newStatus, metadata: newMeta }).eq('id', job.id);
            
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

    const submitForPayment = async () => {
        setUpdating(true);
        try {
            const table = isService ? 'service_calls' : 'opportunities';
            const timestamp = new Date().toISOString();
            
            const { data: existing } = await supabase.from(table).select('metadata').eq('id', job.id).single();
            const currentTimestamps = existing?.metadata?.status_timestamps || {};
            
            const newMeta = {
                ...(existing?.metadata || {}),
                subcontractor_pay_app: {
                    submitted: true,
                    submitted_at: timestamp
                },
                status_timestamps: {
                    ...currentTimestamps,
                    ['Ready for Review']: timestamp
                }
            };

            const { error: statError } = await supabase.from(table).update({ status: 'Ready for Review', metadata: newMeta }).eq('id', job.id);
            
            if (statError) throw statError;
            toast.success("Job submitted for review & payment");
            onUpdate();
        } catch (err) {
            toast.error("Failed to submit");
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

    const saveMaterials = async () => {
        setUpdating(true);
        try {
            const table = isService ? 'service_calls' : 'opportunities';
            const { data: existing } = await supabase.from(table).select('metadata').eq('id', job.id).single();
            const newMeta = { ...(existing?.metadata || {}), materials_used: materials };
            await supabase.from(table).update({ metadata: newMeta }).eq('id', job.id);
            toast.success("Materials logged!");
            onUpdate();
        } catch (err) {
            toast.error("Failed to save materials");
        } finally {
            setUpdating(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                setUpdating(true);
                try {
                    const newPhotos = [...photos, dataUrl];
                    const table = isService ? 'service_calls' : 'opportunities';
                    const { data: existing } = await supabase.from(table).select('metadata').eq('id', job.id).single();
                    const newMeta = { ...(existing?.metadata || {}), photos: newPhotos };
                    await supabase.from(table).update({ metadata: newMeta }).eq('id', job.id);
                    setPhotos(newPhotos);
                    toast.success("Photo attached to job!");
                    onUpdate();
                } catch (err) {
                    toast.error("Failed to upload photo");
                } finally {
                    setUpdating(false);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    className="flex-1 bg-transparent p-2 text-sm font-medium text-slate-900 outline-none resize-none min-h-[50px] placeholder:text-slate-400"
                                    placeholder="Add field notes..."
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                />
                                <button 
                                    onClick={saveNote}
                                    disabled={updating || !note.trim()}
                                    className="min-h-[50px] w-[50px] bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm active:scale-95 shrink-0"
                                >
                                    <CheckCircle size={18} />
                                </button>
                            </div>

                            {/* Phase 1: Proof of Work & Materials Used */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner flex flex-col gap-4">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Materials Used Log</h4>
                                    <div className="flex items-end gap-2">
                                        <textarea 
                                            className="flex-1 bg-white border border-slate-200 p-3 rounded-lg text-sm font-medium text-slate-900 outline-none focus:border-purple-400 transition-all shadow-sm resize-none h-[60px]"
                                            placeholder="e.g. 1x Contactor, 2 lbs R410a"
                                            value={materials}
                                            onChange={e => setMaterials(e.target.value)}
                                            onBlur={saveMaterials}
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proof of Work Photos</h4>
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={updating}
                                            className="text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
                                        >
                                            + Add Photo
                                        </button>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment" 
                                            ref={fileInputRef} 
                                            onChange={handlePhotoUpload} 
                                            className="hidden" 
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {photos.length === 0 ? (
                                            <div className="w-full h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">
                                                No photos attached
                                            </div>
                                        ) : (
                                            photos.map((p, i) => (
                                                <img key={i} src={p} alt="Proof" className="h-20 w-20 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0" />
                                            ))
                                        )}
                                    </div>
                                </div>
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
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <button 
                                                onClick={() => updateStatus('En Route')}
                                                disabled={updating || job.status === 'Ready for Review' || job.status === 'Completed' || job.status === 'COMPLETED'}
                                                className="bg-yellow-50/80 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 font-black text-[11px] uppercase tracking-wider py-4 rounded-xl shadow-sm active:scale-95 transition-all flex flex-col justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                <Truck size={18}/> En Route
                                            </button>
                                            <button 
                                                onClick={() => updateStatus('Working')}
                                                disabled={updating || job.status === 'Ready for Review' || job.status === 'Completed' || job.status === 'COMPLETED'}
                                                className="bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-[11px] uppercase tracking-wider py-4 rounded-xl shadow-sm active:scale-95 transition-all flex flex-col justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                <Wrench size={18}/> Working
                                            </button>
                                            
                                            {isSubcontractor() ? (
                                                <button 
                                                    onClick={submitForPayment}
                                                    disabled={updating || job.status === 'Ready for Review' || job.status === 'Completed' || job.status === 'COMPLETED'}
                                                    className={`${(job.status === 'Ready for Review' || job.status === 'Completed' || job.status === 'COMPLETED') ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95'} font-black text-[11px] uppercase tracking-wider py-4 rounded-xl transition-all flex flex-col justify-center items-center gap-2 disabled:opacity-50`}
                                                >
                                                    <DollarSign size={18}/> 
                                                    {(job.status === 'Ready for Review' || job.status === 'Completed' || job.status === 'COMPLETED') ? 'Submitted' : 'Submit App'}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => setIsGeneratingInvoice(true)}
                                                    disabled={updating || job.status === 'Completed' || job.status === 'COMPLETED'}
                                                    className="bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[11px] uppercase tracking-wider py-4 rounded-xl shadow-sm active:scale-95 transition-all flex flex-col justify-center items-center gap-2 disabled:opacity-50"
                                                >
                                                    <CheckCircle size={18}/> Finish
                                                </button>
                                            )}
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
                                canvasProps={{className: "w-full h-40 sm:h-48 cursor-crosshair"}}
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
