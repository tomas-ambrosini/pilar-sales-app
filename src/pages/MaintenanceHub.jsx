import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ShieldCheck, Calendar, DollarSign, Clock, Search, ArrowRight, Activity, Bell, MapPin, TrendingUp, Users, LayoutList, Kanban, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCustomerName } from '../utils/formatters';
import MaintenanceScheduleModal from '../components/MaintenanceScheduleModal';
import MaintenanceInvoiceModal from '../components/MaintenanceInvoiceModal';
import OpportunityOverviewModal from '../components/OpportunityOverviewModal';
import MaintenanceList from '../components/MaintenanceList';
import MaintenanceBoard from '../components/MaintenanceBoard';
import MaintenanceCalendar from '../components/MaintenanceCalendar';
import MaintenanceAlerts from '../components/MaintenanceAlerts';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function MaintenanceHub() {
    const { user } = useAuth();
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('active');
    const [viewMode, setViewMode] = useState('list');
    
    // Modal states
    const [schedulingJob, setSchedulingJob] = useState(null);
    const [viewingInvoices, setViewingInvoices] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);

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
                .select(`
                    *,
                    households (
                        household_name,
                        addresses!addresses_household_id_fkey (
                            street_address,
                            city
                        )
                    )
                `)
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

    // Calculate Analytics
    const analytics = useMemo(() => {
        let mrr = 0;
        let totalValue = 0;
        const chartData = [
            { name: 'Jan', value: 0 }, { name: 'Feb', value: 0 }, { name: 'Mar', value: 0 },
            { name: 'Apr', value: 0 }, { name: 'May', value: 0 }, { name: 'Jun', value: 0 }
        ];

        agreements.forEach(job => {
            const price = job.proposal_data?.total_price || 0;
            totalValue += price;
            
            // Estimate MRR (very rough estimate depending on frequency)
            if (job.proposal_data?.frequency === 'monthly') mrr += price;
            else if (job.proposal_data?.frequency === 'annual') mrr += (price / 12);
            else mrr += (price / 6); // default bi-monthly or unknown
            
            // Populate fake chart data trend based on created_at
            const month = new Date(job.created_at).getMonth();
            if (month < 6) chartData[month].value += price;
        });
        
        // ensure chart goes up for demo
        for(let i=1; i<chartData.length; i++) chartData[i].value += chartData[i-1].value;

        return { mrr, totalValue, chartData };
    }, [agreements]);

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Analytics Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 z-10 shrink-0">
                <div className="max-w-7xl mx-auto w-full flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                    
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                            <ShieldCheck size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Maintenance Hub
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">Pro 2.0</span>
                            </h1>
                            <p className="text-slate-500 font-medium text-sm">Dashboard & Administration Center</p>
                        </div>
                    </div>

                    {/* Executive Metrics Row */}
                    <div className="flex items-center gap-6 w-full xl:w-auto overflow-x-auto no-scrollbar pb-2 xl:pb-0">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 min-w-[200px]">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <TrendingUp size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5">Est. MRR</p>
                                <p className="text-xl font-black text-slate-800">${analytics.mrr.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 min-w-[200px]">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <Users size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5">Active Contracts</p>
                                <p className="text-xl font-black text-slate-800">{agreements.length}</p>
                            </div>
                        </div>

                        {/* Mini Chart */}
                        {agreements.length > 0 && (
                            <div className="h-16 w-32 hidden md:block">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Tabs & Search */}
                <div className="max-w-7xl mx-auto mt-8 w-full flex flex-col sm:flex-row justify-between items-end gap-4">
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

                    <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                        <div className="flex items-center bg-slate-100 p-1 rounded-lg shrink-0">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`flex items-center justify-center w-10 h-8 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                title="List View"
                            >
                                <LayoutList size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('board')}
                                className={`flex items-center justify-center w-10 h-8 rounded-md transition-all ${viewMode === 'board' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Kanban Board"
                            >
                                <Kanban size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('calendar')}
                                className={`flex items-center justify-center w-10 h-8 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Calendar View"
                            >
                                <CalendarIcon size={16} />
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
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row gap-6">
                    <div className="flex-1 min-w-0 space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-64 text-slate-400">
                                <Activity className="animate-spin" size={24} />
                            </div>
                        ) : (
                            <>
                                {viewMode === 'list' && (
                                    <MaintenanceList 
                                        agreements={filteredAgreements} 
                                        setSelectedJob={setSelectedJob} 
                                        setSchedulingJob={setSchedulingJob} 
                                        setViewingInvoices={setViewingInvoices} 
                                    />
                                )}
                                {viewMode === 'board' && (
                                    <MaintenanceBoard 
                                        agreements={filteredAgreements} 
                                        setSelectedJob={setSelectedJob} 
                                        setSchedulingJob={setSchedulingJob} 
                                        setViewingInvoices={setViewingInvoices} 
                                    />
                                )}
                                {viewMode === 'calendar' && (
                                    <MaintenanceCalendar 
                                        agreements={filteredAgreements} 
                                        setSelectedJob={setSelectedJob} 
                                    />
                                )}
                            </>
                        )}
                    </div>
                    
                    <div className="w-full shrink-0" style={{ maxWidth: '384px' }}>
                        <MaintenanceAlerts 
                            agreements={agreements} 
                            setSelectedJob={setSelectedJob} 
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <MaintenanceScheduleModal 
                isOpen={!!schedulingJob} 
                onClose={() => setSchedulingJob(null)} 
                agreement={schedulingJob} 
                user={user} 
            />
            <MaintenanceInvoiceModal 
                isOpen={!!viewingInvoices} 
                onClose={() => setViewingInvoices(null)} 
                agreement={viewingInvoices} 
                user={user} 
            />
            {selectedJob && (
                <OpportunityOverviewModal
                    isOpen={!!selectedJob}
                    onClose={() => setSelectedJob(null)}
                    job={selectedJob}
                    onAction={() => {
                        fetchAgreements();
                        setSelectedJob(null);
                    }}
                />
            )}
        </div>
    );
}
