import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Wrench, Search, LayoutGrid, List, Clock, Calendar, CheckCircle2, MoreVertical, ShieldAlert, AlertCircle, Trash2, MapPin, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import ServiceCallModal from '../components/ServiceCallModal';

const STATUS_COLUMNS = [
    { id: 'Pending', title: 'Pending', color: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-700', icon: 'text-slate-500' },
    { id: 'Scheduled', title: 'Scheduled', color: 'border-amber-300', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
    { id: 'Dispatched', title: 'Dispatched', color: 'border-blue-300', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
    { id: 'En Route', title: 'En Route', color: 'border-indigo-300', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-500' },
    { id: 'Working', title: 'Working', color: 'border-emerald-300', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500' },
    { id: 'Completed', title: 'Completed', color: 'border-cyan-300', bg: 'bg-cyan-100', text: 'text-cyan-700', icon: 'text-cyan-500' }
];

export default function ServiceHub({ isEmbedded = false, initialCallId = null }) {
    const { user } = useAuth();
    const { activeRole, ROLES } = useRole();
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
    const [calls, setCalls] = useState([]);
    const [crews, setCrews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [inspectingCallId, setInspectingCallId] = useState(initialCallId);

    useEffect(() => {
        if (initialCallId) {
            setInspectingCallId(initialCallId);
        }
    }, [initialCallId]);

    useEffect(() => {
        if (user && activeRole) {
            fetchCalls();
        }
    }, [user, activeRole]);

    const fetchCalls = async () => {
        setLoading(true);
        const [callsRes, crewsRes] = await Promise.all([
            supabase
                .from('service_calls')
                .select(`
                    *,
                    households ( 
                        household_name,
                        contacts ( primary_phone ),
                        addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence )
                    )
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false }),
            supabase.from('crews').select('*').eq('is_active', true)
        ]);

        if (crewsRes.data) setCrews(crewsRes.data);
        const { data, error } = callsRes;

        if (error) {
            console.error("Supabase Error fetching service calls:", error);
            toast.error("Failed to load service calls: " + error.message);
        } else {
            let finalCalls = (data || []).map(c => {
                let techs = c.assigned_techs;
                if (typeof techs === 'string') {
                    try { techs = JSON.parse(techs); } 
                    catch (e) { techs = techs.match(/([a-f0-9-]{36})/gi) || []; }
                }
                let tags = c.tags;
                if (typeof tags === 'string') {
                    try { tags = JSON.parse(tags); } 
                    catch (e) { tags = []; }
                }
                
                const propertyTag = tags?.find(t => typeof t === 'string' && t.startsWith('PROPERTY:'));
                const propertyId = propertyTag ? propertyTag.replace('PROPERTY:', '') : null;
                let targetAddress = null;
                if (Array.isArray(c.households?.addresses) && c.households.addresses.length > 0) {
                    if (propertyId) targetAddress = c.households.addresses.find(a => a.id === propertyId);
                    if (!targetAddress) targetAddress = c.households.addresses.find(a => a.is_primary_residence) || c.households.addresses[0];
                    c.households.addresses = [targetAddress];
                }
                
                return { ...c, assigned_techs: techs, tags: Array.isArray(tags) ? tags : [] };
            });
            
            // Enforce RBAC rules
            if (activeRole === ROLES.TECHNICIAN || activeRole === ROLES.SUBCONTRACTOR) {
                const crewId = localStorage.getItem('technician_crew_id');
                if (crewId) {
                    finalCalls = finalCalls.filter(c => (c.assigned_techs || []).includes(crewId));
                } else {
                    finalCalls = []; // Techs with no crew selected see an empty board
                }
            }
            setCalls(finalCalls);
        }
        setLoading(false);
    };

    const updateCallStatus = async (callId, newStatus) => {
        const { error } = await supabase
            .from('service_calls')
            .update({ status: newStatus })
            .eq('id', callId);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`Moved to ${newStatus}`);
            fetchCalls();
        }
    };

    const handleDeleteCall = async (e, callId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to permanently delete this service call?")) return;

        try {
            const { data, error: invokeErr } = await supabase.functions.invoke('admin-action', { body: { action: 'deleteServiceCall', payload: { callId } } });
            const error = invokeErr || (data?.error ? new Error(data.error) : null);
            if (error) throw error;
            toast.success("Service call deleted");
            setCalls(prev => prev.filter(c => c.id !== callId));
        } catch (err) {
            toast.error("Failed to delete call: " + err.message);
        }
    };

    const filteredCalls = calls.filter(c => {
        const query = searchQuery.toLowerCase();
        return (
            c.households?.household_name?.toLowerCase().includes(query) ||
            c.issue_description?.toLowerCase().includes(query) ||
            c.call_type?.toLowerCase().includes(query)
        );
    });

    const calculateHoursInStage = (dateString) => {
        if (!dateString) return 0;
        const then = new Date(dateString);
        const now = new Date();
        return Math.max(0, (now - then) / (1000 * 60 * 60));
    };

    const renderUrgencyBadge = (urgency) => {
        switch (urgency) {
            case 'EMERGENCY': return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm"><ShieldAlert size={10} /> EMERGENCY</span>;
            case 'HIGH': return <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">HIGH</span>;
            case 'NORMAL': return <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">NORMAL</span>;
            case 'LOW': return <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">LOW</span>;
            default: return null;
        }
    };

    const renderCallCard = (call) => {
        const displayId = `SVC-${call.id.substring(0, 4).toUpperCase()}`;
        const hoursInStage = calculateHoursInStage(call.updated_at || call.created_at);
        const isSLA_Violated = call.status === 'Pending' && hoursInStage > 24;

        let assignedCrew = null;
        if (call.assigned_techs && call.assigned_techs.length > 0) {
            assignedCrew = crews.find(c => c.id === call.assigned_techs[0]);
        }
        
        return (
            <div key={call.id} onClick={() => setInspectingCallId(call.id)} className={`group relative cursor-pointer bg-white rounded-xl shadow-sm border p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isSLA_Violated ? 'border-red-300/60 shadow-[0_4px_20px_rgba(239,68,68,0.15)]' : 'border-slate-200/80 hover:border-slate-300'}`}>
                
                {isSLA_Violated && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider animate-in zoom-in">
                        <AlertTriangle size={12} strokeWidth={3} /> {Math.floor(hoursInStage)}h Overdue
                    </div>
                )}

                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col pr-4">
                        <h4 className="font-black text-slate-800 text-base leading-tight truncate">{(call.households?.household_name || 'Unknown Client').replace(/ Account$/i, '').trim()}</h4>
                        <span className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="whitespace-nowrap">{new Date(call.created_at).toLocaleDateString()}</span> 
                            <span className="text-slate-300 whitespace-nowrap">&bull;</span> 
                            <span className="font-mono uppercase tracking-widest text-slate-400 whitespace-nowrap">{displayId}</span>
                        </span>
                    </div>
                    <div className="shrink-0 pt-0.5 flex flex-col items-end gap-2">
                        {renderUrgencyBadge(call.urgency)}
                        {activeRole === ROLES.ADMIN && (
                            <button 
                                onClick={(e) => handleDeleteCall(e, call.id)} 
                                className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                title="Delete Call"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/80 flex flex-col gap-1.5 mb-2.5">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                        <MapPin size={12} className="text-slate-400"/> 
                        <span className="truncate">
                            {call.households?.addresses?.city || 
                             (Array.isArray(call.households?.addresses) ? call.households.addresses[0]?.city : null) || 
                             call.households?.addresses?.street_address || 
                             (Array.isArray(call.households?.addresses) ? call.households.addresses[0]?.street_address : null) || 
                             'Unknown Location'}
                        </span>
                    </div>
                    
                    <div className="mt-1 pl-3 border-l-2 border-primary-300">
                        <span className="text-[11px] font-bold text-slate-700 line-clamp-2">{call.issue_description}</span>
                    </div>
                    
                    {call.scheduled_start && (
                        <div className="flex items-center gap-1.5 mt-2 bg-emerald-100/50 text-emerald-700 px-2 py-1.5 rounded-lg w-fit border border-emerald-200/50">
                            <Calendar size={12} strokeWidth={2.5}/> 
                            <span className="text-[10px] font-black uppercase tracking-wider">{new Date(call.scheduled_start).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</span>
                            <span className="text-[10px] font-black bg-white/60 px-1.5 rounded ml-1">{new Date(call.scheduled_start).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-0 truncate">
                        <Clock size={12} className="shrink-0" /> <span className="truncate">{Math.floor(hoursInStage)}h in stage</span>
                    </div>

                    <div className="relative">
                        <div className={`flex items-center gap-1 ${assignedCrew ? 'bg-slate-50 border-slate-200' : 'bg-white border-dashed border-slate-300'} border px-1.5 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-sm shrink-0 transition-colors`}>
                            {assignedCrew ? (
                                <>
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{backgroundColor: assignedCrew.color_code || '#64748b', color: '#fff'}}>
                                        <Wrench size={10} strokeWidth={3}/>
                                    </div>
                                    <span className="px-1 max-w-[80px] truncate">{assignedCrew.crew_name}</span>
                                </>
                            ) : (
                                <span className="px-2 py-0.5 text-slate-400">Unassigned</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-2.5">
                    <button onClick={(e) => { e.stopPropagation(); setInspectingCallId(call.id); }} className="text-[10px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-all border border-emerald-200/50 uppercase tracking-widest flex items-center gap-1.5 w-full justify-center">
                        View Call <ArrowRight size={12} strokeWidth={3} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col gap-8 overflow-hidden bg-slate-50/50 relative ${isEmbedded ? 'h-full p-2 md:p-4' : 'p-4 md:p-8 h-[calc(100vh-64px)]'}`}>
            {/* Subtle background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-purple-100/40 blur-3xl"></div>
                <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-3xl"></div>
            </div>

            {/* Header Block */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 z-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-1">
                        <div className="bg-purple-100 text-purple-600 p-2.5 rounded-2xl shadow-inner border border-purple-200">
                            <Wrench size={24} strokeWidth={2.5}/>
                        </div>
                        Service Operations
                    </h1>
                    <p className="text-slate-500 font-medium ml-1">Dispatch Hub, technician routing, and service call tracking.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-64 bg-white/80  rounded-2xl shadow-sm border border-slate-200/60 transition-all focus-within:ring-2 focus-within:ring-purple-500">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search calls..." 
                            className="w-full bg-transparent pl-9 pr-4 py-2 text-sm font-medium outline-none text-slate-700 placeholder-slate-400"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-white/80  border border-slate-200/60 rounded-2xl p-1 shadow-sm">
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <LayoutGrid size={14} strokeWidth={2.5} />
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            <List size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 z-10">
                {loading ? (
                    <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar h-full px-1">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex flex-col flex-1 w-[85vw] sm:w-auto min-w-[85vw] sm:min-w-[300px] max-w-[85vw] sm:max-w-[340px] shrink-0 bg-white/40 rounded-[24px] border border-white shadow-sm overflow-hidden opacity-70">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                        <div className="h-3 bg-slate-200 rounded w-20"></div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-white border border-slate-100"></div>
                                </div>
                                <div className="flex-1 p-4 flex flex-col gap-4">
                                    {[1, 2, 3].map(j => (
                                        <div key={j} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-2 w-full pr-4">
                                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                                </div>
                                                <div className="h-4 w-16 bg-slate-100 rounded-full shrink-0"></div>
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-3 h-16 w-full mb-3 border border-slate-100"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {viewMode === 'kanban' ? (
                            <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar h-full px-1">
                                {STATUS_COLUMNS.map(col => {
                                    const laneCalls = filteredCalls.filter(c => c.status === col.id);
                                    
                                    // Custom header theme mapping similar to SalesPipeline
                                    let headerTheme = { bg: 'bg-slate-50/80', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-400' };
                                    if (col.id === 'Pending') headerTheme = { bg: 'bg-slate-100/80', border: 'border-slate-300', text: 'text-slate-800', icon: 'text-slate-500' };
                                    if (col.id === 'Scheduled') headerTheme = { bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' };
                                    if (col.id === 'Dispatched') headerTheme = { bg: 'bg-blue-50/80', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' };
                                    if (col.id === 'En Route') headerTheme = { bg: 'bg-indigo-50/80', border: 'border-indigo-200', text: 'text-indigo-800', icon: 'text-indigo-500' };
                                    if (col.id === 'Working') headerTheme = { bg: 'bg-emerald-50/80', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-500' };
                                    if (col.id === 'Completed') headerTheme = { bg: 'bg-cyan-50/80', border: 'border-cyan-200', text: 'text-cyan-800', icon: 'text-cyan-500' };

                                    return (
                                        <div key={col.id} className="flex flex-col flex-1 w-[85vw] sm:w-auto min-w-[85vw] sm:min-w-[300px] max-w-[85vw] sm:max-w-[340px] shrink-0 bg-white/60  rounded-[24px] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                                            <div className={`p-4 border-b ${headerTheme.border} ${headerTheme.bg} flex justify-between items-center `}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${headerTheme.text.replace('text', 'bg')}`}></div>
                                                    <h2 className={`font-black uppercase tracking-widest text-[11px] ${headerTheme.text}`}>{col.title}</h2>
                                                </div>
                                                <span className={`bg-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border ${headerTheme.border} ${headerTheme.text}`}>{laneCalls.length}</span>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 hide-scrollbar">
                                                {laneCalls.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-slate-200/60 rounded-2xl bg-slate-50/30">
                                                        <div className={`p-3 rounded-full ${headerTheme.bg} mb-3`}>
                                                            <AlertCircle className={headerTheme.icon} size={20} />
                                                        </div>
                                                        <span className="text-slate-400 font-bold text-sm">Empty Queue</span>
                                                    </div>
                                                )}
                                                {laneCalls.map(renderCallCard)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px] text-left border-collapse">
                                    <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <th className="p-4 px-6 font-medium text-left">Customer / ID</th>
                                                <th className="p-4 px-6 font-medium text-center">Status</th>
                                                <th className="p-4 px-6 font-medium text-center">Urgency</th>
                                                <th className="p-4 px-6 font-medium text-center">Type</th>
                                                <th className="p-4 px-6 font-medium text-left">Issue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredCalls.map(call => {
                                                let badgeColors = 'bg-slate-100 text-slate-600 border-slate-200';
                                                if (call.status === 'Pending') badgeColors = 'bg-slate-50 text-slate-800 border-slate-300';
                                                else if (call.status === 'Scheduled') badgeColors = 'bg-amber-50 text-amber-800 border-amber-200';
                                                else if (call.status === 'Dispatched') badgeColors = 'bg-blue-50 text-blue-800 border-blue-200';
                                                else if (call.status === 'En Route') badgeColors = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                                                else if (call.status === 'Working') badgeColors = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                                                else if (call.status === 'Completed') badgeColors = 'bg-cyan-50 text-cyan-800 border-cyan-200';

                                                return (
                                                    <tr key={call.id} onClick={() => setInspectingCallId(call.id)} className="group bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                                                        <td className="p-4 px-6">
                                                            <div className="flex items-center gap-4 min-w-[250px]">
                                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 bg-slate-100 shrink-0">
                                                                    {(call.households?.household_name || 'U').split(' ').filter(Boolean).map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                                                                </div>
                                                                <div className="flex flex-col min-w-0 pr-4">
                                                                    <h3 className="text-[15px] font-black text-slate-900 truncate leading-tight mb-0.5">{(call.households?.household_name || 'Unknown').replace(/ Account$/i, '').trim()}</h3>
                                                                    <p className="text-xs font-semibold text-slate-500 flex items-center flex-wrap">
                                                                        <span className="whitespace-nowrap">{new Date(call.created_at).toLocaleDateString()}</span> 
                                                                        <span className="text-slate-300 mx-1.5 whitespace-nowrap">•</span> 
                                                                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 whitespace-nowrap">SVC-{call.id.substring(0, 4).toUpperCase()}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 px-6 text-center">
                                                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${badgeColors}`}>
                                                                {call.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 px-6 text-center">
                                                            {renderUrgencyBadge(call.urgency)}
                                                        </td>
                                                        <td className="p-4 px-6 text-center">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-purple-700 bg-purple-100/50 border border-purple-200/50 px-2 py-1 rounded">
                                                                {call.call_type || 'REPAIR'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 px-6 text-xs font-medium text-slate-600 max-w-[250px] truncate">
                                                            {call.issue_description}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredCalls.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="p-12 text-center text-sm font-bold text-slate-400 bg-slate-50/30">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <AlertCircle size={32} className="text-slate-300" />
                                                            No service calls found matching your search.
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                        )}
                    </>
                )}
            </div>
            
            {inspectingCallId && (
                <ServiceCallModal 
                    callId={inspectingCallId} 
                    onClose={() => setInspectingCallId(null)} 
                    onUpdate={() => {
                        fetchCalls();
                    }}
                />
            )}
        </div>
    );
}
