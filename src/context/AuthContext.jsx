import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // onAuthStateChange automatically fires on initial load, no need to duplicate getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        fetchUserProfile(session?.user);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Try to fetch custom profile (role, full_name) from user_profiles table
    const { data, err } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (data) {
      if (data.status === 'inactive') {
        setUser(null);
        setError('Your account is currently inactive. Please contact your system administrator.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      
      let mergedAvatar = data.avatar_url || authUser?.user_metadata?.avatar_url;
      let mergedName = data.full_name || authUser?.user_metadata?.full_name;
      
      // Passively heal user_profiles so public chat UI syncs
      if ((!data.avatar_url && authUser?.user_metadata?.avatar_url) || (!data.full_name && authUser?.user_metadata?.full_name)) {
         supabase.from('user_profiles').update({ 
           avatar_url: mergedAvatar,
           full_name: mergedName 
         }).eq('id', authUser.id).then(()=>{}).catch(console.error);
      }

      setUser({ ...authUser, ...data, avatar_url: mergedAvatar, full_name: mergedName, department: data.department });
    } else {
      // In the new architecture, accounts are provisioned via Edge Functions, so a profile should always exist.
      // If it doesn't exist yet (legacy dev), simulate a safe minimal record in-memory.
      const simulatedName = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Unknown User';
      setUser({ ...authUser, role: 'SALES', full_name: simulatedName, must_change_password: false });
    }
    setIsLoading(false);
  };

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return false;
    }
    return true;
  };

  // PUBLIC SIGNUP COMPLETELY REMOVED. Accounts must be provisioned via Admin tools.

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  const contextValue = useMemo(() => ({ user, login, logout, isLoading, error }), [user, isLoading, error]);

  return (
    <AuthContext.Provider value={contextValue}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
