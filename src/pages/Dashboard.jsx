import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Send, CheckCircle, Clock, ChevronRight, FileText, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCustomers } from '../context/CustomerContext';
import { useProposals } from '../context/ProposalContext';
import { formatQuoteId } from '../utils/formatters';
import { computeDashboardMetrics } from '../utils/dashboardMetrics';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { proposals } = useProposals();
  const [timeRange, setTimeRange] = useState(7);

  // Real Analytics Metrics
  const customerMetrics = computeDashboardMetrics(customers, 'created_at', timeRange);
  
  const activeProposals = proposals ? proposals.filter(p => p.status === 'Sent') : [];
  const activeMetrics = computeDashboardMetrics(activeProposals, 'updated_at', timeRange);
  
  const closedProposals = proposals ? proposals.filter(p => p.status === 'Approved') : [];
  const closedMetrics = computeDashboardMetrics(closedProposals, 'updated_at', timeRange);

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
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1">
             Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Team'}
          </h1>
          <p className="text-slate-500 font-medium">Here's your pipeline overview for today.</p>
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
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <button 
            onClick={() => navigate('/proposals?action=new')}
            className="group flex flex-col justify-between bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white p-5 rounded-2xl shadow-sm transition-all focus:outline-none text-left border border-slate-700 hover:shadow-md"
         >
            <div className="flex items-center justify-between w-full mb-6">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <Plus size={20}/>
               </div>
               <ArrowUpRight size={20} className="text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <div>
               <div className="text-lg font-bold mb-1">Generate Quote</div>
               <div className="text-sm font-medium text-slate-300">Build a new proposal and send to client</div>
            </div>
         </button>

         <button 
            onClick={() => navigate('/customers?action=new')}
            className="group flex flex-col justify-between bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-sm transition-all focus:outline-none text-left hover:shadow-md hover:border-slate-300"
         >
            <div className="flex items-center justify-between w-full mb-6">
               <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                  <Users size={20}/>
               </div>
               <ArrowUpRight size={20} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
            <div>
               <div className="text-lg font-bold mb-1 text-slate-900">New Customer</div>
               <div className="text-sm font-medium text-slate-500">Create a new customer profile</div>
            </div>
         </button>
      </motion.div>

      <motion.h3 variants={itemVariants} className="text-sm font-bold text-slate-900 flex items-center gap-2 pt-2">
         <FileText size={16} className="text-slate-400" /> Pipeline Stats
      </motion.h3>
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div className="p-5 pb-0">
            <div className="flex items-center gap-2 mb-3">
               <Users size={16} className="text-slate-400" />
               <p className="text-sm font-medium text-slate-600">Total Customers</p>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
               <p className="text-3xl font-black text-slate-900 tracking-tight">{customerMetrics.currentValue}</p>
               <span className={`text-xs font-bold px-2 py-0.5 rounded-full z-10 ${
                 customerMetrics.isPositive === true ? 'text-emerald-600 bg-emerald-50' :
                 customerMetrics.isPositive === false ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100'
               }`}>{customerMetrics.growthText}</span>
            </div>
          </div>
          <div className="h-12 w-full mt-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customerMetrics.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                 <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Proposals */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div className="p-5 pb-0">
            <div className="flex items-center gap-2 mb-3">
               <Send size={16} className="text-slate-400" />
               <p className="text-sm font-medium text-slate-600">Active Proposals</p>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
               <p className="text-3xl font-black text-slate-900 tracking-tight">{activeMetrics.currentValue}</p>
               <span className={`text-xs font-bold px-2 py-0.5 rounded-full z-10 ${
                 activeMetrics.isPositive === true ? 'text-emerald-600 bg-emerald-50' :
                 activeMetrics.isPositive === false ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100'
               }`}>{activeMetrics.growthText}</span>
            </div>
          </div>
          <div className="h-12 w-full mt-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeMetrics.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                 <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Closed Won */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div className="p-5 pb-0">
            <div className="flex items-center gap-2 mb-3">
               <CheckCircle size={16} className="text-slate-400" />
               <p className="text-sm font-medium text-slate-600">Closed Won</p>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
               <p className="text-3xl font-black text-slate-900 tracking-tight">{closedMetrics.currentValue}</p>
               <span className={`text-xs font-bold px-2 py-0.5 rounded-full z-10 ${
                 closedMetrics.isPositive === true ? 'text-blue-600 bg-blue-50' :
                 closedMetrics.isPositive === false ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100'
               }`}>{closedMetrics.growthText}</span>
            </div>
          </div>
          <div className="h-12 w-full mt-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={closedMetrics.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                 <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Structured Data Table */}
      <motion.div variants={itemVariants} className="flex flex-col">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <button onClick={() => navigate('/proposals')} className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
               View all quotes <ChevronRight size={14}/>
            </button>
         </div>
         
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           {recentProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                 <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 mb-4 shadow-sm">
                    <FileText size={28} />
                 </div>
                 <h3 className="text-sm font-bold text-slate-900 mb-1">No Active Proposals</h3>
                 <p className="text-xs font-medium text-slate-500 mb-6">Generate your first quote to see activity here.</p>
                 <button onClick={() => navigate('/proposals?action=new')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none">
                    Create Proposal
                 </button>
              </div>
           ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left bg-white">
                 <thead>
                    <tr className="bg-slate-50 text-xs uppercase font-black tracking-widest text-slate-400 border-b border-slate-200">
                       <th className="p-4 px-6">Client / Project</th>
                       <th className="p-4 px-6">Date</th>
                       <th className="p-4 px-6">Owner</th>
                       <th className="p-4 px-6 text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {recentProposals.map((proposal) => {
                       let badgeClasses = "bg-slate-100 text-slate-600 border-slate-200";
                       if (proposal.status === 'Sent') badgeClasses = "bg-blue-50 text-blue-700 border-blue-200";
                       if (proposal.status === 'Approved') badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
   
                       return (
                          <tr 
                             key={proposal.id} 
                             onClick={() => navigate('/proposals')}
                             className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                             <td className="p-4 px-6">
                                <div className="font-bold text-slate-900">{proposal.customer || 'Unknown Customer'}</div>
                                <div className="text-xs font-medium text-slate-500 mt-0.5" title={proposal.proposal_number ? `Legacy ID: ${proposal.id}` : ''}>
                                   {formatQuoteId(proposal)}
                                </div>
                             </td>
                             <td className="p-4 px-6">
                                <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                   <Clock size={14} className="text-slate-400 group-hover:text-primary-500 transition-colors"/> 
                                   {new Date(proposal.updated_at || proposal.created_at).toLocaleDateString()}
                                </div>
                             </td>
                             <td className="p-4 px-6">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {(proposal.user_profiles?.full_name?.substring(0,1) || 'S').toUpperCase()}
                                   </div>
                                   <span className="text-sm font-bold text-slate-700 truncate">{proposal.user_profiles?.full_name || 'System'}</span>
                                </div>
                             </td>
                             <td className="p-4 px-6 text-right">
                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClasses}`}>
                                   {proposal.status || 'Draft'}
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
    </motion.div>
  );
}
