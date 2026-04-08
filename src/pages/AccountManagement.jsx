import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, UserX, UserCheck, Key, Plus, Lock, Search } from 'lucide-react';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    fetchUsers();
  }, []);

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
     try {
        const { data, error } = await supabase.functions.invoke('admin-action', {
           body: { action, payload }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data;
     } catch (e) {
        throw e;
     }
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

  const handleUpdateStatusRole = async (targetUser, newRole, newStatus) => {
     if (targetUser.id === user.id && newStatus === 'inactive') {
        toast.error("You cannot deactivate yourself.");
        return;
     }
     
     try {
       toast.loading('Updating account...', { id: 'update' });
       await invokeAdminAction('updateUser', { targetUserId: targetUser.id, role: newRole, status: newStatus });
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
    <div className="page-container fade-in">
      <header className="page-header mb-8">
        <div>
          <h1 className="page-title">Internal Security & Access</h1>
          <p className="page-subtitle">Manage company access, roles, and employee credentials.</p>
        </div>
        <button className="primary-action-btn flex items-center justify-center gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Provision New Account
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                  type="text" 
                  placeholder="Search by name, username, or email..." 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                     <th className="px-6 py-4">Role</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Security</th>
                     <th className="px-6 py-4">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     <tr><td colSpan="5" className="text-center py-12">Loading accounts...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                     <tr><td colSpan="5" className="text-center py-12">No users found.</td></tr>
                  ) : (
                     filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="font-bold text-slate-800">{u.full_name || 'System User'}</div>
                              <div className="font-mono text-xs text-slate-400 mt-1">{u.username || u.email || 'No login bound'}</div>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 text-[10px] font-black tracking-widest uppercase rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                 {u.role === 'ADMIN' ? <Shield size={10} className="inline mr-1"/> : null}
                                 {u.role}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              {u.status === 'active' ? (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><UserCheck size={14}/> Active</span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-danger-600"><UserX size={14}/> Inactive</span>
                              )}
                           </td>
                           <td className="px-6 py-4 font-mono text-xs text-slate-500">
                              {u.must_change_password ? <span className="text-amber-500 font-bold">Pending Setup</span> : 'Secured'}
                           </td>
                           <td className="px-6 py-4 flex items-center gap-3">
                              <button onClick={() => setShowEditModal(u)} className="text-primary-600 hover:text-primary-800 font-bold text-xs transition-colors">Manage</button>
                              <button onClick={() => setShowResetModal(u)} className="text-slate-400 hover:text-amber-600 transition-colors" title="Force Password Reset"><Key size={16}/></button>
                           </td>
                        </tr>
                     ))
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
                        <select name="role" className="w-full border rounded p-2 text-sm font-bold">
                           <option value="SALES">SALES</option>
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
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
               <h3 className="text-xl font-black text-slate-800 mb-6 border-b pb-2">Manage {showEditModal.full_name}</h3>
               <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  handleUpdateStatusRole(showEditModal, fd.get('role'), fd.get('status'));
               }} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Account Role</label>
                     <select name="role" defaultValue={showEditModal.role} className="w-full border rounded p-2 text-sm font-bold">
                        <option value="SALES">SALES</option>
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
