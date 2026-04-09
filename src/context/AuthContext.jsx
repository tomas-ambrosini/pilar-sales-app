import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserProfile(session?.user);
    });

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
         }).eq('id', authUser.id).then(()=>{});
      }

      setUser({ ...authUser, ...data, avatar_url: mergedAvatar, full_name: mergedName });
    } else {
      // In the new architecture, accounts are provisioned via Edge Functions, so a profile should always exist.
      // If it doesn't exist yet (legacy dev), simulate a safe minimal record in-memory.
      setUser({ ...authUser, role: 'SALES', must_change_password: false });
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
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
