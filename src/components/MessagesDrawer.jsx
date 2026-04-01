import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, MessageSquare, X, ArrowLeft, Plus, Lock, User, Edit2, Trash2, Reply, Paperclip, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './MessagesDrawer.css';

export default function MessagesDrawer({ isOpen, onClose, forceChannel, onClearForceChannel }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [dbError, setDbError] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [replyingToMsg, setReplyingToMsg] = useState(null);
  const messagesEndRef = useRef(null);
  const [viewState, setViewState] = useState('channels'); // 'channels', 'chat', 'create-channel', 'create-dm'
  const [unreadCounts, setUnreadCounts] = useState({});
  const [mentionPopup, setMentionPopup] = useState({ show: false, query: '', index: 0 });
  const inputRef = useRef(null);
  const activeChannelRef = useRef(activeChannelId);
  const [allUsers, setAllUsers] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);
  
  // Phase 5 Attachment States
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const hiddenFileInput = useRef(null);

  // Generate a deterministic gradient for an avatar based on a string (name)
  const getAvatarGradient = (name) => {
    if (!name) return 'linear-gradient(135deg, #94a3b8, #cbd5e1)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Keeping colors warm, blue-ish, but not excessively bright (saturation 45-55%, lightness 40-50%)
    const hue = Math.abs(hash % 40) + 190; // Hue between 190 (cyan/blue) and 230 (indigo/blue)
    const hue2 = hue + 20;
    return `linear-gradient(135deg, hsl(${hue}, 55%, 50%), hsl(${hue2}, 45%, 40%))`;
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchInitialData = async () => {
      // Fetch Channels
      const { data: channelData, error: channelError } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');
      
      if (!channelError && channelData) {
        setChannels(channelData);
        if (!activeChannelId && channelData.length > 0) {
          const general = channelData.find(c => c.name === 'general');
          setActiveChannelId(general ? general.id : channelData[0].id);
        }

        if (user?.id) {
          // Ensure user exists physically in channel_members for public channels so Unread Notifications trigger properly
          const publicChannelsRaw = channelData.filter(c => !c.is_private).map(c => ({
            channel_id: c.id,
            user_id: user.id
          }));
          if (publicChannelsRaw.length > 0) {
            await supabase.from('channel_members').upsert(publicChannelsRaw, { onConflict: 'channel_id,user_id', ignoreDuplicates: true });
          }
        }

      } else if (channelError) {
        console.error("Error fetching channels", channelError);
        setDbError(channelError?.code === '42P01' ? 'The chat tables have not been created yet.' : channelError?.message);
      }

      // Fetch All Users for DM creation & Mentions
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (!usersError && usersData) {
        setAllUsers(usersData.filter(u => u.id !== user?.id)); // exclude self
      }

      // Fetch Unread Counts via RPC
      if (user?.id) {
        const { data: unreadData, error: unreadError } = await supabase.rpc('get_unread_counts', { p_user_id: user.id });
        if (!unreadError && unreadData) {
          const counts = {};
          unreadData.forEach(row => {
            counts[row.channel_id] = parseInt(row.unread_count);
          });
          setUnreadCounts(counts);
        }
      }
    };
    
    fetchInitialData();
  }, [isOpen, activeChannelId, user?.id]);

  useEffect(() => {
    activeChannelRef.current = activeChannelId;
    if (activeChannelId && user?.id && isOpen) {
       // Clear Unread exactly when selecting channel
       setUnreadCounts(prev => ({ ...prev, [activeChannelId]: 0 }));
       // Mark Read in DB silently
       supabase.from('channel_members').upsert({ 
         channel_id: activeChannelId, 
         user_id: user.id,
         last_read_at: new Date().toISOString() 
       }, { onConflict: 'channel_id,user_id' }).then();
    }
  }, [activeChannelId, user?.id, isOpen]);

  useEffect(() => {
    if (!activeChannelId || !isOpen) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          user_id,
          reply_to_id,
          attachment_url,
          attachment_type,
          users (
            name,
            role
          )
        `)
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
        scrollToBottom();
      } else {
        console.error("Error fetching messages", error);
      }
    };

    fetchMessages();

    const globalChannelListener = supabase.channel(`chat_update_${activeChannelId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          console.log("🔥 REALTIME WEBSOCKET PAYLOAD RECEIVED 🔥", payload);
          if (payload.event === 'INSERT') {
            const newMessage = payload.new;
            if (newMessage.user_id === user?.id) return; 

            // Active channel UI append
            if (newMessage.channel_id === activeChannelRef.current) {
              const { data: userData } = await supabase
                .from('users')
                .select('name, role')
                .eq('id', newMessage.user_id)
                .maybeSingle();

              if (userData) {
                newMessage.users = userData;
              }

              setMessages(prev => [...prev, newMessage]);
              scrollToBottom();

              // Mark as read immediately
               supabase.from('channel_members').upsert({ 
                 channel_id: activeChannelRef.current, 
                 user_id: user.id,
                 last_read_at: new Date().toISOString() 
               }, { onConflict: 'channel_id,user_id' }).then();
            } else {
              // Not the active channel: Add unread badge
              setUnreadCounts(prev => ({ ...prev, [newMessage.channel_id]: (prev[newMessage.channel_id] || 0) + 1 }));
            }
            
          } else if (payload.event === 'UPDATE') {
             if (payload.new.channel_id === activeChannelRef.current) {
               setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
             }
          } else if (payload.event === 'DELETE') {
             if (payload.old.channel_id === activeChannelRef.current) {
               setMessages(prev => prev.filter(m => m.id !== payload.old.id));
             }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannelListener);
    };
  }, [activeChannelId, isOpen, user?.id]);

  useEffect(() => {
    if (forceChannel && isOpen) {
      setActiveChannelId(forceChannel);
      setViewState('chat');
      if (onClearForceChannel) onClearForceChannel();
    }
  }, [forceChannel, isOpen, onClearForceChannel]);

  useEffect(() => {
    if (viewState === 'chat') {
      scrollToBottom();
      // Framer Motion CSS transform fallback
      const timer = setTimeout(scrollToBottom, 250);
      return () => clearTimeout(timer);
    }
  }, [viewState, messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const { data, error } = await supabase.from('chat_channels').insert([{
      name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
      is_private: newChannelIsPrivate
    }]).select();

    if (!error && data) {
      if (newChannelIsPrivate) {
        await supabase.from('channel_members').insert([
          { channel_id: data[0].id, user_id: user.id }
        ]);
      }
      setChannels(prev => [...prev, data[0]]);
      setActiveChannelId(data[0].id);
      setViewState('chat');
      setNewChannelName('');
    }
  };

  const handleStartDM = async (targetUser) => {
    const sortedIds = [user.id, targetUser.id].sort();
    const dmName = `dm_${sortedIds[0]}_${sortedIds[1]}`;

    // Check if exists
    let existingChannel = channels.find(c => c.name === dmName);
    
    if (!existingChannel) {
      const { data, error } = await supabase.from('chat_channels').insert([{
        name: dmName,
        is_private: true
      }]).select();

      if (!error && data) {
        await supabase.from('channel_members').insert([
          { channel_id: data[0].id, user_id: user.id },
          { channel_id: data[0].id, user_id: targetUser.id }
        ]);
        existingChannel = data[0];
        setChannels(prev => [...prev, existingChannel]);
      }
    }

    if (existingChannel) {
      setActiveChannelId(existingChannel.id);
      setViewState('chat');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
         alert('File size too large (Max 10MB).');
         return;
      }
      setAttachmentFile(file);
      if (file.type.startsWith('image/')) {
        setAttachmentPreviewUrl(URL.createObjectURL(file));
      } else {
        setAttachmentPreviewUrl('file'); // signal generic file
      }
    }
    // Clear the input value so selecting the same file again triggers onChange
    if (hiddenFileInput.current) hiddenFileInput.current.value = '';
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    if (attachmentPreviewUrl && attachmentPreviewUrl !== 'file') URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachmentPreviewUrl(null);
    if (hiddenFileInput.current) hiddenFileInput.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !attachmentFile) || !activeChannelId || !user || isUploading) return;

    if (editingMsgId) {
       // EDIT FLOW
       const originalMsg = messages.find(m => m.id === editingMsgId);
       if (!originalMsg) return;

       const updatedContent = inputValue.trim();
       setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, content: updatedContent } : m));
       setInputValue('');
       setEditingMsgId(null);

       const { error } = await supabase.from('chat_messages').update({ content: updatedContent, updated_at: new Date().toISOString() }).eq('id', editingMsgId);
       if (error) console.error("Error editing msg", error);
       return;
    }

    // INSERT FLOW
    setIsUploading(true);
    let uploadedUrl = null;
    let uploadedType = null;

    if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
           .from('chat_attachments')
           .upload(fileName, attachmentFile, { cacheControl: '3600', upsert: false });
           
        if (uploadError) {
           console.error("Upload error", uploadError);
           alert(`Failed to upload attachment: ${uploadError.message || uploadError}`);
           setIsUploading(false);
           return;
        }

        const { data: publicData } = supabase.storage
           .from('chat_attachments')
           .getPublicUrl(fileName);

        uploadedUrl = publicData.publicUrl;
        uploadedType = attachmentFile.type;
    }

    const newMsg = {
      channel_id: activeChannelId,
      user_id: user.id,
      content: inputValue.trim(),
      reply_to_id: replyingToMsg ? replyingToMsg.id : null,
      attachment_url: uploadedUrl,
      attachment_type: uploadedType
    };

    const optimisticMsg = {
      ...newMsg,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      users: { name: user.name, role: user.role }
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setInputValue('');
    setMentionPopup(p => ({ ...p, show: false }));
    setReplyingToMsg(null);
    clearAttachment();
    scrollToBottom();

    const { error } = await supabase.from('chat_messages').insert([newMsg]);
    if (error) {
       console.error("Error sending message", error);
       alert("Failed to send message over websocket: " + error.message);
    }
    setIsUploading(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleDeleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId)); // Optimistic UI
    const { error } = await supabase.from('chat_messages').delete().eq('id', msgId);
    if (error) console.error("Error deleting msg", error);
  };

  const startEditing = (msg) => {
    setEditingMsgId(msg.id);
    setReplyingToMsg(null);
    setInputValue(msg.content);
  };

  const startReplying = (msg) => {
    setReplyingToMsg(msg);
    setEditingMsgId(null);
    setInputValue('');
  };

  const renderTextWithMentions = (text) => {
    if (!text) return null;
    const parts = text.split(/(@[A-Za-z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const isSelf = user?.name && username.toLowerCase() === user.name.replace(/\s+/g, '').toLowerCase();
        return (
          <span key={i} className={isSelf ? 'mention-highlight-self' : 'mention-highlight'}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Detect if user is typing a mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const mentionsMatch = textBeforeCursor.match(/@([A-Za-z0-9_]*)$/);

    if (mentionsMatch) {
      setMentionPopup({ show: true, query: mentionsMatch[1].toLowerCase(), index: 0 });
    } else {
      setMentionPopup(p => ({ ...p, show: false }));
    }
  };

  const filteredMentions = mentionPopup.show ? allUsers.filter(u => u.name.replace(/\s+/g, '').toLowerCase().includes(mentionPopup.query) && u.id !== user?.id) : [];

  const insertMention = (nameRaw) => {
    const name = nameRaw.replace(/\s+/g, '');
    const cursorPos = inputRef.current?.selectionStart || inputValue.length;
    const textBefore = inputValue.substring(0, cursorPos);
    const textAfter = inputValue.substring(cursorPos);
    
    const match = textBefore.match(/@([A-Za-z0-9_]*)$/);
    if (match) {
      const newTextBefore = textBefore.substring(0, match.index) + `@${name} `;
      setInputValue(newTextBefore + textAfter);
      
      // Restore cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = newTextBefore.length;
          inputRef.current.selectionEnd = newTextBefore.length;
          inputRef.current.focus();
        }
      }, 0);
    }
    setMentionPopup(p => ({ ...p, show: false }));
  };

  const handleKeyDown = (e) => {
    if (mentionPopup.show && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionPopup(p => ({ ...p, index: (p.index + 1) % filteredMentions.length }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionPopup(p => ({ ...p, index: (p.index - 1 + filteredMentions.length) % filteredMentions.length }));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredMentions[mentionPopup.index].name);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionPopup(p => ({ ...p, show: false }));
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    
    const timeOptions = { hour: 'numeric', minute: '2-digit' };
    const dateOptions = { month: 'short', day: 'numeric' };
    
    if (isToday) return `Today at ${date.toLocaleTimeString([], timeOptions)}`;
    return `${date.toLocaleDateString([], dateOptions)} at ${date.toLocaleTimeString([], timeOptions)}`;
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Helper to format channel names (decode DM names if needed)
  const getChannelDisplayName = (channel) => {
    if (channel.name.startsWith('dm_')) {
      const ids = channel.name.replace('dm_', '').split('_');
      const targetId = ids.find(id => id !== user?.id);
      const targetUser = allUsers.find(u => u.id === targetId);
      return targetUser ? targetUser.name : 'Unknown User';
    }
    return channel.name;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="drawer-overlay" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div 
            className="messages-drawer"
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            {dbError ? (
              <div className="flex flex-col items-center justify-center p-8 h-full text-center text-red-500">
                <MessageSquare size={48} className="mb-4" />
                <h2 className="text-xl font-bold mb-2">Database Required</h2>
                <p className="text-slate-600">Please run <code>chat_schema.sql</code> in your Supabase SQL Editor.</p>
              </div>
            ) : (
              <div className="drawer-container">
                {/* Header */}
                <header className="drawer-header">
                  {viewState === 'chat' ? (
                     <div className="flex items-center gap-3">
                        <motion.button 
                          className="icon-btn-minimal hover:bg-slate-100" 
                          onClick={() => setViewState('channels')}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                           <ArrowLeft size={18} strokeWidth={2.5} />
                        </motion.button>
                        <div className="drawer-channel-title">
                           <Hash size={18} className="text-slate-400" />
                           {activeChannel ? (activeChannel.is_private ? getChannelDisplayName(activeChannel) : activeChannel.name) : 'Loading...'}
                        </div>
                     </div>
                  ) : viewState === 'create-channel' ? (
                     <div className="flex items-center gap-3">
                        <motion.button className="icon-btn-minimal" onClick={() => setViewState('channels')}>
                           <ArrowLeft size={18} strokeWidth={2.5} />
                        </motion.button>
                        <div className="drawer-channel-title">New Channel</div>
                     </div>
                  ) : viewState === 'create-dm' ? (
                     <div className="flex items-center gap-3">
                        <motion.button className="icon-btn-minimal" onClick={() => setViewState('channels')}>
                           <ArrowLeft size={18} strokeWidth={2.5} />
                        </motion.button>
                        <div className="drawer-channel-title">New Direct Message</div>
                     </div>
                  ) : (
                     <div className="drawer-title">Pilar <span className="text-primary-600">Comms</span></div>
                  )}
                  <motion.button 
                    className="icon-btn-minimal" 
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <X size={20} strokeWidth={2.5} />
                  </motion.button>
                </header>

                {/* Content Area */}
                <div className="drawer-body">
                  <AnimatePresence mode="wait">
                    {viewState === 'channels' ? (
                      <motion.div 
                        key="channels"
                        className="channels-view"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                         <div className="drawer-section-title flex items-center justify-between mt-2">
                            <span>Public Channels</span>
                            <button className="icon-btn-minimal p-1" onClick={() => setViewState('create-channel')} title="New Channel">
                              <Plus size={14} />
                            </button>
                         </div>
                         {channels.filter(c => !c.name.startsWith('dm_')).map((channel, i) => (
                            <motion.div 
                              key={channel.id} 
                              className={`drawer-list-item ${activeChannelId === channel.id ? 'active' : ''}`}
                              onClick={() => {
                                setActiveChannelId(channel.id);
                                setViewState('chat');
                              }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              whileHover={{ x: 4, backgroundColor: 'var(--color-slate-100)' }}
                            >
                              {channel.is_private ? <Lock size={16} className={`mr-2 ${activeChannelId === channel.id ? 'text-primary-600' : 'text-slate-400'}`} /> : <Hash size={16} className={`mr-2 ${activeChannelId === channel.id ? 'text-primary-600' : 'text-slate-400'}`} />}
                              <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{channel.name}</span>
                              {unreadCounts[channel.id] > 0 && activeChannelId !== channel.id && (
                                <span className="drawer-channel-unread">{unreadCounts[channel.id]}</span>
                              )}
                            </motion.div>
                         ))}

                         <div className="drawer-section-title flex items-center justify-between mt-8">
                            <span>Direct Messages</span>
                            <button className="icon-btn-minimal p-1" onClick={() => setViewState('create-dm')} title="New DM">
                              <Plus size={14} />
                            </button>
                         </div>
                         {channels.filter(c => c.name.startsWith('dm_')).map((channel, i) => (
                            <motion.div 
                              key={channel.id} 
                              className={`drawer-list-item ${activeChannelId === channel.id ? 'active' : ''}`}
                              onClick={() => {
                                setActiveChannelId(channel.id);
                                setViewState('chat');
                              }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: (channels.length + i) * 0.05 }}
                              whileHover={{ x: 4, backgroundColor: 'var(--color-slate-100)' }}
                            >
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 shadow-sm shadow-black/10 flex-shrink-0" style={{ background: getAvatarGradient(getChannelDisplayName(channel)) }}>
                                  {getChannelDisplayName(channel).charAt(0).toUpperCase()}
                              </div>
                              <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{getChannelDisplayName(channel)}</span>
                              {unreadCounts[channel.id] > 0 && activeChannelId !== channel.id && (
                                <span className="drawer-channel-unread">{unreadCounts[channel.id]}</span>
                              )}
                            </motion.div>
                         ))}
                     {/* --- CHANNELS LIST VIEW --- */}
                      </motion.div>
                    ) : viewState === 'create-channel' ? (
                      <motion.div 
                        key="create-channel"
                        className="channels-view flex flex-col p-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div className="mb-4">
                          <label className="block text-sm font-bold text-slate-700 mb-1">Channel Name</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all font-semibold"
                            placeholder="e.g. general, announcements"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                          />
                        </div>
                        <div className="mb-6 flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            id="private-check"
                            className="w-4 h-4 text-primary-600 rounded"
                            checked={newChannelIsPrivate}
                            onChange={(e) => setNewChannelIsPrivate(e.target.checked)}
                          />
                          <label htmlFor="private-check" className="text-sm font-semibold text-slate-700 select-none">Make Private</label>
                        </div>
                        <button 
                          className="w-full bg-primary-600 text-white font-bold py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                          onClick={handleCreateChannel}
                          disabled={!newChannelName.trim()}
                        >
                          Create Channel
                        </button>
                      </motion.div>
                    ) : viewState === 'create-dm' ? (
                      <motion.div 
                        key="create-dm"
                        className="channels-view"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                         <div className="drawer-section-title px-6 flex items-center justify-between">
                            <span>Select Team Member</span>
                         </div>
                         <div className="px-4">
                           {allUsers.length === 0 ? (
                             <div className="p-4 text-center text-sm text-slate-500 font-semibold">No other team members found.</div>
                           ) : (
                             allUsers.map((u, i) => (
                                <motion.div 
                                  key={u.id} 
                                  className="drawer-list-item flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 cursor-pointer"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  onClick={() => handleStartDM(u)}
                                >
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ background: getAvatarGradient(u.name) }}>
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{u.name}</span>
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase w-fit">{u.role}</span>
                                  </div>
                                </motion.div>
                             ))
                           )}
                         </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="chat"
                        className="chat-view"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="drawer-messages-list custom-scrollbar">
                          {messages.length === 0 ? (
                            <div className="drawer-empty-state">
                              <MessageSquare size={48} strokeWidth={1} className="mb-4 text-slate-300" />
                              <p className="font-semibold text-lg text-slate-800">No messages yet</p>
                              <p className="text-sm text-slate-500 mt-1">Start the conversation in #{activeChannel?.name}.</p>
                            </div>
                          ) : (
                            messages.map((msg, idx) => {
                              const prevMsg = messages[idx - 1];
                              const isOwn = msg.user_id === user?.id;
                              const isGrouped = Boolean(msg.user_id) && prevMsg && prevMsg.user_id === msg.user_id && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 300000;
                              const isMentioned = Boolean(user?.name) && msg.content.toLowerCase().includes(`@${user.name.replace(/\s+/g, '').toLowerCase()}`);
                              
                              return (
                                <motion.div 
                                  key={msg.id} 
                                  className={`drawer-msg-item ${isGrouped ? 'grouped' : ''} ${isMentioned ? 'mentioned-self' : ''}`}
                                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                >
                                  {!isGrouped ? (
                                    <div 
                                      className="drawer-msg-avatar"
                                      style={{ background: getAvatarGradient(msg.users?.name) }}
                                    >
                                      {msg.users?.name ? msg.users.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                  ) : (
                                    <div className="drawer-msg-avatar-spacer">
                                      <span className="drawer-msg-time-hover">{new Date(msg.created_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span>
                                    </div>
                                  )}
                                  
                                  <div className="drawer-msg-content">
                                    {!isGrouped && (
                                      <div className="drawer-msg-meta">
                                        <span className="drawer-msg-author">{msg.users?.name || 'Unknown User'}</span>
                                        <span className="drawer-msg-time">
                                          {formatTimestamp(msg.created_at)}
                                          {msg.updated_at && msg.updated_at !== msg.created_at && <span className="ml-1 text-[0.6rem] text-slate-400 italic">(edited)</span>}
                                        </span>
                                      </div>
                                    )}
                                    {msg.reply_to_id && (
                                      <div className="drawer-msg-quote cursor-pointer" onClick={() => {
                                        // Scroll to message functionality could go here
                                      }}>
                                        <div className="drawer-msg-quote-author">
                                          <Reply size={10} className="mr-1 inline -mt-0.5" /> 
                                          {messages.find(m => m.id === msg.reply_to_id)?.users?.name || 'Unknown User'}
                                        </div>
                                        <div className="drawer-msg-quote-text truncate">
                                          {renderTextWithMentions(messages.find(m => m.id === msg.reply_to_id)?.content || 'Original message was deleted')}
                                        </div>
                                      </div>
                                    )}
                                    <div className="drawer-msg-text">
                                      {/* Attachment Renderer */}
                                      {msg.attachment_url && (
                                        <div className="mt-1 mb-2 max-w-sm rounded-lg border border-slate-200 shadow-sm bg-white overflow-hidden">
                                          {msg.attachment_type?.startsWith('image/') ? (
                                            <div onClick={() => setExpandedImage(msg.attachment_url)} className="block cursor-zoom-in group relative">
                                              <img src={msg.attachment_url} alt="Attachment" className="w-full max-h-48 object-cover" loading="lazy" />
                                              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <ImageIcon className="text-white drop-shadow-md" size={32} />
                                              </div>
                                            </div>
                                          ) : (
                                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 hover:text-primary-600">
                                              <div className="p-2 bg-slate-100 rounded border border-slate-200 text-slate-500">
                                                <FileText size={20} />
                                              </div>
                                              <div className="flex flex-col flex-1 overflow-hidden">
                                                <span className="font-bold text-sm truncate">Attachment</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Click to view/download</span>
                                              </div>
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      
                                      {msg.content.trim() ? (
                                        renderTextWithMentions(msg.content)
                                      ) : (
                                        !msg.attachment_url && <span className="italic text-slate-400">Empty message</span>
                                      )}
                                      {isGrouped && msg.updated_at && msg.updated_at !== msg.created_at && <span className="ml-2 text-[0.6rem] text-slate-400 italic">(edited)</span>}
                                    </div>
                                  </div>

                                  {/* Hover Actions */}
                                  {!msg.id.toString().startsWith('temp-') && (
                                    <div className="drawer-msg-actions">
                                      <button className="icon-btn-minimal p-1.5" onClick={() => startReplying(msg)} title="Reply">
                                        <Reply size={13} className="text-slate-500 hover:text-primary-600" />
                                      </button>
                                      {isOwn && (
                                        <>
                                          <button className="icon-btn-minimal p-1.5" onClick={() => startEditing(msg)} title="Edit">
                                            <Edit2 size={13} className="text-slate-500 hover:text-primary-600" />
                                          </button>
                                          <button className="icon-btn-minimal p-1.5 hover:text-red-600" onClick={() => handleDeleteMessage(msg.id)} title="Delete">
                                            <Trash2 size={13} className="text-slate-500 hover:text-red-600" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })
                          )}
                          <div ref={messagesEndRef} className="h-4" />
                        </div>

                        <div className="drawer-input-area relative">
                          <input 
                            type="file" 
                            ref={hiddenFileInput} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                          />

                          {/* Attachment Preview Box */}
                          {attachmentFile && (
                            <div className="absolute -top-[4rem] left-6 right-6 bg-white border border-slate-200 rounded-t-lg p-2 flex items-center shadow-sm z-10 transition-all animate-in slide-in-from-bottom-2 duration-200">
                              {attachmentPreviewUrl && attachmentPreviewUrl !== 'file' ? (
                                <img src={attachmentPreviewUrl} className="h-10 w-10 object-cover rounded shadow-sm mr-3 border border-slate-200" alt="Preview" />
                              ) : (
                                <div className="h-10 w-10 bg-slate-100 rounded shadow-sm mr-3 border border-slate-200 flex items-center justify-center text-slate-500">
                                  <FileText size={20} />
                                </div>
                              )}
                              <div className="flex flex-col flex-1 overflow-hidden">
                                <span className="text-sm font-bold text-slate-700 truncate">{attachmentFile.name}</span>
                                <span className="text-[10px] text-slate-500 font-semibold uppercase">{(attachmentFile.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                              <button className="icon-btn-minimal p-1 ml-2 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full" onClick={clearAttachment}>
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          {replyingToMsg && (
                            <div className={`drawer-input-reply-banner absolute ${attachmentFile ? '-top-[6.5rem]' : '-top-8'} left-6 right-6 bg-slate-100 border border-slate-200 border-b-0 rounded-t-lg px-3 py-1.5 flex justify-between items-center shadow-sm z-0 transition-all`}>
                              <span className="text-xs font-semibold text-slate-600 truncate">
                                <Reply size={12} className="inline mr-1" />
                                Replying to <span className="font-bold">{replyingToMsg.users?.name || 'Unknown User'}</span>
                              </span>
                              <button className="text-slate-400 hover:text-slate-700" onClick={() => setReplyingToMsg(null)}>
                                <X size={14} />
                              </button>
                            </div>
                          )}
                          {mentionPopup.show && filteredMentions.length > 0 && (
                            <div className="mention-popup">
                              {filteredMentions.map((u, i) => (
                                <div 
                                  key={u.id} 
                                  className={`mention-popup-item ${i === mentionPopup.index ? 'active' : ''}`}
                                  onClick={() => insertMention(u.name)}
                                >
                                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]" style={{background: getAvatarGradient(u.name)}}>
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{u.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className={`drawer-input-wrapper ${replyingToMsg || attachmentFile ? 'rounded-tl-none rounded-tr-none' : ''}`}>
                            <textarea 
                              ref={inputRef}
                              className="drawer-input custom-scrollbar"
                              placeholder={replyingToMsg ? "Type a reply..." : `Message #${activeChannel?.name || '...'}`}
                              value={inputValue}
                              onChange={handleInputChange}
                              onKeyDown={handleKeyDown}
                              disabled={isUploading}
                            />
                            <div className="drawer-input-actions flex items-center justify-between">
                              <div className="drawer-input-hints w-full flex items-center pr-2">
                                {!editingMsgId && (
                                  <button 
                                    className="p-1.5 mr-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50"
                                    onClick={() => hiddenFileInput.current?.click()}
                                    title="Attach Image or File"
                                    disabled={isUploading}
                                  >
                                    <Paperclip size={16} strokeWidth={2.5} />
                                  </button>
                                )}
                                {editingMsgId ? (
                                   <div className="flex items-center justify-between w-full">
                                      <span className="text-primary-600 font-bold ml-1">Editing message...</span>
                                      <button className="text-xs hover:underline cursor-pointer" onClick={() => { setEditingMsgId(null); setInputValue(''); }}>Cancel</button>
                                   </div>
                                ) : (
                                   <div className="flex-1 opacity-60">
                                     <span className="kbd-hint">↵</span> to send  <span className="kbd-hint mx-2">⇧ ↵</span> for new line
                                   </div>
                                )}
                              </div>
                              <motion.button 
                                className="drawer-send-btn ml-2 shadow-md flex-shrink-0"
                                onClick={handleSendMessage}
                                disabled={(!inputValue.trim() && !attachmentFile) || isUploading}
                                whileHover={(inputValue.trim() || attachmentFile) && !isUploading ? { scale: 1.05 } : {}}
                                whileTap={(inputValue.trim() || attachmentFile) && !isUploading ? { scale: 0.95 } : {}}
                              >
                                {isUploading ? <Loader2 size={15} strokeWidth={2.5} className="animate-spin" /> : <Send size={15} strokeWidth={2.5} />}
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
      
      {expandedImage && (
        <motion.div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpandedImage(null)}
        >
           <motion.img 
              src={expandedImage} 
              alt="Expanded Attachment" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
           />
           <button 
             className="absolute top-6 right-6 text-white hover:text-red-400 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-[101]"
             onClick={() => setExpandedImage(null)}
           >
             <X size={24} />
           </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
