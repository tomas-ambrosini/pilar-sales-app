import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FirstSetup() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    try {
      setLoading(true);
      setError(null);

      // 1. Update Password in Auth System (Using direct fetch to bypass SDK "Auth session missing" bug)
      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
         // Fallback to localStorage directly if SDK memory is wiped
         try {
            const tokenStr = localStorage.getItem('sb-rwzyejhpjayxpebxrybe-auth-token');
            if (tokenStr) {
               accessToken = JSON.parse(tokenStr).access_token;
            }
         } catch(e) {}
      }

      if (!accessToken) {
         throw new Error("Unable to read session token. Please ensure cookies/local storage are enabled, then refresh the page.");
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rwzyejhpjayxpebxrybe.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

      const passUpdateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey
         },
         body: JSON.stringify({ password })
      });

      if (!passUpdateRes.ok) {
         const passErrData = await passUpdateRes.json();
         throw new Error(passErrData.msg || passErrData.message || "Failed to update password");
      }
      try {
         // Users can update their own profile flag
         const { error: profileError } = await supabase.from('user_profiles')
            .update({ must_change_password: false })
            .eq('id', user.id);
            
         if (profileError) throw profileError;
         
      } catch (profileErr) {
         console.warn("Could not clear setup flag directly:", profileErr.message);
         // Fallback: the user successfully updated password, but RLS/Edge failed.
         // We'll bypass the prompt locally so they aren't stuck in a loop.
         localStorage.setItem(`setup_complete_${user.id}`, 'true');
      }

      toast.success("Account secured successfully!");
      window.location.href = '/';
      
    } catch (err) {
      const errMsg = err.message || "Failed to secure account.";
      setError(errMsg);
      
      // Handle zombie sessions (where server session was deleted e.g., by admin reset, but browser kept old JWT)
      if (errMsg.includes('Session from session_id claim in JWT does not exist') || errMsg.includes('Auth session missing')) {
         toast.error("Your session has expired. Please log in again.");
         await supabase.auth.signOut();
         window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
     await supabase.auth.signOut();
     window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} />
           </div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Secure Your Account</h2>
           <p className="text-slate-500 text-sm font-medium">Welcome to Pilar Home! Please choose a new password before proceeding.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {error && (
             <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
             </div>
           )}

           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
             <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-bold text-slate-700"
                  required
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
             </div>
           </div>

           <div className="space-y-1">
             <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</label>
             <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-bold text-slate-700"
                  required
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
             </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-slate-200 mt-2"
           >
             {loading ? 'Securing Account...' : 'Save & Enter Pilar Home'} <ArrowRight size={18} />
           </button>

           <button
             type="button"
             onClick={handleSignOut}
             className="w-full text-slate-500 hover:text-slate-700 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors mt-4"
           >
             <LogOut size={16} /> Sign out and try again
           </button>
        </form>
      </div>
    </div>
  );
}
