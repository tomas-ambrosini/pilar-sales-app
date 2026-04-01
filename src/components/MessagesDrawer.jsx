import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, MessageSquare, X, ArrowLeft } from 'lucide-react';
import './MessagesDrawer.css';

export default function MessagesDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [dbError, setDbError] = useState(null);
  const messagesEndRef = useRef(null);
  const [viewState, setViewState] = useState('channels'); // 'channels' or 'chat' for fluid mobile feel inside drawer

  // Fetch channels on mount
  useEffect(() => {
    if (!isOpen) return; // Only fetch if opened, optionally fetch once and cache

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

  // Fetch messages when active channel changes
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

    // Subscribe to real-time changes
    const channelListener = supabase.channel(`public:chat_messages:channel_id=eq.${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannelId}` },
        async (payload) => {
          const newMessage = payload.new;
          
          if (newMessage.user_id === user?.id) {
             return; // Optimistic UI
          }

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
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeChannelId || !user) return;

    const newMsg = {
      channel_id: activeChannelId,
      user_id: user.id,
      content: inputValue,
    };

    // Optimistic UI update
    const optimisticMsg = {
      ...newMsg,
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      users: { name: user.name, role: user.role }
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInputValue('');
    scrollToBottom();

    // Insert to DB
    const { error } = await supabase
      .from('chat_messages')
      .insert([newMsg]);

    if (error) {
      console.error("Error sending message", error);
    }
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
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], timeOptions)}`;
    }
    return `${date.toLocaleDateString([], dateOptions)} at ${date.toLocaleTimeString([], timeOptions)}`;
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <>
      <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`messages-drawer ${isOpen ? 'open' : ''}`}>
        
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
                    <button className="icon-btn-minimal" onClick={() => setViewState('channels')}>
                       <ArrowLeft size={20} />
                    </button>
                    <div className="drawer-channel-title">
                       <Hash size={18} className="text-slate-400" />
                       {activeChannel ? activeChannel.name : 'Loading...'}
                    </div>
                 </div>
              ) : (
                 <div className="drawer-title">Pilar Communications</div>
              )}
              <button className="icon-btn-minimal" onClick={onClose}>
                <X size={20} />
              </button>
            </header>

            {/* Content Area */}
            <div className="drawer-body">
              {viewState === 'channels' ? (
                <div className="channels-view">
                   <div className="drawer-section-title">Channels</div>
                   {channels.map(channel => (
                      <div 
                        key={channel.id} 
                        className={`drawer-list-item ${activeChannelId === channel.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveChannelId(channel.id);
                          setViewState('chat');
                        }}
                      >
                        <Hash size={16} className="text-slate-400 mr-2" />
                        {channel.name}
                      </div>
                   ))}
                </div>
              ) : (
                <div className="chat-view">
                  <div className="drawer-messages-list">
                    {messages.length === 0 ? (
                      <div className="drawer-empty-state">
                        <MessageSquare size={40} strokeWidth={1.5} className="mb-3 text-slate-300" />
                        <p className="font-semibold text-slate-700">No messages yet</p>
                        <p className="text-sm text-slate-500">Start the conversation in #{activeChannel?.name}.</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const prevMsg = messages[idx - 1];
                        const isGrouped = prevMsg && prevMsg.user_id === msg.user_id && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 300000;
                        
                        return (
                          <div key={msg.id} className={`drawer-msg-item ${isGrouped ? 'grouped' : ''}`}>
                            {!isGrouped ? (
                              <div className="drawer-msg-avatar">
                                {msg.users?.name ? msg.users.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            ) : (
                              <div className="drawer-msg-avatar-spacer"></div>
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
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="drawer-input-area">
                    <div className="drawer-input-wrapper">
                      <textarea 
                        className="drawer-input"
                        placeholder={`Message #${activeChannel?.name || '...'}`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <div className="drawer-input-actions">
                        <div className="text-xs text-slate-400 font-semibold px-1">
                          Press Enter to send
                        </div>
                        <button 
                          className="drawer-send-btn"
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim()}
                        >
                          <Send size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
