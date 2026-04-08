import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FirstSetup() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(user?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
       setError("Passwords do not match.");
       return;
    }
    if (password.length < 8) {
       setError("Password must be at least 8 characters long.");
       return;
    }
    if (!displayName.trim()) {
       setError("Display name is required.");
       return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Update Password in Auth System
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      // 2. Update Profile & Clear Flag
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
           full_name: displayName,
           must_change_password: false 
        })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

      toast.success("Account secured successfully!");
      // Since AuthContext listens to auth state/updates, we might need to force a reload 
      // or we can just window.location.reload() to kick them into the normal app router.
      window.location.href = '/';
      
    } catch (err) {
      setError(err.message || "Failed to secure account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} />
           </div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Secure Your Account</h2>
           <p className="text-slate-500 text-sm font-medium">Welcome to Pilar Home! Please choose a new password and confirm your display name before proceeding.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {error && (
             <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
             </div>
           )}
           
           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase">Display Name</label>
             <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-bold text-slate-700"
                  required
                />
             </div>
           </div>

           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
             <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-bold text-slate-700"
                  required
                  placeholder="Minimum 8 characters"
                />
             </div>
           </div>

           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</label>
             <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-bold text-slate-700"
                  required
                />
             </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {loading ? 'Securing...' : 'Save & Enter Pilar Home'} {!loading && <ArrowRight size={18} />}
           </button>
        </form>
      </div>
    </div>
  );
}
