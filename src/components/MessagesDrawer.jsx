import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, MessageSquare, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './MessagesDrawer.css';

export default function MessagesDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [dbError, setDbError] = useState(null);
  const messagesEndRef = useRef(null);
  const [viewState, setViewState] = useState('channels'); 

  // Generate a deterministic gradient for an avatar based on a string (name)
  const getAvatarGradient = (name) => {
    if (!name) return 'linear-gradient(135deg, #e2e8f0, #cbd5e1)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorHash1 = hash % 360;
    const colorHash2 = (hash + 50) % 360;
    return `linear-gradient(135deg, hsl(${colorHash1 > 0 ? colorHash1 : -colorHash1}, 70%, 65%), hsl(${colorHash2 > 0 ? colorHash2 : -colorHash2}, 80%, 55%))`;
  };

  useEffect(() => {
    if (!isOpen) return; 

    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setChannels(data);
        const general = data.find(c => c.name === 'general');
        if (general) {
          setActiveChannelId(general.id);
          setViewState('chat');
        } else if (data.length > 0) {
          setActiveChannelId(data[0].id);
          setViewState('chat');
        }
      } else {
        console.error("Error fetching channels", error);
        if (error?.code === '42P01') {
          setDbError('The chat tables have not been created in Supabase yet.');
        } else {
          setDbError(error?.message || 'Failed to connect to the database.');
        }
      }
    };
    
    if (channels.length === 0) {
       fetchChannels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!activeChannelId || !isOpen) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeChannelId || !user) return;

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
                           {activeChannel ? activeChannel.name : 'Loading...'}
                        </div>
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
                         <div className="drawer-section-title">Channels</div>
                         {channels.map((channel, i) => (
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
                              <Hash size={16} className={`mr-2 ${activeChannelId === channel.id ? 'text-primary-600' : 'text-slate-400'}`} />
                              {channel.name}
                            </motion.div>
                         ))}
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
                                        <span className="drawer-msg-time">{formatTimestamp(msg.created_at)}</span>
                                      </div>
                                    )}
                                    <div className="drawer-msg-text">
                                      {msg.content}
                                    </div>
                                  </div>
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
                            <div className="drawer-input-actions">
                              <div className="drawer-input-hints">
                                <span className="kbd-hint">↵</span> to send  <span className="kbd-hint mx-2">⇧ ↵</span> for new line
                              </div>
                              <motion.button 
                                className="drawer-send-btn"
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
