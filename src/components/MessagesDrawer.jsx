import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, MessageSquare, X, ArrowLeft, Plus, Lock, User, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './MessagesDrawer.css';

export default function MessagesDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [dbError, setDbError] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const messagesEndRef = useRef(null);
  const [viewState, setViewState] = useState('channels'); // 'channels', 'chat', 'create-channel', 'create-dm'
  const [allUsers, setAllUsers] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);

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
      } else if (channelError) {
        console.error("Error fetching channels", channelError);
        setDbError(channelError?.code === '42P01' ? 'The chat tables have not been created yet.' : channelError?.message);
      }

      // Fetch All Users for DM creation
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (!usersError && usersData) {
        setAllUsers(usersData.filter(u => u.id !== user?.id)); // exclude self
      }
    };
    
    fetchInitialData();
  }, [isOpen, activeChannelId, user?.id]);

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

    const channelListener = supabase.channel(`public:chat_messages:channel_id=eq.${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannelId}` },
        async (payload) => {
          if (payload.event === 'INSERT') {
            const newMessage = payload.new;
            if (newMessage.user_id === user?.id) return; 

            const { data: userData } = await supabase
              .from('users')
              .select('name, role')
              .eq('id', newMessage.user_id)
              .single();

            if (userData) {
              newMessage.users = userData;
            }

            setMessages(prev => [...prev, newMessage]);
            scrollToBottom();
          } else if (payload.event === 'UPDATE') {
             setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
          } else if (payload.event === 'DELETE') {
             setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelListener);
    };
  }, [activeChannelId, isOpen, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeChannelId || !user) return;

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
    const newMsg = {
      channel_id: activeChannelId,
      user_id: user.id,
      content: inputValue,
    };

    const optimisticMsg = {
      ...newMsg,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      users: { name: user.name, role: user.role }
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInputValue('');
    scrollToBottom();

    const { error } = await supabase.from('chat_messages').insert([newMsg]);
    if (error) console.error("Error sending message", error);
  };

  const handleDeleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId)); // Optimistic UI
    const { error } = await supabase.from('chat_messages').delete().eq('id', msgId);
    if (error) console.error("Error deleting msg", error);
  };

  const startEditing = (msg) => {
    setEditingMsgId(msg.id);
    setInputValue(msg.content);
  };

  const handleKeyDown = (e) => {
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
                              {channel.name}
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
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 shadow-sm shadow-black/10" style={{ background: getAvatarGradient(getChannelDisplayName(channel)) }}>
                                  {getChannelDisplayName(channel).charAt(0).toUpperCase()}
                              </div>
                              {getChannelDisplayName(channel)}
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
                              const isGrouped = prevMsg && prevMsg.user_id === msg.user_id && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 300000;
                              
                              return (
                                <motion.div 
                                  key={msg.id} 
                                  className={`drawer-msg-item ${isGrouped ? 'grouped' : ''}`}
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
                                    <div className="drawer-msg-text">
                                      {msg.content}
                                      {isGrouped && msg.updated_at && msg.updated_at !== msg.created_at && <span className="ml-2 text-[0.6rem] text-slate-400 italic">(edited)</span>}
                                    </div>
                                  </div>

                                  {/* Hover Actions for own messages */}
                                  {isOwn && !msg.id.toString().startsWith('temp-') && (
                                    <div className="drawer-msg-actions">
                                      <button className="icon-btn-minimal p-1.5" onClick={() => startEditing(msg)} title="Edit">
                                        <Edit2 size={13} className="text-slate-500 hover:text-primary-600" />
                                      </button>
                                      <button className="icon-btn-minimal p-1.5 hover:text-red-600" onClick={() => handleDeleteMessage(msg.id)} title="Delete">
                                        <Trash2 size={13} className="text-slate-500 hover:text-red-600" />
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })
                          )}
                          <div ref={messagesEndRef} className="h-4" />
                        </div>

                        <div className="drawer-input-area">
                          <div className="drawer-input-wrapper">
                            <textarea 
                              className="drawer-input custom-scrollbar"
                              placeholder={`Message #${activeChannel?.name || '...'}`}
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                            />
                            <div className="drawer-input-actions flex items-center justify-between">
                              <div className="drawer-input-hints w-full">
                                {editingMsgId ? (
                                   <div className="flex items-center justify-between w-full">
                                      <span className="text-primary-600 font-bold ml-1">Editing message...</span>
                                      <button className="text-xs hover:underline cursor-pointer" onClick={() => { setEditingMsgId(null); setInputValue(''); }}>Cancel</button>
                                   </div>
                                ) : (
                                   <>
                                     <span className="kbd-hint">↵</span> to send  <span className="kbd-hint mx-2">⇧ ↵</span> for new line
                                   </>
                                )}
                              </div>
                              <motion.button 
                                className="drawer-send-btn ml-3 shadow-md"
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                                whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                                whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
                              >
                                <Send size={15} strokeWidth={2.5} />
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
    </AnimatePresence>
  );
}
