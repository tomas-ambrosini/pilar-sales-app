import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Send, CheckCircle, Clock } from 'lucide-react';
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

  return (
    <div className="page-container fade-in">
      {/* 1. Welcome / Hero */}
      <header className="page-header mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Team'}</h1>
          <p className="page-subtitle text-lg">Pilar Home Revenue Dashboard</p>
        </div>
      </header>

      {/* 2. Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
         <button 
            onClick={() => navigate('/customers?action=new')}
            className="group flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-primary-400 hover:bg-primary-50 text-slate-700 hover:text-primary-700 px-6 py-8 rounded-2xl shadow-sm transition-all focus:outline-none"
         >
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
               <Users size={24}/>
            </div>
            <div className="text-left">
               <div className="text-xl font-bold tracking-tight mb-0.5">+ New Customer</div>
               <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Create Profile</div>
            </div>
         </button>

         <button 
            onClick={() => navigate('/proposals?action=new')}
            className="group flex items-center justify-center gap-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-6 py-8 rounded-2xl shadow-sm transition-all focus:outline-none"
         >
            <div className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
               <Plus size={24}/>
            </div>
            <div className="text-left">
               <div className="text-xl font-bold tracking-tight mb-0.5">+ Generate Quote</div>
               <div className="text-xs font-semibold text-white/50 uppercase tracking-widest">Build Options</div>
            </div>
         </button>
      </div>

      {/* 3. KPI Cards */}
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Pipeline Stats</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex flex-shrink-0 items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Customers</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex flex-shrink-0 items-center justify-center">
            <Send size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sent Proposals</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{sentProposals}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex flex-shrink-0 items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Approved Proposals</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{approvedProposals}</p>
          </div>
        </div>
      </div>

      {/* 4. Recent Activity */}
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Quotes</h3>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {recentProposals.length === 0 ? (
           <div className="p-8 text-center text-slate-500 font-medium">
             No recent activity. Generate a quote to get started.
           </div>
        ) : (
           <div className="flex flex-col">
              {recentProposals.map((proposal, idx) => {
                 let badgeClasses = "bg-slate-100 text-slate-600";
                 if (proposal.status === 'Sent') badgeClasses = "bg-blue-50 text-blue-600";
                 if (proposal.status === 'Approved') badgeClasses = "bg-emerald-50 text-emerald-600";

                 return (
                    <div 
                      key={proposal.id} 
                      onClick={() => navigate('/proposals')}
                      className={`flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors ${idx !== recentProposals.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-800 mb-1">{proposal.customer || 'Unknown Customer'}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                             <Clock size={12}/> 
                             {new Date(proposal.updated_at || proposal.created_at).toLocaleDateString()}
                          </span>
                       </div>
                       <div>
                          <span className={`${badgeClasses} px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider`}>
                             {proposal.status || 'Draft'}
                          </span>
                       </div>
                    </div>
                 );
              })}
           </div>
        )}
      </div>

    </div>
  );
}
