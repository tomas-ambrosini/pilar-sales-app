import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ShieldCheck, Calendar, DollarSign, Clock, Search, ArrowRight, Activity, Bell, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCustomerName } from '../utils/formatters';

export default function MaintenanceHub() {
    const { user } = useAuth();
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('active');

    useEffect(() => {
        fetchAgreements();
    }, []);

    const fetchAgreements = async () => {
        setLoading(true);
        try {
            // We want opportunities that have a MAINTENANCE proposal_data type, and are in a signed state.
            // For now, any Maintenance deal that reached NEEDS_SCHEDULING, SCHEDULED, or COMPLETED is considered an "Active Agreement".
            const { data, error } = await supabase
                .from('opportunities')
                .select('*, households(*, addresses(*))')
                .in('status', ['NEEDS_SCHEDULING', 'SCHEDULED', 'COMPLETED'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Filter JSON client-side
            const maintenanceAgreements = data?.filter(job => job.proposal_data?.type === 'MAINTENANCE') || [];
            
            // Add some derived states for the UI (Next Service, Expiration, etc)
            const processedAgreements = maintenanceAgreements.map(job => {
                 const created = new Date(job.created_at);
                 const expirationDate = new Date(created);
                 expirationDate.setFullYear(created.getFullYear() + 1); // Assuming 1 year agreements

                 const isExpiringSoon = (expirationDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 60;
                 
                 // Fake next service date: 6 months after creation
                 const nextService = new Date(created);
                 nextService.setMonth(created.getMonth() + 6);
                 const isDueForService = nextService <= new Date() || (nextService.getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 30;

                 return {
                     ...job,
                     expirationDate,
                     isExpiringSoon,
                     nextService,
                     isDueForService
                 };
            });

            setAgreements(processedAgreements);
        } catch (error) {
            console.error("Error fetching agreements", error);
            toast.error("Failed to load maintenance agreements");
        }
        setLoading(false);
    };

    const filteredAgreements = agreements.filter(job => {
        const householdName = formatCustomerName(job.households?.household_name || '').toLowerCase();
        return householdName.includes(searchQuery.toLowerCase());
    }).filter(job => {
        if (activeTab === 'renewals') return job.isExpiringSoon;
        if (activeTab === 'due') return job.isDueForService;
        return true; // 'active' shows all
    });

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 z-10 shrink-0">
                <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center border-2 border-blue-200 shrink-0">
                            <ShieldCheck size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Maintenance Hub
                                <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full">Pro</span>
                            </h1>
                            <p className="text-slate-500 font-medium text-sm">Manage recurring agreements and tune-ups.</p>
                        </div>
                    </div>
                </div>
                
                {/* Tabs & Search */}
                <div className="mt-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row justify-between items-end gap-4">
                    <div className="flex gap-6 border-b border-slate-200 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('active')} className={`pb-3 font-bold text-sm tracking-wide transition-colors relative whitespace-nowrap ${activeTab === 'active' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Active Agreements
                            {activeTab === 'active' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                        <button onClick={() => setActiveTab('due')} className={`pb-3 font-bold text-sm tracking-wide transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'due' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Due for Service
                            {agreements.filter(a => a.isDueForService).length > 0 && (
                                <span className="bg-amber-100 text-amber-700 px-1.5 rounded-md text-xs">{agreements.filter(a => a.isDueForService).length}</span>
                            )}
                            {activeTab === 'due' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />}
                        </button>
                        <button onClick={() => setActiveTab('renewals')} className={`pb-3 font-bold text-sm tracking-wide transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'renewals' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Upcoming Renewals
                            {agreements.filter(a => a.isExpiringSoon).length > 0 && (
                                <span className="bg-purple-100 text-purple-700 px-1.5 rounded-md text-xs">{agreements.filter(a => a.isExpiringSoon).length}</span>
                            )}
                            {activeTab === 'renewals' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search customers..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-7xl mx-auto space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-slate-400">
                            <Activity className="animate-spin" size={24} />
                        </div>
                    ) : filteredAgreements.length === 0 ? (
                        <div className="bg-white border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center h-64 text-center p-6">
                            <ShieldCheck size={48} className="text-slate-200 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">No Agreements Found</h3>
                            <p className="text-slate-400 text-sm mt-1">There are no maintenance plans matching this view.</p>
                        </div>
                    ) : (
                        filteredAgreements.map(job => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={job.id} 
                                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col xl:flex-row gap-6 items-start xl:items-center"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                                        <h3 className="font-bold text-slate-800 text-lg">
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
                                        {Array.isArray(job.households?.addresses) ? job.households.addresses[0]?.street : job.households?.addresses?.street || 'No address provided'}
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
                                    <button onClick={() => toast.success("Scheduling flow triggered (Placeholder)")} className="w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-transparent px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                                        <Calendar size={16} /> Schedule Service
                                    </button>
                                    <button onClick={() => toast.success("Invoices modal triggered (Placeholder)")} className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                                        <DollarSign size={16} /> View Invoices
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
