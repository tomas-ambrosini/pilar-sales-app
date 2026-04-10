import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Send, CheckCircle, Clock, ChevronRight, FileText, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCustomers } from '../context/CustomerContext';
import { useProposals } from '../context/ProposalContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { proposals } = useProposals();

  const totalCustomers = customers ? customers.length : 0;
  const sentProposals = proposals ? proposals.filter(p => p.status === 'Sent').length : 0;
  const approvedProposals = proposals ? proposals.filter(p => p.status === 'Approved').length : 0;

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
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="page-container fade-in">
      {/* Header */}
      <motion.header variants={itemVariants} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1">
             Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Team'}
          </h1>
          <p className="text-slate-500 font-medium">Here's your pipeline overview for today.</p>
        </div>
        <div className="hidden sm:flex text-sm text-slate-400 font-medium bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
           {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </motion.header>

      {/* Quick Actions (Enterprise Minimal) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
         <button 
            onClick={() => navigate('/proposals?action=new')}
            className="group flex flex-col justify-between bg-slate-900 hover:bg-slate-800 text-white p-5 rounded-xl shadow-lg shadow-slate-900/10 transition-all focus:outline-none text-left border border-slate-800"
         >
            <div className="flex items-center justify-between w-full mb-6">
               <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white">
                  <Plus size={20}/>
               </div>
               <ArrowUpRight size={20} className="text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <div>
               <div className="text-lg font-bold mb-1">Generate Quote</div>
               <div className="text-sm font-medium text-slate-400">Build a new proposal and send to client</div>
            </div>
         </button>

         <button 
            onClick={() => navigate('/customers?action=new')}
            className="group flex flex-col justify-between bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-xl shadow-sm transition-all focus:outline-none text-left"
         >
            <div className="flex items-center justify-between w-full mb-6">
               <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
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

      <motion.h3 variants={itemVariants} className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
         <FileText size={16} className="text-slate-400" /> Pipeline Stats
      </motion.h3>
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div className="p-5 pb-0">
            <div className="flex items-center gap-2 mb-3">
               <Users size={16} className="text-slate-400" />
               <p className="text-sm font-medium text-slate-600">Total Customers</p>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
               <p className="text-3xl font-black text-slate-900 tracking-tight">{totalCustomers}</p>
               <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full z-10">+4.2%</span>
            </div>
          </div>
          <div className="h-12 w-full mt-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{v:10},{v:11},{v:11},{v:12},{v:14},{v:15},{v:18}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                 <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div className="p-5 pb-0">
            <div className="flex items-center gap-2 mb-3">
               <Send size={16} className="text-slate-400" />
               <p className="text-sm font-medium text-slate-600">Active Proposals</p>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
               <p className="text-3xl font-black text-slate-900 tracking-tight">{sentProposals + 1}</p>
               <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full z-10">+12.0%</span>
            </div>
          </div>
          <div className="h-12 w-full mt-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{v:2},{v:4},{v:3},{v:5},{v:6},{v:6},{v:9}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                 <Area type="monotone" dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div className="p-5 pb-0">
            <div className="flex items-center gap-2 mb-3">
               <CheckCircle size={16} className="text-slate-400" />
               <p className="text-sm font-medium text-slate-600">Closed Won</p>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
               <p className="text-3xl font-black text-slate-900 tracking-tight">{approvedProposals}</p>
               <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full z-10">+2.1%</span>
            </div>
          </div>
          <div className="h-12 w-full mt-2 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{v:1},{v:1},{v:2},{v:2},{v:3},{v:3},{v:5}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                 <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Structured Data Table */}
      <motion.div variants={itemVariants} className="flex flex-col mb-16">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <button onClick={() => navigate('/proposals')} className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
               View all quotes <ChevronRight size={14}/>
            </button>
         </div>
         
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           {recentProposals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">No recent activity. Generate a quote to get started.</div>
           ) : (
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                       <th className="p-4 px-6 font-medium">Client / Project</th>
                       <th className="p-4 px-6 font-medium">Date</th>
                       <th className="p-4 px-6 font-medium">Owner</th>
                       <th className="p-4 px-6 font-medium text-right">Status</th>
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
                                <div className="text-sm text-slate-500 mt-0.5">Quote #{proposal.id.substring(0,6).toUpperCase()}</div>
                             </td>
                             <td className="p-4 px-6">
                                <div className="text-sm text-slate-600 flex items-center gap-1.5">
                                   <Clock size={14} className="text-slate-400 group-hover:text-primary-500 transition-colors"/> 
                                   {new Date(proposal.updated_at || proposal.created_at).toLocaleDateString()}
                                </div>
                             </td>
                             <td className="p-4 px-6">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-slate-200 text-[#475569] flex items-center justify-center text-[10px] font-bold">
                                      {(proposal.user_profiles?.full_name?.substring(0,1) || 'S').toUpperCase()}
                                   </div>
                                   <span className="text-sm font-medium text-slate-700">{proposal.user_profiles?.full_name || 'System'}</span>
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
           )}
         </div>
      </motion.div>
    </motion.div>
  );
}
