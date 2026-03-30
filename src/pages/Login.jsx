import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle, User, Shield } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { login, signup, isLoading, error } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Sales Rep');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (isSignUp) {
      if (!name) return;
      await signup(email, password, name, role);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container glass-panel">
        <div className="login-header">
          <div className="login-logo">
            <div className="brand-logo-large" style={{ background: 'var(--color-primary-900)' }}>P</div>
          </div>
          <h1 className="login-title">Pilar <span className="text-gradient">Home</span></h1>
          <p className="login-subtitle">Home Services Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {isSignUp && (
            <>
              <div className="input-group fade-in">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input 
                    id="name"
                    type="text" 
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              <div className="input-group fade-in">
                <label htmlFor="role">Account Role</label>
                <div className="input-wrapper">
                  <Shield size={18} className="input-icon" />
                  <select 
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isLoading}
                    className="w-full"
                    style={{ paddingLeft: '2.5rem', background: 'transparent', border: 'none', outline: 'none' }}
                  >
                    <option value="Sales Rep">Sales Rep</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input 
                id="email"
                type="email" 
                placeholder="user@pilarservices.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <div className="flex justify-between w-full">
              <label htmlFor="password">Password</label>
              {!isSignUp && <a href="#" className="forgot-link">Forgot?</a>}
            </div>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input 
                id="password"
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={`login-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || !email || !password || (isSignUp && !name)}
          >
            {isLoading ? (
              <span className="spinner"></span>
            ) : (
              <>{isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="login-footer mt-4 text-center">
           <button 
             type="button"
             className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-fast"
             onClick={() => setIsSignUp(!isSignUp)}
           >
             {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
           </button>
        </div>
      </div>
    </div>
  );
}
