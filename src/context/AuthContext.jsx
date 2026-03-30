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

    // Try to fetch custom profile (role, name) from users table
    const { data, err } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (data) {
      setUser({ ...authUser, ...data });
    } else {
      // Default fallback if no row exists in users table yet
      setUser({ ...authUser, role: 'Sales Rep', name: authUser.email.split('@')[0] });
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

  const signup = async (email, password, name, role = 'Sales Rep') => {
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
      // Create user profile in users table
      await supabase.from('users').insert([{
        id: data.user.id,
        email,
        role,
        name
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
