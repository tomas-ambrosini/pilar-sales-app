import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Wrench, Clock, MapPin, Phone, Save, Calendar as CalendarIcon, UserCheck, AlertCircle, Check, Mail, Navigation, Info, MessageSquare, Activity, Send, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';

export default function ServiceCallModal({ callId, onClose, onUpdate }) {
    const { user } = useAuth();
    const [callData, setCallData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [converting, setConverting] = useState(false);
    const navigate = useNavigate();
    
    const [assignedCrew, setAssignedCrew] = useState(null);
    const [activities, setActivities] = useState([]);
    const [newNote, setNewNote] = useState('');
    
    useEffect(() => {
        if (callId) fetchCallDetails();
    }, [callId]);

    const fetchCallDetails = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('service_calls')
            .select(`
                *,
                households ( 
                    household_name,
                    contacts ( primary_phone, email ),
                    addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence )
                )
            `)
            .eq('id', callId)
            .single();

        if (error) {
            toast.error("Failed to load service call");
            onClose();
        } else {
            // Handle case where Postgres returns assigned_techs as a string
            let techs = data.assigned_techs;
            if (typeof techs === 'string') {
                try {
                    techs = JSON.parse(techs);
                } catch (e) {
                    const match = techs.match(/([a-f0-9-]{36})/gi);
                    techs = match || [];
                }
            }
            let parsedTags = data.tags;
            if (typeof parsedTags === 'string') {
                try { parsedTags = JSON.parse(parsedTags); }
                catch(e) {
                    // Extract items from Postgres format "{item1,item2}"
                    const m = parsedTags.match(/^{?(.*?)}?$/);
                    if (m && m[1]) {
                        // Split by comma, but respect quotes if any. For simplicity, just simple split
                        parsedTags = m[1].split(',').map(s => {
                            let clean = s.trim();
                            if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
                            return clean;
                        }).filter(Boolean);
                    } else {
                        parsedTags = [];
                    }
                }
            }

            const parsedCallData = {
                ...data,
                scheduled_start: data.scheduled_start ? data.scheduled_start.slice(0, 16) : '',
                scheduled_end: data.scheduled_end ? data.scheduled_end.slice(0, 16) : '',
                arrival_window_start: data.arrival_window_start ? data.arrival_window_start.slice(0, 16) : '',
                arrival_window_end: data.arrival_window_end ? data.arrival_window_end.slice(0, 16) : '',
                assigned_techs: techs || [],
                tags: Array.isArray(parsedTags) ? parsedTags : []
            };
            setCallData(parsedCallData);

            // Fetch the assigned crew if any
            if (techs && techs.length > 0) {
                let crewId = techs[0];
                if (typeof crewId === 'object' && crewId !== null && crewId.id) crewId = crewId.id;
                
                const { data: crewData } = await supabase.from('crews').select('crew_name, color_code').eq('id', crewId).single();
                if (crewData) setAssignedCrew(crewData);
            }
        }
        
        await fetchActivities(parsedCallData);
        setLoading(false);
    };

    const fetchActivities = async (currentCallData) => {
        const dataToUse = currentCallData || callData;
        if (!dataToUse) return;

        try {
            const { data: actData, error: actError } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('service_call_id', callId)
                .order('created_at', { ascending: false });
            
            if (!actError && actData) {
                const synthesized = [...actData];
                
                const hasCreation = synthesized.some(a => a.activity_type.includes('Created') || a.activity_type.includes('Intaken'));
                if (!hasCreation) {
                    const intakenByTag = dataToUse.tags?.find(t => typeof t === 'string' && t.startsWith('INTAKEN_BY:'));
                    const intakeName = intakenByTag ? intakenByTag.replace('INTAKEN_BY:', '') : 'System';
                    synthesized.push({
                        id: `synth-create-${callId}`,
                        activity_type: 'Service Call Created',
                        description: `Call intaken by ${intakeName}.`,
                        created_at: dataToUse.created_at || new Date().toISOString()
                    });
                }

                const hasScheduled = synthesized.some(a => a.activity_type.includes('Scheduled') || a.description?.includes('Scheduled'));
                if (!hasScheduled && dataToUse.scheduled_start) {
                    const scheduledByTag = dataToUse.tags?.find(t => typeof t === 'string' && t.startsWith('SCHEDULED_BY:'));
                    const schedName = scheduledByTag ? scheduledByTag.replace('SCHEDULED_BY:', '') : 'System';
                    // Offset creation time slightly so it orders after creation
                    const schedDate = new Date(new Date(dataToUse.created_at).getTime() + 1000).toISOString();
                    synthesized.push({
                        id: `synth-sched-${callId}`,
                        activity_type: 'Job Scheduled',
                        description: `Service call was scheduled and routed. (Action taken by: ${schedName})`,
                        created_at: schedDate
                    });
                }

                const hasStatusChange = synthesized.some(a => a.activity_type === 'Status Updated');
                if (!hasStatusChange && dataToUse.status !== 'Pending' && dataToUse.status !== 'Scheduled') {
                     const statusDate = dataToUse.updated_at || new Date().toISOString();
                     synthesized.push({
                        id: `synth-status-${callId}`,
                        activity_type: 'Status Updated',
                        description: `Status advanced to ${dataToUse.status}. (Legacy Record)`,
                        created_at: statusDate
                    });
                }

                synthesized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setActivities(synthesized);
            }
        } catch (e) {
            console.error('Failed to fetch activity logs', e);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
            const { error } = await supabase.from('activity_logs').insert({
                household_id: callData.customer_id,
                service_call_id: callId,
                activity_type: `Dispatch Note by ${userName}`,
                description: newNote
            });
            if (error) throw error;
            setNewNote('');
            await fetchActivities(callData);
            toast.success('Note added successfully');
        } catch (e) {
            toast.error('Failed to save note');
        }
    };

    const handleSave = async (overrideStatus = null) => {
        setSaving(true);
        const finalStatus = typeof overrideStatus === 'string' ? overrideStatus : callData.status;
        
        if (finalStatus !== callData.status) {
            const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
            await supabase.from('activity_logs').insert({
                household_id: callData.customer_id,
                service_call_id: callId,
                activity_type: 'Status Updated',
                description: `Status changed to ${finalStatus}. (Action taken by: ${userName})`
            });
            fetchActivities({ ...callData, status: finalStatus }); // Update timeline in background
        }

        const payload = {
            status: finalStatus,
            urgency: callData.urgency,
            call_type: callData.call_type,
            issue_description: callData.issue_description,
            updated_at: new Date().toISOString()
            // Note: assigned_techs, scheduled_start, scheduled_end are intentionally NOT updated from the form.
            // They are driven by the Dispatch Calendar dragging.
        };

        const { error } = await supabase
            .from('service_calls')
            .update(payload)
            .eq('id', callId);

        if (error) {
            toast.error("Failed to save changes");
        } else {
            toast.success("Service Call updated");
            if (onUpdate) onUpdate();
            onClose();
        }
        setSaving(false);
    };

    const handleConvertToSales = async () => {
        if (!window.confirm("Are you sure you want to convert this Service Call into a Sales Lead?")) return;
        setConverting(true);
        try {
            const { data: newOpp, error: oppError } = await supabase.from('opportunities').insert({
                household_id: callData.customer_id,
                urgency_level: callData.urgency === 'EMERGENCY' ? 'High' : 'Medium',
                issue_description: `[CONVERTED FROM SERVICE CALL ${callData.id.slice(0,8)}]\n\n${callData.issue_description}`,
                status: 'Lead',
                proposal_data: { type: 'SALES', intaken_by: user?.full_name || 'System' }
            }).select().single();

            if (oppError) throw oppError;

            await supabase.from('activity_logs').insert({
                household_id: callData.customer_id,
                opportunity_id: newOpp.id,
                activity_type: 'Converted from Service',
                description: `Lead created from Service Call ${callData.id.slice(0,8)} by ${user?.full_name || 'System'}.`
            });

            const updatedTags = [...(callData.tags || []), 'CONVERTED_TO_SALES'];
            const { error: svcError } = await supabase.from('service_calls').update({
                tags: updatedTags,
                issue_description: callData.issue_description + `\n\n[Converted to Sales Lead]`
            }).eq('id', callId);

            if (svcError) throw svcError;

            toast.success("Successfully converted to Sales Lead!");
            if (onUpdate) onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to convert: " + err.message);
        }
        setConverting(false);
    };

    if (loading || !callData) return null;

    const customerName = (callData.households?.household_name || 'Unknown Customer').replace(/ Account$/i, '').trim();
    
    // Extract Metadata from tags
    const intakenByTag = callData.tags?.find(t => t.startsWith('INTAKEN_BY:'));
    const intakenBy = intakenByTag ? intakenByTag.replace('INTAKEN_BY:', '') : 'Unknown Employee';

    const scheduledByTag = callData.tags?.find(t => t.startsWith('SCHEDULED_BY:'));
    const scheduledBy = scheduledByTag ? scheduledByTag.replace('SCHEDULED_BY:', '') : 'Pending Assignment';
    
    const propertyTag = callData.tags?.find(t => t.startsWith('PROPERTY:'));
    const propertyId = propertyTag ? propertyTag.replace('PROPERTY:', '') : null;
    
    // Match specific property if found, else fallback to primary or first available
    let targetAddress = null;
    if (callData.households?.addresses && callData.households.addresses.length > 0) {
        if (propertyId) {
            targetAddress = callData.households.addresses.find(a => a.id === propertyId);
        }
        if (!targetAddress) {
            targetAddress = callData.households.addresses.find(a => a.is_primary_residence) || callData.households.addresses[0];
        }
    }

    const address = targetAddress?.street_address || 'No address provided';
    const city = targetAddress?.city;
    const displayId = `SVC-${callData.id.slice(0, 8).toUpperCase()}`;

    // Extracted above

    let primaryActionText = '';
    let primaryActionColor = '';
    let nextStatus = null;

    switch(callData.status) {
        case 'Pending':
            primaryActionText = null; // Enforce scheduling via calendar drag-drop
            break;
        case 'Scheduled':
            primaryActionText = 'Dispatch Tech';
            nextStatus = 'Dispatched';
            primaryActionColor = 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20';
            break;
        case 'Dispatched':
            primaryActionText = 'Mark En Route';
            nextStatus = 'En Route';
            primaryActionColor = 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20';
            break;
        case 'En Route':
            primaryActionText = 'Arrived / Start Work';
            nextStatus = 'Working';
            primaryActionColor = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20';
            break;
        case 'Working':
            primaryActionText = 'Complete Job';
            nextStatus = 'Completed';
            primaryActionColor = 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20';
            break;
        case 'Completed':
            primaryActionText = null;
            break;
    }

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title={
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-inner">
                        <Wrench size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black text-slate-800 tracking-tight">Service Hub</span>
                        <span className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="whitespace-nowrap">{new Date(callData.created_at).toLocaleDateString()}</span> 
                            <span className="text-slate-300 whitespace-nowrap">&bull;</span> 
                            <span className="font-mono uppercase tracking-widest text-slate-400 whitespace-nowrap">{displayId}</span>
                        </span>
                    </div>
                </div>
            } 
            width="max-w-6xl" 
            bodyClassName="p-0 h-[80vh] min-h-[650px] flex flex-col bg-slate-50"
        >
            {/* Progress Stepper - Full 6 Steps */}
            <div className="w-full bg-white border-b border-slate-200 p-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    {[
                        { label: 'Pending', match: ['Pending', 'Scheduled', 'Dispatched', 'En Route', 'Working', 'Completed'] },
                        { label: 'Scheduled', match: ['Scheduled', 'Dispatched', 'En Route', 'Working', 'Completed'] },
                        { label: 'Dispatched', match: ['Dispatched', 'En Route', 'Working', 'Completed'] },
                        { label: 'En Route', match: ['En Route', 'Working', 'Completed'] },
                        { label: 'Working', match: ['Working', 'Completed'] },
                        { label: 'Complete', match: ['Completed'] }
                    ].map((step, idx, arr) => {
                        const isCompleted = step.match.includes(callData.status);
                        const isCurrent = step.match.includes(callData.status) && (idx === arr.length - 1 || !arr[idx+1].match.includes(callData.status));
                        return (
                            <div key={step.label} className="flex items-center w-full relative">
                                <div className="flex flex-col items-center relative z-10 gap-1.5 w-full">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] transition-all duration-300 ${isCurrent ? 'bg-purple-600 text-white ring-4 ring-purple-100 shadow-md scale-110' : isCompleted ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                        {isCompleted && !isCurrent ? <Check size={14} strokeWidth={3} /> : idx + 1}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-purple-700' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>{step.label}</span>
                                </div>
                                {idx < arr.length - 1 && (
                                    <div className={`absolute left-[50%] right-[-50%] top-4 h-0.5 -mt-px transition-colors duration-300 ${arr[idx+1].match.includes(callData.status) ? 'bg-purple-400' : 'bg-slate-200'}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden min-h-0">
                {/* Left Panel: Context & Logistics */}
                <div className="w-full lg:w-[45%] bg-slate-50/50 lg:border-r border-slate-200 p-6 lg:overflow-y-auto custom-scrollbar flex flex-col gap-6 min-w-0 lg:min-h-0 shrink-0 lg:shrink">
                    
                    {/* Customer Profile */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-black text-slate-500 text-lg shrink-0 shadow-inner">
                                {(callData.households?.household_name || 'U').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-slate-800 text-xl truncate">{customerName}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Customer Profile</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                                <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" /> 
                                <span>
                                    {address}
                                    {city && !address.toLowerCase().includes(city.toLowerCase()) && (
                                        <><br/>{city}</>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                <Phone size={16} className="text-slate-400 shrink-0" /> 
                                <span>{callData.households?.contacts?.[0]?.primary_phone || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                <Mail size={16} className="text-slate-400 shrink-0" /> 
                                <span className="truncate">{callData.households?.contacts?.[0]?.email || 'No email provided'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata & Audit Trail */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info size={14} /> Call Metadata
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Status</label>
                                <div className="w-full bg-slate-50/50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-600 flex items-center justify-between shadow-inner">
                                    {callData.status}
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Urgency</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 focus:bg-white hover:border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm outline-none cursor-pointer"
                                    value={callData.urgency}
                                    onChange={e => setCallData({...callData, urgency: e.target.value})}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High</option>
                                    <option value="EMERGENCY">Emergency</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">Intaken By</label>
                                <div className="text-sm font-semibold text-slate-700 p-1">{intakenBy}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">Created At</label>
                                <div className="text-sm font-semibold text-slate-700 p-1">{new Date(callData.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                            </div>
                        </div>
                    </div>

                    {/* Logistics Card (Read-Only) */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Clock size={14} /> Dispatch Routing
                        </h3>
                        {callData.status === 'Pending' ? (
                            <div className="text-center py-6 bg-amber-50 rounded-xl border border-dashed border-amber-200">
                                <AlertCircle size={24} className="mx-auto text-amber-400 mb-2" />
                                <p className="text-sm font-bold text-amber-700 px-4">This call is Pending Assignment.</p>
                                <p className="text-xs font-medium text-amber-600 mt-1 px-4">To schedule and assign a crew, please drag and drop this card on the Crew Routing Calendar.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5"><UserCheck size={12}/> Assigned Crew (Lane)</label>
                                    <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold text-slate-800 shadow-inner flex items-center gap-3">
                                        {assignedCrew ? (
                                            <>
                                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: assignedCrew.color_code || '#cbd5e1' }}></div>
                                                {assignedCrew.crew_name}
                                            </>
                                        ) : (
                                            <span className="text-slate-400 italic">No Active Crew Found</span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Scheduled Start</label>
                                        <div className="text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            {callData.scheduled_start ? new Date(callData.scheduled_start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Scheduled End</label>
                                        <div className="text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            {callData.scheduled_end ? new Date(callData.scheduled_end).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center justify-between">
                                        <span>Scheduled By</span>
                                    </label>
                                    <div className="text-sm font-semibold text-slate-700 mt-1">{scheduledBy}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Dispatch Notes (Moved to left panel) */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> Dispatch Instructions
                            </h3>
                            {callData.tags?.includes('CONVERTED_TO_SALES') && (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                    <UserCheck size={10} /> Converted
                                </span>
                            )}
                        </div>
                        <textarea 
                            className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm font-medium text-slate-700 resize-none leading-relaxed placeholder-slate-400"
                            placeholder="Enter dispatch instructions..."
                            value={callData.issue_description}
                            onChange={e => setCallData({...callData, issue_description: e.target.value})}
                        />
                    </div>
                </div>

                {/* Right Panel: Unified Timeline */}
                <div className="w-full lg:w-[55%] flex flex-col bg-white relative border-t lg:border-t-0 border-slate-200 min-w-0 lg:min-h-0 shrink-0 lg:shrink">
                    
                    <div className="p-4 border-b border-slate-100 bg-white z-10 shadow-sm flex items-center justify-between shrink-0">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 tracking-tight">
                            <History size={18} className="text-primary-600" /> Unified Timeline
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{activities.length} Events</span>
                    </div>

                    <div className="p-6 lg:overflow-y-auto flex-1 lg:min-h-0 custom-scrollbar bg-slate-50/30">
                        {activities.length > 0 ? (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                {activities.map((act) => (
                                    <div key={act.id} className="relative flex items-start gap-4 group">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow-sm shrink-0 relative z-10">
                                            {act.activity_type.includes('Note') ? (
                                                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><MessageSquare size={14} /></div>
                                            ) : act.activity_type.includes('Status') ? (
                                                <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><Check size={14} /></div>
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-600"><Activity size={14} /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-black text-slate-800 text-sm">{act.activity_type}</span>
                                                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                    {new Date(act.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                                                {act.description}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <History size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">No activity recorded yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white z-10 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] shrink-0">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                placeholder="Drop a note into the timeline..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                            />
                            <button 
                                onClick={handleAddNote}
                                disabled={!newNote.trim()}
                                className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions - Strict State Machine Driven */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 relative z-10">
                        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                            {['Dispatched', 'En Route', 'Working'].includes(callData.status) && (
                                <button 
                                    onClick={() => window.open(`/tracker/${callData.id}`, '_blank')}
                                    className="w-full sm:w-auto justify-center px-4 py-2.5 text-xs font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <Navigation size={16} /> Track Tech
                                </button>
                            )}
                            {!callData.tags?.includes('CONVERTED_TO_SALES') && (
                                <button 
                                    onClick={handleConvertToSales} 
                                    disabled={converting}
                                    className="w-full sm:w-auto justify-center px-4 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl transition-all flex items-center gap-2"
                                >
                                    {converting ? 'Converting...' : 'Convert to Sales Lead'}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <button onClick={onClose} className="w-full sm:w-auto justify-center px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
                            <button 
                                onClick={() => handleSave(null)} 
                                disabled={saving}
                                className="w-full sm:w-auto justify-center px-6 py-2.5 text-sm font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm rounded-xl transition-all flex items-center gap-2"
                            >
                                <Save size={16} /> Save Notes
                            </button>
                            
                            {/* Primary Action Button pushes the state forward logically */}
                            {primaryActionText && (
                                <button 
                                    onClick={async () => {
                                        await handleSave(nextStatus);
                                    }}
                                    disabled={saving}
                                    className={`w-full sm:w-auto justify-center px-8 py-2.5 text-sm font-black shadow-sm rounded-xl transition-all flex items-center gap-2 ${primaryActionColor}`}
                                >
                                    {primaryActionText}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
