import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, UserX, UserCheck, Key, Plus, Lock, Search, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import UserBadges from '../components/UserBadges';
import { MANUAL_BADGE_KEYS, BADGE_REGISTRY } from '../utils/badges';

export default function AccountManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals / Overlays
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null); // holds user obj
  const [showResetModal, setShowResetModal] = useState(null);
  const [successPayload, setSuccessPayload] = useState(null);
  const [userBadgesMap, setUserBadgesMap] = useState({}); // { userId: ['star_employee', ...] }
  const [editBadges, setEditBadges] = useState([]); // badge keys being edited

  useEffect(() => {
    fetchUsers();
    fetchBadges();
  }, []);

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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    
    try {
       toast.loading('Provisioning account...', { id: 'create' });
       await invokeAdminAction('createUser', payload);
       toast.success('Account created successfully!', { id: 'create' });
       setShowCreateModal(false);
       setSuccessPayload(payload);
       fetchUsers();
    } catch (err) {
       toast.error(err.message || 'Error creating account', { id: 'create' });
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
       await invokeAdminAction('resetPassword', { targetUserId: showResetModal.id, newPassword });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-1">
            <Shield className="text-primary-600" size={28} />
            Internal Security & Access
          </h1>
          <p className="text-slate-500 font-medium">Manage company access, roles, and employee credentials.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 border border-slate-700"
        >
          <Plus size={18} /> Provision New Account
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Action Bar Inside Card */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                  type="text" 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium placeholder-slate-400 shadow-sm" 
                  placeholder="Search by name, username, or email..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 text-xs uppercase font-black tracking-widest text-slate-400 border-b border-slate-200">
                  <tr>
                     <th className="px-6 py-4">User</th>
                     <th className="px-6 py-4 text-center">Role</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-6 py-4 text-center">Security</th>
                     <th className="px-6 py-4 text-center">Actions</th>
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
                         <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                  {u.avatar_url ? (
                                     <img src={u.avatar_url} alt={u.full_name || 'User'} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm border border-slate-200 uppercase shrink-0">
                                        {(u.full_name?.charAt(0) || u.email?.charAt(0) || 'U')}
                                     </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                     <div className="font-bold text-slate-800 flex items-center flex-wrap gap-1">
                                        <span className="truncate">{u.full_name || 'System User'}</span>
                                        <UserBadges user={u} manualBadgeKeys={userBadgesMap[u.id] || []} />
                                     </div>
                                     <div className="font-mono text-xs text-slate-400 mt-0.5 truncate">{u.username || u.email || 'No login bound'}</div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                               {u.role === 'ADMIN' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase rounded-full text-white shadow-sm align-middle" style={{ background: '#001b71', border: '1px solid #001050' }}>
                                     <Shield size={11} /> ADMIN
                                  </span>
                               ) : u.role === 'MANAGER' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase rounded-full text-white shadow-sm align-middle" style={{ background: '#39b54a', border: '1px solid #2d9a3d' }}>
                                     <Shield size={11} /> MANAGER
                                  </span>
                               ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black tracking-widest uppercase rounded-full bg-white text-slate-400 align-middle border border-slate-200">
                                     SALES
                                  </span>
                               )}
                            </td>
                            <td className="px-6 py-4 text-center">
                               {u.status === 'active' ? (
                                 <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600"><UserCheck size={14}/> Active</span>
                               ) : (
                                 <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-danger-600"><UserX size={14}/> Inactive</span>
                               )}
                            </td>
                           <td className="px-6 py-4 font-mono text-xs text-slate-500 text-center">
                              {u.must_change_password ? <span className="text-amber-500 font-bold">Pending Setup</span> : 'Secured'}
                           </td>
                           <td className="px-6 py-4 text-center" style={{ verticalAlign: 'middle' }}>
                              <div className="inline-flex items-center justify-center gap-3">
                                 <button onClick={() => { setShowEditModal(u); setEditBadges(userBadgesMap[u.id] || []); }} className="text-primary-600 hover:text-primary-800 font-bold text-xs transition-colors">Manage</button>
                                 <button onClick={() => setShowResetModal(u)} className="text-slate-400 hover:text-amber-600 transition-colors" title="Force Password Reset"><Key size={16}/></button>
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

      {/* CREATE MODAL */}
      {showCreateModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
               <h3 className="text-xl font-black text-slate-800 mb-6 border-b pb-2">Provision Employee</h3>
               <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                     <input type="text" name="full_name" required className="w-full border rounded p-2 text-sm font-semibold" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Login Email (Required by Auth)</label>
                     <input type="email" name="email" required className="w-full border rounded p-2 text-sm font-semibold" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>
                     <input type="text" name="username" className="w-full border rounded p-2 text-sm font-semibold" />
                  </div>
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                        <select name="role" defaultValue="MANAGER" className="w-full border rounded p-2 text-sm font-bold">
                           <option value="SALES">SALES</option>
                           <option value="MANAGER">MANAGER</option>
                           <option value="ADMIN">ADMIN</option>
                        </select>
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-amber-600 flex items-center gap-2"><Lock size={14}/> Temporary Password</label>
                     <input type="text" name="password" required minLength="8" defaultValue="PilarTemp123!" className="w-full border rounded p-2 font-mono text-sm" />
                     <p className="text-[10px] text-slate-400 mt-1">User will be forced to change this immediately upon their first login.</p>
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
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
               <h3 className="text-xl font-black text-slate-800 mb-6 border-b pb-2">Manage {showEditModal.full_name}</h3>
               <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  const fdObj = Object.fromEntries(fd.entries());
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
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                     <input type="text" name="full_name" defaultValue={showEditModal.full_name} required className="w-full border rounded p-2 text-sm font-semibold" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>
                     <input type="text" name="username" defaultValue={showEditModal.username || ''} className="w-full border rounded p-2 text-sm font-semibold" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Account Role</label>
                     <select name="role" defaultValue={showEditModal.role} className="w-full border rounded p-2 text-sm font-bold">
                        <option value="SALES">SALES</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Network Access</label>
                     <select name="status" defaultValue={showEditModal.status} className="w-full border rounded p-2 text-sm font-bold">
                        <option value="active">Active (Permit Logins)</option>
                        <option value="inactive">Inactive (Revoke Access)</option>
                     </select>
                     {showEditModal.id === user.id && <p className="text-[10px] text-danger-500 mt-1 font-bold">Safeguard: You cannot suspend your own active session.</p>}
                  </div>

                  {/* Badge Awards Section */}
                  <div className="border-t pt-4">
                     <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Award Badges</label>
                     <div className="grid grid-cols-2 gap-2">
                        {MANUAL_BADGE_KEYS.map(key => {
                           const badge = BADGE_REGISTRY[key];
                           const isActive = editBadges.includes(key);
                           return (
                              <button
                                 key={key}
                                 type="button"
                                 onClick={() => {
                                    setEditBadges(prev =>
                                       prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                                    );
                                 }}
                                 className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                    isActive
                                       ? 'bg-slate-900 text-white border-slate-700 shadow-md ring-2 ring-offset-1 ring-slate-400'
                                       : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                                 }`}
                              >
                                 <span
                                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white [&>svg]:w-3 [&>svg]:h-3"
                                    style={{ background: badge.gradient, boxShadow: isActive ? `0 0 8px ${badge.glow}` : 'none' }}
                                    dangerouslySetInnerHTML={{ __html: badge.svg }}
                                 />
                                 <div className="text-left">
                                    <div className="leading-tight">{badge.label}</div>
                                    <div className={`text-[9px] font-medium mt-0.5 ${isActive ? 'text-slate-400' : 'text-slate-300'}`}>{badge.subtitle}</div>
                                 </div>
                              </button>
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
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border-t-8 border-amber-500">
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
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border-t-8 border-emerald-500">
               <h3 className="text-xl font-black text-slate-800 mb-2">Account Provisioned!</h3>
               <p className="text-sm text-slate-600 mb-6">Send the following secure message to the team member so they can log in.</p>
               
               <div className="relative bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs leading-relaxed text-slate-700 mb-4 whitespace-pre-wrap select-all">
{`Your Pilar Home CRM dashboard is ready.

1. Go to: crm.pilarhome.com (or your vercel link)
2. Login Email: ${successPayload.email}
3. Temp Password: ${successPayload.password}

Note: You will be forced to create a secure permanent password upon your first login.`}
               </div>
               
               <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setSuccessPayload(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Close</button>
                  <button 
                    onClick={() => {
                        const msg = `Your Pilar Home CRM dashboard is ready.\n\n1. Go to: crm.pilarhome.com (or your vercel link)\n2. Login Email: ${successPayload.email}\n3. Temp Password: ${successPayload.password}\n\nNote: You will be forced to create a secure permanent password upon your first login.`;
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
