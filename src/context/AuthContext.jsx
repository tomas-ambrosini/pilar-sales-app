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
      setUser({ ...authUser, ...data });
    } else {
      // Generate fallback profile for legacy users
      const fallbackProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.email.split('@')[0],
        role: 'SALES'
      };
      
      // Auto-insert them so Realtime FKs won't fail
      await supabase.from('user_profiles').insert([fallbackProfile]);

      setUser({ ...authUser, ...fallbackProfile });
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

  const signup = async (email, password, name, role = 'SALES') => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return false;
    }

    if (data?.user) {
      // Create user profile in user_profiles table
      await supabase.from('user_profiles').insert([{
        id: data.user.id,
        email,
        role,
        full_name: name
      }]);
    }
    
    return true;
  }

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, error }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
