import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Send, CheckCircle, Clock, ChevronRight, FileText, ArrowUpRight, Wrench, Calendar as CalendarIcon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCustomers } from '../context/CustomerContext';
import { useProposals } from '../context/ProposalContext';
import { formatQuoteId, formatCustomerName } from '../utils/formatters';
import { computeDashboardMetrics } from '../utils/dashboardMetrics';
import { supabase } from '../supabaseClient';
import NewServiceCallModal from '../components/NewServiceCallModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { proposals } = useProposals();
  const [timeRange, setTimeRange] = useState(7);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  
  const [serviceCalls, setServiceCalls] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [feedItems, setFeedItems] = useState([]);

  useEffect(() => {
     const fetchOpsData = async () => {
        const { data: svcData } = await supabase.from('service_calls').select(`
           id, created_at, status, urgency, call_type, issue_description, scheduled_start,
           households ( household_name )
        `).eq('is_active', true).order('created_at', { ascending: false }).limit(20);
        
        const { data: oppData } = await supabase.from('opportunities').select(`
           id, created_at, status, urgency_level, scheduled_date, issue_description,
           households ( household_name ), user_profiles ( full_name )
        `).eq('is_active', true).order('created_at', { ascending: false }).limit(20);

        if (svcData) setServiceCalls(svcData);
        if (oppData) setOpportunities(oppData);

        // Merge for the feed
        const combined = [
           ...(svcData || []).map(s => ({ ...s, __type: 'SERVICE', updated_at: s.created_at })),
           ...(oppData || []).map(o => ({ ...o, __type: 'SALES', updated_at: o.created_at }))
        ].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8);
        
        setFeedItems(combined);
     };

     fetchOpsData();

     const svcChannel = supabase.channel('dashboard_svc')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, fetchOpsData)
         .subscribe();
         
     const oppChannel = supabase.channel('dashboard_opp')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, fetchOpsData)
         .subscribe();

     const handleOpenModal = () => setIsNewServiceModalOpen(true);
     window.addEventListener('open-new-service-modal', handleOpenModal);
     
     return () => {
         window.removeEventListener('open-new-service-modal', handleOpenModal);
         supabase.removeChannel(svcChannel);
         supabase.removeChannel(oppChannel);
     };
  }, []);

  // Real Analytics Metrics
  const activeProposals = proposals ? proposals.filter(p => p.status === 'Sent') : [];
  const activeMetrics = computeDashboardMetrics(activeProposals, 'updated_at', timeRange);
  
  // Operations Metrics
  const activeServiceCount = serviceCalls.filter(s => ['Pending', 'Dispatched', 'En Route', 'Working'].includes(s.status)).length;
  const emergencyCount = serviceCalls.filter(s => s.urgency === 'EMERGENCY' && s.status !== 'Completed').length;
  
  const today = new Date().toISOString().split('T')[0];
  const dispatchUnassigned = serviceCalls.filter(s => s.status === 'Pending').length + opportunities.filter(o => o.status === 'APPROVED' || o.status === 'NEEDS_SCHEDULING').length;
  
  // Scheduled today
  const dispatchToday = serviceCalls.filter(s => s.scheduled_start?.startsWith(today)).length + opportunities.filter(o => o.scheduled_date === today).length;

  // Sorting strictly chronologically and taking top 5
  const recentProposals = proposals
    ? [...proposals].sort((a,b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 5)
    : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 space-y-6">
      {/* Header */}
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
             Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Team'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">Here's your pipeline overview for today.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-slate-200/50 p-1 rounded-md shadow-inner border border-slate-200">
              <button className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${timeRange === 7 ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setTimeRange(7)}>7D</button>
              <button className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${timeRange === 30 ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setTimeRange(30)}>30D</button>
              <button className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${timeRange === 365 ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setTimeRange(365)}>YTD</button>
           </div>
           <div className="hidden sm:flex text-sm text-slate-400 font-bold bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </div>
        </div>
      </motion.header>

      {/* Quick Actions (Enterprise Minimal) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <button 
            onClick={() => navigate('/proposals?action=new')}
            className="group flex flex-col justify-between bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white p-5 rounded-2xl shadow-sm transition-all focus:outline-none text-left border border-slate-700 hover:shadow-md"
         >
            <div className="flex items-center justify-between w-full mb-4">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <Plus size={20}/>
               </div>
               <ArrowUpRight size={20} className="text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <div>
               <div className="text-lg font-bold mb-1">Generate Quote</div>
               <div className="text-xs font-medium text-slate-300">New sales proposal</div>
            </div>
         </button>

         <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-new-service-modal'))}
            className="group flex flex-col justify-between bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-sm transition-all focus:outline-none text-left hover:shadow-md hover:border-slate-300"
         >
            <div className="flex items-center justify-between w-full mb-4">
               <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                  <Wrench size={20}/>
               </div>
               <ArrowUpRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
            </div>
            <div>
               <div className="text-lg font-bold mb-1 text-slate-900">Log Service Call</div>
               <div className="text-xs font-medium text-slate-500">Record a customer issue</div>
            </div>
         </button>

         <button 
            onClick={() => navigate('/dispatch')}
            className="group flex flex-col justify-between bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-sm transition-all focus:outline-none text-left hover:shadow-md hover:border-slate-300"
         >
            <div className="flex items-center justify-between w-full mb-4">
               <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Send size={20}/>
               </div>
               <ArrowUpRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <div>
               <div className="text-lg font-bold mb-1 text-slate-900">Dispatch Board</div>
               <div className="text-xs font-medium text-slate-500">Route active jobs & crews</div>
            </div>
         </button>

         <button 
            onClick={() => navigate('/calendar')}
            className="group flex flex-col justify-between bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-sm transition-all focus:outline-none text-left hover:shadow-md hover:border-slate-300"
         >
            <div className="flex items-center justify-between w-full mb-4">
               <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <CalendarIcon size={20}/>
               </div>
               <ArrowUpRight size={20} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
            </div>
            <div>
               <div className="text-lg font-bold mb-1 text-slate-900">Company Calendar</div>
               <div className="text-xs font-medium text-slate-500">View today's agenda</div>
            </div>
         </button>
      </motion.div>

      <motion.h3 variants={itemVariants} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
         Operations Overview
      </motion.h3>
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Proposals (Sales Pipeline) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-emerald-50 border-emerald-100 text-emerald-600">
                    <Send size={24} />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full z-10 border ${
                  activeMetrics.isPositive === true ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                  activeMetrics.isPositive === false ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-slate-600 bg-slate-50 border-slate-200'
                }`}>{activeMetrics.growthText}</span>
            </div>
            <div className="relative z-10">
                <h4 className="text-slate-500 font-bold text-sm tracking-wide uppercase mb-1">Active Proposals</h4>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{activeMetrics.currentValue}</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-50">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeMetrics.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                   <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* Service Board */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-orange-50 border-orange-100 text-orange-600">
                    <Wrench size={24} />
                </div>
                {emergencyCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-rose-700 bg-rose-50 border border-rose-100">
                    {emergencyCount} Emergency
                  </span>
                )}
            </div>
            <div className="relative z-10">
                <h4 className="text-slate-500 font-bold text-sm tracking-wide uppercase mb-1">Active Service Calls</h4>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{activeServiceCount}</div>
            </div>
        </div>

        {/* Dispatch Queue */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-blue-50 border-blue-100 text-blue-600">
                    <CheckCircle size={24} />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full text-slate-600 bg-slate-50 border border-slate-200">
                  {dispatchToday} Today
                </span>
            </div>
            <div className="relative z-10">
                <h4 className="text-slate-500 font-bold text-sm tracking-wide uppercase mb-1">Unassigned Dispatch</h4>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{dispatchUnassigned}</div>
            </div>
        </div>
      </motion.div>

      {/* Structured Data Table */}
      <motion.div variants={itemVariants} className="flex flex-col">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operations Feed</h3>
            <button onClick={() => navigate('/calendar')} className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors uppercase tracking-widest">
               View Calendar <ChevronRight size={14}/>
            </button>
         </div>
         
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           {feedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                 <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 mb-4 shadow-sm">
                    <CheckCircle size={28} />
                 </div>
                 <h3 className="text-sm font-bold text-slate-900 mb-1">Inbox Zero</h3>
                 <p className="text-xs font-medium text-slate-500 mb-6">There are no recent operations to display.</p>
              </div>
           ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left bg-white">
                 <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-200">
                       <th className="p-4 px-6 w-12">Type</th>
                       <th className="p-4 px-6">Client / Details</th>
                       <th className="p-4 px-6">Timestamp</th>
                       <th className="p-4 px-6 text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {feedItems.map((item) => {
                       const isService = item.__type === 'SERVICE';
                       
                       let badgeClasses = "bg-slate-50 text-slate-600 border-slate-200";
                       if (item.status === 'Sent' || item.status === 'Scheduled') badgeClasses = "bg-blue-50 text-blue-700 border-blue-200";
                       if (item.status === 'Approved' || item.status === 'Working' || item.status === 'En Route') badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
                       if (item.urgency === 'EMERGENCY' && item.status !== 'Completed') badgeClasses = "bg-rose-50 text-rose-700 border-rose-200";
   
                       return (
                          <tr 
                             key={item.id} 
                             onClick={() => isService ? navigate('/service') : navigate('/proposals')}
                             className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                             <td className="p-4 px-6">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                   isService ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                }`}>
                                   {isService ? <Wrench size={18} /> : <FileText size={18} />}
                                </div>
                             </td>
                             <td className="p-4 px-6">
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                    {formatCustomerName(item.households?.household_name)}
                                    {item.urgency === 'EMERGENCY' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                                </div>
                                <div className="text-xs font-medium text-slate-500 mt-0.5 truncate max-w-[250px]">
                                   {item.issue_description || 'No description provided'}
                                </div>
                             </td>
                             <td className="p-4 px-6">
                                <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                   <Clock size={14} className="text-slate-400 group-hover:text-primary-500 transition-colors"/> 
                                   {new Date(item.updated_at).toLocaleDateString()}
                                </div>
                             </td>
                             <td className="p-4 px-6 text-right">
                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border ${badgeClasses}`}>
                                   {item.status || 'Pending'}
                                </span>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
              </div>
           )}
         </div>
      </motion.div>

      <NewServiceCallModal 
        isOpen={isNewServiceModalOpen} 
        onClose={() => setIsNewServiceModalOpen(false)} 
      />
    </motion.div>
  );
}
