import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { X, UploadCloud, UserCircle, Phone, AtSign, Loader2, Image as ImageIcon, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettingsModal({ onClose }) {
  const { user } = useAuth();
  
  // Local state for profile inputs
  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    phone: '',
    avatar_url: '',
    role: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Ref for file input
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      setProfile({
        full_name: data.full_name || '',
        username: data.username || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        role: data.role || 'user'
      });
    } catch (err) {
      toast.error('Failed to load profile data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are supported');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      // Create a unique file path: user_id/timestamp.ext
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload the file to Supabase storage 'avatars' bucket
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL for the uploaded avatar
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Update local state immediately for preview
      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      toast.success('Avatar uploaded successfully!');

    } catch (error) {
      toast.error(`Upload error: ${error.message}`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username || null, // Ensure empty strings are cast to null to avoid UNIQUE constraint violation error
          phone: profile.phone,
          avatar_url: profile.avatar_url
        })
        .eq('id', user.id);

      if (error) {
        // Humanize error handling for common constraint violations
        if (error.code === '23505' && error.message.includes('username')) {
            throw new Error('That username is already taken. Please choose another.');
        }
        throw error;
      };

      toast.success('Profile updated securely!');
      
      // Delay closing to let the toast appear beautifully
      setTimeout(() => {
        onClose();
        // Since React Router doesn't auto-refresh Layout state cleanly without context hook triggers,
        // we force a rapid soft refresh so the new Avatar renders instantly on the Navbar.
        window.location.reload(); 
      }, 700);

    } catch (error) {
      toast.error(error.message || 'Failed to save profile updates.');
    } finally {
      setSaving(false);
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 modal-layout-wrapper">
      <div className="absolute -inset-10 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <UserCircle className="text-primary-600" size={20} />
            Profile Settings
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <Loader2 className="animate-spin text-primary-500" size={32} />
                <span className="text-sm font-semibold tracking-wide uppercase">Connecting...</span>
             </div>
          ) : (
            <form id="profileSettingsForm" onSubmit={handleSave} className="space-y-6">
              
              {/* Avatar Upload Zone */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed relative group overflow-hidden">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg, image/webp" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload}
                />
                
                <div className="relative">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile Preview" 
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center ring-4 ring-white shadow-md">
                      <ImageIcon className="text-slate-400" size={32} />
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div 
                    onClick={triggerFileSelect}
                    className="absolute inset-0 bg-slate-900/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin text-white" size={24} />
                    ) : (
                      <>
                        <UploadCloud className="text-white mb-1" size={20} />
                        <span className="text-[10px] font-black text-white tracking-wider">CHANGE</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center mt-4">
                  <p className="text-sm font-bold text-slate-700">Display Picture</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">JPEG or PNG. Max 5MB.</p>
                </div>
              </div>

              {/* Data Form Fields */}
              <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase mb-1.5 ml-1">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      name="full_name"
                      required
                      value={profile.full_name}
                      onChange={handleChange}
                      placeholder="e.g. Walter Ormazabal"
                      className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase mb-1.5 ml-1">
                           <Mail size={12} className="text-slate-400"/>
                           Email Address
                        </label>
                        <input 
                          type="email" 
                          disabled
                          value={user?.email || ''}
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed shadow-inner" 
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase mb-1.5 ml-1">
                           <Shield size={12} className="text-slate-400"/>
                           Account Role
                        </label>
                        <input 
                          type="text" 
                          disabled
                          value={profile.role ? profile.role.toUpperCase() : 'USER'}
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed shadow-inner" 
                        />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase mb-1.5 ml-1">
                           <AtSign size={12} className="text-slate-400"/>
                           Username
                        </label>
                        <input 
                          type="text" 
                          name="username"
                          value={profile.username}
                          onChange={handleChange}
                          placeholder="@optional"
                          className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase mb-1.5 ml-1">
                           <Phone size={12} className="text-slate-400"/>
                           Phone Number
                        </label>
                        <input 
                          type="tel" 
                          name="phone"
                          value={profile.phone}
                          onChange={handleChange}
                          placeholder="(555) 123-4567"
                          className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" 
                        />
                      </div>
                  </div>
              </div>
              
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
           <button 
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
           >
              Cancel
           </button>
           <button 
              form="profileSettingsForm"
              type="submit"
              disabled={saving || uploading || loading}
              className="px-6 py-2.5 text-sm font-black tracking-wide text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-md shadow-primary-500/20 disabled:opacity-50 flex items-center gap-2"
           >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> SAVING...</>
              ) : 'SAVE CHANGES'}
           </button>
        </div>

      </div>
    </div>
  , document.body) : null;
}
