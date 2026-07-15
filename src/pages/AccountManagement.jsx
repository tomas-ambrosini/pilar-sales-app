import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Users, Shield, UserX, UserCheck, Key, Plus, Lock, Search, Copy, Check, CheckCircle2, Clock, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import UserBadges from '../components/UserBadges';
import { MANUAL_BADGE_KEYS, BADGE_REGISTRY } from '../utils/badges';
import { formatPhoneNumber } from '../utils/formatters';

export default function AccountManagement() {
  const { user } = useAuth();
  const { canEditSystemSettings } = useRole();
  const isAdmin = canEditSystemSettings();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals / Overlays
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null); // holds user obj
  const [showResetModal, setShowResetModal] = useState(null);
  const [inspectingRequest, setInspectingRequest] = useState(null);
  const [successPayload, setSuccessPayload] = useState(null);
  const [userBadgesMap, setUserBadgesMap] = useState({}); // { userId: ['star_employee', ...] }
  const [editBadges, setEditBadges] = useState([]); // badge keys being edited
  const [createRole, setCreateRole] = useState('TECHNICIAN');
  const [createDepartment, setCreateDepartment] = useState('SERVICE');
  const [editRole, setEditRole] = useState('TECHNICIAN');
  const [editDepartment, setEditDepartment] = useState('SERVICE');

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchBadges();
    }
    fetchRequests();
  }, [isAdmin]);

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      let query = supabase
        .from('tasks')
        .select('*')
        .like('title', 'PROVISION_REQUEST:%')
        .order('created_at', { ascending: false });
      
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))];
      let nameMap = {};
      if (userIds.length > 0) {
          const { data: profs } = await supabase.from('user_profiles').select('id, full_name').in('id', userIds);
          if (profs) profs.forEach(p => nameMap[p.id] = p.full_name);
      }
      const enriched = data.map(r => ({ ...r, requester_name: nameMap[r.user_id] || 'Unknown User' }));
      setRequests(enriched || []);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase.from('user_badges').select('user_id, badge_key');
      if (error) throw error;
      const map = {};
      (data || []).forEach(row => {
        if (!map[row.user_id]) map[row.user_id] = [];
        map[row.user_id].push(row.badge_key);
      });
      setUserBadgesMap(map);
    } catch (err) {
      // Silently fail — badges are non-critical
      console.warn('Could not fetch badges:', err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      toast.error('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  const invokeAdminAction = async (action, payload) => {
    const { data, error } = await supabase.functions.invoke('admin-action', {
       body: { action, payload }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleClearSetup = async (e, targetUser) => {
     e.stopPropagation();
     try {
       const { data, error } = await supabase.functions.invoke('admin-action', {
         body: { 
           action: 'updateUser', 
           payload: { 
             targetUserId: targetUser.id, 
             role: targetUser.role,
             status: targetUser.status,
             must_change_password: false 
           } 
         }
       });
       if (error) throw error;
       if (data?.error) throw new Error(data.error);

       toast.success(`Cleared setup flag for ${targetUser.full_name}`);
       fetchUsers();
     } catch (err) {
       toast.error("Failed to clear setup flag. Ensure backend is deployed.");
     }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.username || payload.username.trim() === '') payload.username = null;
    
    try {
       toast.loading(isAdmin ? 'Provisioning account...' : 'Submitting request...', { id: 'create' });
       
       if (isAdmin) {
         await invokeAdminAction('createUser', payload);
         toast.success('Account created successfully!', { id: 'create' });
         setSuccessPayload(payload);
         fetchUsers();
       } else {
         const { error } = await supabase.from('tasks').insert({
           title: `PROVISION_REQUEST: ${payload.full_name}`,
           description: JSON.stringify(payload),
           status: 'todo',
           user_id: user.id
         });
         if (error) throw error;
         toast.success('Provisioning request submitted!', { id: 'create' });
         fetchRequests();
       }
       
       setShowCreateModal(false);
    } catch (err) {
       toast.error(err.message || 'Error processing request', { id: 'create' });
    }
  };

  const handleApproveRequest = async (req, payload) => {
    try {
      toast.loading('Approving and provisioning...', { id: 'approve' });
      await invokeAdminAction('createUser', payload);
      const { error } = await supabase.from('tasks').update({ status: 'done' }).eq('id', req.id);
      if (error) throw error;
      
      toast.success('Account provisioned successfully!', { id: 'approve' });
      fetchRequests();
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Error approving request', { id: 'approve' });
    }
  };

  const handleRejectRequest = async (req) => {
    try {
      toast.loading('Rejecting request...', { id: 'reject' });
      const { error } = await supabase.from('tasks').update({ status: 'done', title: req.title + ' [REJECTED]' }).eq('id', req.id);
      if (error) throw error;
      
      toast.success('Request rejected', { id: 'reject' });
      fetchRequests();
    } catch (err) {
      toast.error('Error rejecting request', { id: 'reject' });
    }
  };

  const handleUpdateUser = async (targetUser, fdObj) => {
     if (targetUser.id === user.id && fdObj.status === 'inactive') {
        toast.error("You cannot deactivate yourself.");
        return;
     }
     
     try {
       toast.loading('Updating account...', { id: 'update' });
       await invokeAdminAction('updateUser', { targetUserId: targetUser.id, ...fdObj });
       toast.success('Account updated!', { id: 'update' });
       setShowEditModal(null);
       fetchUsers();
     } catch (err) {
       toast.error(err.message || 'Error updating account', { id: 'update' });
     }
  };

  const handleResetPassword = async (e) => {
     e.preventDefault();
     const fd = new FormData(e.target);
     const newPassword = fd.get('tempPassword');
     
     try {
       toast.loading('Resetting password...', { id: 'reset' });
       await invokeAdminAction('updateUser', { targetUserId: showResetModal.id, password: newPassword, must_change_password: true });
       toast.success('Password flag reset successfully.', { id: 'reset' });
       setShowResetModal(null);
       fetchUsers();
     } catch (err) {
       toast.error(err.message || 'Error resetting password', { id: 'reset' });
     }
  };

  const filteredUsers = users.filter(u => {
      const q = searchTerm.toLowerCase();
      return (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center border border-primary-200/50 shadow-inner shrink-0">
             <Shield className="text-primary-600 drop-shadow-sm" size={28} />
           </div>
           <div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Internal Security & Access</h1>
             <p className="text-sm text-slate-500 font-semibold">Manage company access, roles, and employee credentials.</p>
           </div>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="group relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:scale-95 border border-slate-700 shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
          <Plus size={18} className="drop-shadow-md" /> {isAdmin ? 'Provision Account' : 'Request Account'}
        </button>
      </div>

      {/* Main Container */}
      {!isAdmin ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Clock size={16} className="text-slate-500" /> My Provisioning Requests</h2>
           </div>
           <div className="divide-y divide-slate-100">
             {loadingRequests ? (
               <div className="p-8 text-center text-slate-400 font-semibold animate-pulse">Loading requests...</div>
             ) : requests.length === 0 ? (
               <div className="p-12 text-center flex flex-col items-center">
                 <Shield className="text-slate-300 mb-3" size={32} />
                 <p className="text-slate-500 font-semibold">You have no pending or past provisioning requests.</p>
               </div>
             ) : (
               requests.map(req => {
                 let payload = {};
                 try { payload = JSON.parse(req.description || '{}'); } catch(e) {}
                 return (
                   <div key={req.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                     <div>
                       <h3 className="font-bold text-slate-900">{payload.full_name || 'Unknown'} {req.title.includes('[REJECTED]') && <span className="text-red-500 ml-2 text-[10px] uppercase font-black">(Rejected)</span>}</h3>
                       <p className="text-xs font-semibold text-slate-500 mt-0.5">{payload.role} • {payload.department}</p>
                     </div>
                     <div>
                       {req.status === 'todo' ? (
                         <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black tracking-wider uppercase border border-amber-200/50">Pending Review</span>
                       ) : (
                         <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black tracking-wider uppercase border border-emerald-200/50"><Check size={12} className="inline mr-1 -mt-0.5" /> Reviewed</span>
                       )}
                     </div>
                   </div>
                 )
               })
             )}
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Admin Pending Requests */}
          {requests.filter(r => r.status === 'todo').length > 0 && (
             <div className="border-b-4 border-slate-100">
               <div className="p-4 bg-amber-50/50 border-b border-amber-100/50 flex items-center justify-between">
                 <h2 className="text-sm font-bold text-amber-800 flex items-center gap-2"><Clock size={16} /> Pending Provisioning Requests</h2>
                 <span className="bg-amber-200 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">{requests.filter(r => r.status === 'todo').length}</span>
               </div>
               <div className="divide-y divide-slate-100 bg-white">
                 {requests.filter(r => r.status === 'todo').map(req => {
                   let payload = {};
                   try { payload = JSON.parse(req.description || '{}'); } catch(e) {}
                   return (
                     <div key={req.id} onClick={() => setInspectingRequest({ req, payload })} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{payload.full_name || 'Unknown'} <span className="text-slate-400 font-semibold text-xs ml-1">(requested by: {req.requester_name})</span></span>
                          <span className="text-xs font-semibold text-slate-500 mt-1">{payload.email || 'No email'} • {payload.role} • {payload.department}</span>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); handleApproveRequest(req, payload); }} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"><CheckCircle2 size={14} /> Approve</button>
                          <button onClick={(e) => { e.stopPropagation(); handleRejectRequest(req); }} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"><X size={14} /> Reject</button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          )}

          {/* Action Bar Inside Card */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-semibold placeholder-slate-400 shadow-sm hover:shadow-md" 
                  placeholder="Search by name, username, or email..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

         <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-200">
                  <tr>
                     <th className="px-6 py-5">Employee Details</th>
                     <th className="px-6 py-5 text-center">Contact</th>
                     <th className="px-6 py-5 text-center">Authorization Level</th>
                     <th className="px-6 py-5 text-center">Network Status</th>
                     <th className="px-6 py-5 text-center">Security</th>
                     <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     [1, 2, 3].map((i) => (
                       <tr key={i} className="animate-pulse">
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                             <div className="flex flex-col gap-1.5">
                               <div className="h-4 bg-slate-200 rounded w-24"></div>
                               <div className="h-3 bg-slate-200 rounded w-16"></div>
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
                         <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                         <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                         <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
                         <td className="px-6 py-4 text-right"><div className="h-8 bg-slate-200 rounded w-20 ml-auto"></div></td>
                       </tr>
                     ))
                  ) : filteredUsers.length === 0 ? (
                     <tr><td colSpan="5">
                       <div className="text-center py-16 flex flex-col items-center">
                         <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                           <Shield size={32} />
                         </div>
                         <h3 className="text-sm font-bold text-slate-900 mb-1">No users found</h3>
                         <p className="text-xs font-medium text-slate-500">There are no accounts matching your search.</p>
                       </div>
                     </td></tr>
                  ) : (
                     filteredUsers.map(u => {
                        return (
                         <tr key={u.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                            <td className="px-6 py-5 border-b border-slate-100">
                               <div className="flex items-center gap-4">
                                  {u.avatar_url ? (
                                     <img src={u.avatar_url} alt={u.full_name || 'User'} className="w-11 h-11 rounded-full object-cover shadow-sm ring-2 ring-white shrink-0" />
                                  ) : (
                                     <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-sm shadow-sm ring-2 ring-white uppercase shrink-0">
                                        {(u.full_name?.charAt(0) || u.email?.charAt(0) || 'U')}
                                     </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                     <div className="font-bold text-slate-900 flex items-center flex-wrap gap-2 text-[15px]">
                                        <span className="truncate group-hover:text-primary-600 transition-colors">{u.full_name || 'System User'}</span>
                                        <UserBadges user={u} manualBadgeKeys={userBadgesMap[u.id] || []} />
                                     </div>
                                     <div className="font-mono text-xs text-slate-400 mt-0.5 truncate">{u.username || u.email || 'No login bound'}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-center border-b border-slate-100 font-mono text-xs text-slate-500">
                                {u.phone ? formatPhoneNumber(u.phone) : 'No phone'}
                             </td>
                             <td className="px-6 py-5 text-center border-b border-slate-100">
                               <div className="flex flex-col items-center gap-1.5">
                                  {u.role === 'ADMIN' ? (
                                     <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
                                        <Shield size={12} className="text-indigo-500" /> ADMIN
                                     </span>
                                  ) : u.role === 'MANAGER' ? (
                                     <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                        <Shield size={12} className="text-emerald-500" /> MANAGER
                                     </span>
                                  ) : (
                                     <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-full bg-slate-50 text-slate-600 border border-slate-200 shadow-sm">
                                        {u.role || 'SALES'}
                                     </span>
                                  )}
                                  {u.department && (
                                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white border border-slate-100 px-2 py-0.5 rounded-full shadow-sm opacity-80">
                                        {u.department}
                                     </span>
                                  )}
                               </div>
                            </td>
                            <td className="px-6 py-5 text-center border-b border-slate-100">
                               {u.status === 'active' ? (
                                 <span className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100"><UserCheck size={14}/> Active</span>
                               ) : (
                                 <span className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100"><UserX size={14}/> Suspended</span>
                               )}
                            </td>
                           <td className="px-6 py-5 text-center border-b border-slate-100">
                              {u.must_change_password ? (
                                 <span className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100"><Key size={12} /> Pending Setup</span>
                              ) : (
                                 <span className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200"><Check size={12} /> Secured</span>
                              )}
                           </td>
                           <td className="px-6 py-5 text-right border-b border-slate-100" style={{ verticalAlign: 'middle' }}>
                              <div className="inline-flex items-center justify-end gap-2">
                                 {u.must_change_password && (
                                    <button onClick={(e) => handleClearSetup(e, u)} className="px-3 py-2 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 font-bold text-xs rounded-lg shadow-sm transition-all" title="Manually mark as Secured">Clear Setup</button>
                                 )}
                                 <button onClick={(e) => { e.stopPropagation(); setShowResetModal(u); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Force Password Reset"><Key size={16}/></button>
                                 <button onClick={(e) => { e.stopPropagation(); setShowEditModal(u); setEditBadges(userBadgesMap[u.id] || []); setEditRole(u.role || 'TECHNICIAN'); setEditDepartment(u.department || 'SERVICE'); }} className="px-4 py-2 bg-white border border-slate-200 hover:border-primary-300 hover:text-primary-700 text-slate-600 font-bold text-xs rounded-lg shadow-sm transition-all hover:shadow">Manage</button>
                              </div>
                           </td>
                        </tr>
                     );
                  })
                  )}
               </tbody>
            </table>
         </div>
      </div>
      )}

      {/* CREATE MODAL */}
      {/* Inspect Request Modal */}
      <AnimatePresence>
      {inspectingRequest && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-layout-wrapper">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute -inset-10 bg-slate-900/40 backdrop-blur-sm" onClick={() => setInspectingRequest(null)}></motion.div>
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
               <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 border-b border-amber-100 flex justify-between items-start">
                   <div>
                       <h3 className="text-xl font-black text-amber-900 leading-tight">Provisioning Request</h3>
                       <p className="text-xs font-bold text-amber-700/70 uppercase tracking-widest mt-1">Requested by {inspectingRequest.req.requester_name}</p>
                   </div>
                   <button onClick={() => setInspectingRequest(null)} className="text-amber-700 hover:text-amber-900 bg-amber-100/50 hover:bg-amber-200/50 p-1.5 rounded-full transition-colors"><X size={16} /></button>
               </div>
               <div className="p-6 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                          <span className="font-semibold text-slate-800">{inspectingRequest.payload.full_name}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                          <span className="font-semibold text-slate-800">{inspectingRequest.payload.email}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</span>
                          <span className="font-semibold text-slate-800">{inspectingRequest.payload.phone || 'N/A'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 mt-2">
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</span>
                              <span className="font-semibold text-slate-800">{inspectingRequest.payload.role}</span>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                              <span className="font-semibold text-slate-800">{inspectingRequest.payload.department}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                      <button onClick={() => { handleRejectRequest(inspectingRequest.req); setInspectingRequest(null); }} className="flex-1 py-3 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl transition-colors">Reject Request</button>
                      <button onClick={() => { handleApproveRequest(inspectingRequest.req, inspectingRequest.payload); setInspectingRequest(null); }} className="flex-1 py-3 font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-md hover:shadow-lg transition-all">Approve & Provision</button>
                  </div>
               </div>
            </motion.div>
         </div>
      )}
      </AnimatePresence>

      {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 modal-layout-wrapper">
            <div className="absolute -inset-10 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
               <h3 className="text-xl font-black text-slate-800 mb-6 border-b pb-2">Provision Employee</h3>
               <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                        <input type="text" name="full_name" required className="w-full border rounded p-2 text-sm font-semibold" />
                     </div>
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Login Email (Required by Auth)</label>
                        <input type="email" name="email" required className="w-full border rounded p-2 text-sm font-semibold" />
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>
                        <input type="text" name="username" className="w-full border rounded p-2 text-sm font-semibold" />
                     </div>
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                        <input type="tel" name="phone" onChange={(e) => e.target.value = formatPhoneNumber(e.target.value)} className="w-full border rounded p-2 text-sm font-semibold" placeholder="(555) 555-5555" />
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                        <select name="role" value={createRole} onChange={(e) => setCreateRole(e.target.value)} className="w-full border rounded p-2 text-sm font-bold">
                           <option value="ADMIN">SUPER_ADMIN (Root Access)</option>
                           <option value="MANAGER">DIRECTOR (Dept Head)</option>
                           <option value="MANAGER">MANAGER (Team Lead)</option>
                           <option value="DISPATCHER">COORDINATOR (Desk Worker)</option>
                           <option value="TECHNICIAN">FIELD_WORKER (Tech/Install)</option>
                        </select>
                     </div>
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                        <select name="department" value={createDepartment} onChange={(e) => setCreateDepartment(e.target.value)} className="w-full border rounded p-2 text-sm font-bold">
                           <option value="EXECUTIVE">EXECUTIVE</option>
                           <option value="ADMINISTRATION">ADMINISTRATION</option>
                           <option value="FINANCE">FINANCE</option>
                           <option value="SALES">SALES</option>
                           <option value="INSIDE_SALES">INSIDE_SALES</option>
                           <option value="DISPATCH">DISPATCH</option>
                           <option value="SERVICE">SERVICE</option>
                           <option value="INSTALL">INSTALL</option>
                           <option value="SUBCONTRACTOR">SUBCONTRACTOR</option>
                        </select>
                     </div>
                  </div>
                  {createDepartment === 'SUBCONTRACTOR' && (
                     <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                        <input type="text" name="subcontractor_company" required className="w-full border rounded p-2 text-sm font-semibold" placeholder="e.g. AA Mechanical Group" />
                     </div>
                  )}
                  <div>
                     <label className="text-xs font-bold text-amber-600 flex items-center gap-2"><Lock size={14}/> Temporary Password</label>
                     <input type="text" name="password" required defaultValue="PilarTemp123!" className="w-full border rounded p-2 text-sm font-bold bg-amber-50" />
                     <p className="text-[10px] text-slate-400 mt-1">User will be forced to change this upon their first login.</p>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t">
                     <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold">Create Account</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* EDIT MODAL */}
       {showEditModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 modal-layout-wrapper">
            <div className="absolute -inset-10 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
               <h3 className="text-xl font-black text-slate-800 mb-6 border-b pb-2">Edit Access & Badges</h3>
               <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  const fdObj = Object.fromEntries(fd.entries());
                  if (!fdObj.username || fdObj.username.trim() === '') fdObj.username = null;
                  await handleUpdateUser(showEditModal, fdObj);

                  // Sync badges
                  try {
                     const currentBadges = userBadgesMap[showEditModal.id] || [];
                     const toAdd = editBadges.filter(b => !currentBadges.includes(b));
                     const toRemove = currentBadges.filter(b => !editBadges.includes(b));

                     for (const key of toAdd) {
                        await supabase.from('user_badges').upsert({ user_id: showEditModal.id, badge_key: key, awarded_by: user.id });
                     }
                     for (const key of toRemove) {
                        await supabase.from('user_badges').delete().eq('user_id', showEditModal.id).eq('badge_key', key);
                     }
                     fetchBadges();
                  } catch (err) {
                     console.error('Badge sync error:', err);
                  }
               }} className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                        <input type="text" name="full_name" defaultValue={showEditModal.full_name} required className="w-full border rounded p-2 text-sm font-semibold" />
                     </div>
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                        <input type="text" readOnly value={showEditModal.email || 'No email bound'} className="w-full border rounded p-2 text-sm font-semibold bg-slate-50 text-slate-500 cursor-not-allowed" />
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>
                        <input type="text" name="username" defaultValue={showEditModal.username || ''} className="w-full border rounded p-2 text-sm font-semibold" />
                     </div>
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                        <input type="tel" name="phone" defaultValue={showEditModal.phone || ''} onChange={(e) => e.target.value = formatPhoneNumber(e.target.value)} className="w-full border rounded p-2 text-sm font-semibold" placeholder="(555) 555-5555" />
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Account Role</label>
                        <select name="role" value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full border rounded p-2 text-sm font-bold">
                           <option value="ADMIN">SUPER_ADMIN (Root Access)</option>
                           <option value="MANAGER">DIRECTOR (Dept Head)</option>
                           <option value="MANAGER">MANAGER (Team Lead)</option>
                           <option value="DISPATCHER">COORDINATOR (Desk Worker)</option>
                           <option value="TECHNICIAN">FIELD_WORKER (Tech/Install)</option>
                           {!['ADMIN', 'MANAGER', 'DISPATCHER', 'TECHNICIAN', 'SALES', 'SUBCONTRACTOR', 'SUPER_ADMIN', 'DIRECTOR', 'COORDINATOR', 'FIELD_WORKER'].includes(editRole) && (
                               <option value={editRole}>{editRole}</option>
                           )}
                        </select>
                     </div>
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                        <select name="department" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} className="w-full border rounded p-2 text-sm font-bold">
                           <option value="EXECUTIVE">EXECUTIVE</option>
                           <option value="ADMINISTRATION">ADMINISTRATION</option>
                           <option value="FINANCE">FINANCE</option>
                           <option value="SALES">SALES</option>
                           <option value="INSIDE_SALES">INSIDE_SALES</option>
                           <option value="DISPATCH">DISPATCH</option>
                           <option value="SERVICE">SERVICE</option>
                           <option value="INSTALL">INSTALL</option>
                           <option value="SUBCONTRACTOR">SUBCONTRACTOR</option>
                        </select>
                     </div>
                  </div>
                  {editDepartment === 'SUBCONTRACTOR' && (
                     <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                        <input type="text" name="subcontractor_company" defaultValue={showEditModal.subcontractor_company || ''} required className="w-full border rounded p-2 text-sm font-semibold" placeholder="e.g. AA Mechanical Group" />
                     </div>
                  )}
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Network Access</label>
                     <select name="status" defaultValue={showEditModal.status} className="w-full border rounded p-2 text-sm font-bold">
                        <option value="active">Active (Permit Logins)</option>
                        <option value="inactive">Inactive (Revoke Access)</option>
                     </select>
                     {showEditModal.id === user.id && <p className="text-[10px] text-danger-500 mt-1 font-bold">Safeguard: You cannot suspend your own active session.</p>}
                  </div>

                  {/* Badge Awards Section */}
                  <div className="border-t pt-6 mt-6">
                     <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-black text-slate-800 uppercase tracking-widest">Honorary Badges</label>
                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full">{editBadges.length} Selected</span>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {MANUAL_BADGE_KEYS.map(key => {
                           const badge = BADGE_REGISTRY[key];
                           const isActive = editBadges.includes(key);
                           return (
                              <motion.button
                                 key={key}
                                 type="button"
                                 whileHover={{ scale: 1.02 }}
                                 whileTap={{ scale: 0.98 }}
                                 onClick={() => {
                                    setEditBadges(prev =>
                                       prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                    );
                                 }}
                                 className={`relative overflow-hidden flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border text-left transition-all duration-300 group ${
                                    isActive
                                       ? 'shadow-lg border-transparent ring-2 ring-offset-2'
                                       : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:shadow-md'
                                 }`}
                                 style={{ 
                                    background: isActive ? badge.gradient : undefined,
                                    color: isActive ? 'white' : undefined,
                                    boxShadow: isActive ? `0 8px 20px -4px ${badge.glow}` : undefined,
                                    borderColor: isActive ? 'transparent' : undefined,
                                    '--tw-ring-color': isActive ? badge.glow : undefined
                                 }}
                              >
                                 {/* Dark overlay to ensure text contrast on light gradients */}
                                 {isActive && <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>}
                                 
                                 <div
                                    className={`relative z-10 shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 [&>svg]:w-5 [&>svg]:h-5 ${
                                       isActive 
                                       ? 'bg-white text-slate-900 shadow-xl scale-110' 
                                       : 'text-white group-hover:scale-110'
                                    }`}
                                    style={{ 
                                        background: !isActive ? badge.gradient : undefined,
                                        boxShadow: !isActive ? `0 4px 12px ${badge.glow}` : undefined 
                                    }}
                                    dangerouslySetInnerHTML={{ __html: badge.svg }}
                                 />
                                 <div className="relative z-10 min-w-0 pr-6">
                                    <div className={`font-black text-sm tracking-tight truncate ${isActive ? 'text-white drop-shadow-sm' : 'text-slate-700'}`}>{badge.label}</div>
                                    <div className={`text-[9px] font-bold uppercase tracking-widest truncate mt-0.5 ${isActive ? 'text-white/90 drop-shadow-sm' : 'text-slate-400'}`}>{badge.subtitle}</div>
                                 </div>
                                 
                                 {/* Checkmark overlay for active state */}
                                 <AnimatePresence>
                                     {isActive && (
                                         <motion.div 
                                             initial={{ scale: 0, opacity: 0 }}
                                             animate={{ scale: 1, opacity: 1 }}
                                             exit={{ scale: 0, opacity: 0 }}
                                             transition={{ type: "spring", bounce: 0.5 }}
                                             className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm border border-white/20"
                                         >
                                             <Check size={14} className="text-white drop-shadow-sm" />
                                         </motion.div>
                                     )}
                                 </AnimatePresence>
                              </motion.button>
                           );
                        })}
                     </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                     <button type="button" onClick={() => setShowEditModal(null)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-bold">Enforce Setting</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 modal-layout-wrapper">
            <div className="absolute -inset-10 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowResetModal(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border-t-8 border-amber-500">
               <h3 className="text-lg font-black text-slate-800 mb-2">Force Auth Reset</h3>
               <p className="text-xs text-slate-500 font-medium mb-6">This will scramble the user's password and force them through the First Setup wall on their next login attempt.</p>
               <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-amber-600 uppercase">Issue Temporary Key</label>
                     <input type="text" name="tempPassword" required minLength="8" defaultValue="PilarTemp123!" className="w-full border rounded p-2 text-sm font-mono mt-1" />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                     <button type="button" onClick={() => setShowResetModal(null)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded text-sm font-bold hover:bg-amber-600">Issue Reset</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* SUCCESS MODAL (ONBOARDING MESSAGE) */}
      {successPayload && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 modal-layout-wrapper">
            <div className="absolute -inset-10 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSuccessPayload(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border-t-8 border-emerald-500">
               <h3 className="text-xl font-black text-slate-800 mb-2">Account Provisioned!</h3>
               <p className="text-sm text-slate-600 mb-6">Send the following secure message to the team member so they can log in.</p>
               
               <div className="relative bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs leading-relaxed text-slate-700 mb-4 whitespace-pre-wrap select-all">
{`Your Lotarri dashboard is ready.

1. Go to: lotarri.com
2. Login Email: ${successPayload.email}
3. Temp Password: ${successPayload.password}

Note: You will be forced to create a secure permanent password upon your first login.`}
               </div>
               
               <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setSuccessPayload(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Close</button>
                  <button 
                    onClick={() => {
                        const msg = `Your Lotarri dashboard is ready.\n\n1. Go to: lotarri.com\n2. Login Email: ${successPayload.email}\n3. Temp Password: ${successPayload.password}\n\nNote: You will be forced to create a secure permanent password upon your first login.`;
                        navigator.clipboard.writeText(msg);
                        toast.success('Message copied to clipboard!');
                    }} 
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                  >
                     <Copy size={14} /> Copy Message
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
