import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, FileText, DollarSign, Activity, FileCheck, ArrowRight, BookOpen } from 'lucide-react';
import { useCustomers } from '../context/CustomerContext';
import { useProposals } from '../context/ProposalContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { proposals } = useProposals();

  // Calculations
  const activeProposals = proposals.filter(p => p.status !== 'rejected');
  const totalPipelineValue = activeProposals.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  
  const recentCustomers = [...customers].sort((a,b) => new Date(b.created_at || b.addedDate) - new Date(a.created_at || a.addedDate)).slice(0, 4);
  const recentProposals = [...proposals].sort((a,b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)).slice(0, 4);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-full font-sans pb-12 w-full max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10 mt-4">
        <motion.h1 
           initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} 
           className="text-4xl lg:text-5xl font-light text-slate-800 tracking-tight"
        >
          Welcome back, <span className="font-bold text-[#2A9D8F]">{user?.name || 'Commander'}</span>
        </motion.h1>
        <motion.p 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
           className="text-slate-500 mt-3 font-medium text-lg"
        >
          Here is your live Pilar Home pipeline overview.
        </motion.p>
      </header>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants} initial="hidden" animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <DollarSign size={100} />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#2A9D8F]/10 text-[#2A9D8F] p-3 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Total Pipeline Value</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800">${totalPipelineValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</h2>
          <div className="mt-auto pt-6 text-xs font-bold text-success-600 flex items-center gap-1.5 uppercase tracking-wide">
             <Activity size={16} /> Active Deals
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <FileText size={100} />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500/10 text-blue-600 p-3 rounded-2xl">
              <FileCheck size={24} />
            </div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Active Proposals</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800">{activeProposals.length}</h2>
          <div className="mt-auto pt-6 text-xs font-bold text-blue-600 flex items-center gap-1.5 uppercase tracking-wide">
             Awaiting signatures
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <Users size={100} />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-500/10 text-purple-600 p-3 rounded-2xl">
              <Users size={24} />
            </div>
            <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Total Customers</span>
          </div>
          <h2 className="text-4xl font-black text-slate-800">{customers.length}</h2>
          <div className="mt-auto pt-6 text-xs font-bold text-purple-600 flex items-center gap-1.5 uppercase tracking-wide">
             In CRM Database
          </div>
        </motion.div>

        {/* Quick Actions Card */}
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-[#2A9D8F] to-teal-900 p-6 rounded-3xl shadow-lg border border-teal-700 flex flex-col text-white relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12">
            <BookOpen size={160} />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="bg-white/20 text-white p-3 rounded-2xl backdrop-blur-sm">
               <Activity size={24} />
             </div>
             <h3 className="font-bold uppercase tracking-wider text-xs opacity-90">Quick Actions</h3>
          </div>
          <div className="space-y-3 relative z-10 font-bold mt-auto">
             <Link to="/proposals" className="flex items-center justify-between bg-white/10 hover:bg-white/20 px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] backdrop-blur-sm border border-white/10">
               <span>New Estimate</span>
               <ArrowRight size={18} />
             </Link>
             <Link to="/customers" className="flex items-center justify-between bg-white/10 hover:bg-white/20 px-5 py-4 rounded-2xl transition-all hover:scale-[1.02] backdrop-blur-sm border border-white/10">
               <span>Add Customer</span>
               <ArrowRight size={18} />
             </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Lower Section Grid */}
      <motion.div 
        variants={containerVariants} initial="hidden" animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Recent Customers */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-black text-slate-800 tracking-tight text-lg">Recent Leads</h3>
             <Link to="/customers" className="text-sm font-bold text-[#2A9D8F] hover:underline bg-[#2A9D8F]/10 px-4 py-1.5 rounded-full">View All</Link>
          </div>
          <div className="divide-y divide-slate-100">
             {recentCustomers.length > 0 ? recentCustomers.map((c, idx) => (
               <div key={c.id || idx} className="p-6 px-8 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                 <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center font-black text-slate-600 shrink-0 shadow-inner text-lg transform group-hover:scale-110 transition-transform">
                     {c.name.charAt(0)}
                   </div>
                   <div>
                     <p className="font-bold text-slate-800 text-lg">{c.name}</p>
                     <p className="text-sm font-medium text-slate-400 mt-0.5">{c.address || 'No address provided'}</p>
                   </div>
                 </div>
                 {c.tags && c.tags.length > 0 && (
                   <span className="hidden sm:inline-block bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-200">
                     {c.tags[0]}
                   </span>
                 )}
               </div>
             )) : (
               <div className="p-16 text-center text-slate-400 font-medium">No CRM entries yet</div>
             )}
          </div>
        </motion.div>

        {/* Recent Proposals */}
        <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-black text-slate-800 tracking-tight text-lg">Latest Estimates</h3>
             <Link to="/proposals" className="text-sm font-bold text-[#2A9D8F] hover:underline bg-[#2A9D8F]/10 px-4 py-1.5 rounded-full">View All</Link>
          </div>
          <div className="divide-y divide-slate-100">
             {recentProposals.length > 0 ? recentProposals.map((p, idx) => {
               const customer = customers.find(c => c.id === p.customerId || c.name === p.customer);
               return (
                 <div key={p.id || idx} className="p-6 px-8 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                   <div className="flex items-center gap-5">
                     <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 text-blue-500 flex items-center justify-center shrink-0 shadow-inner transform group-hover:scale-110 transition-transform">
                       <FileText size={22} />
                     </div>
                     <div>
                       <p className="font-bold text-slate-800 text-lg">{customer?.name || p.customer || 'Unknown Customer'}</p>
                       <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-widest">{p.status}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="font-black text-slate-800 text-xl">${parseFloat(p.amount).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p>
                     <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{new Date(p.date || p.created_at).toLocaleDateString()}</p>
                   </div>
                 </div>
               )
             }) : (
               <div className="p-16 text-center text-slate-400 font-medium">No active proposals</div>
             )}
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
}
