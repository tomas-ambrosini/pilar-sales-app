import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, Hash, MessageSquare, Menu, Plus } from 'lucide-react';
import './Messages.css';

export default function Messages() {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dbError, setDbError] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch channels on mount
  useEffect(() => {
    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setChannels(data);
        // Select 'general' by default or the first channel
        const general = data.find(c => c.name === 'general');
        if (general) {
          setActiveChannelId(general.id);
        } else if (data.length > 0) {
          setActiveChannelId(data[0].id);
        }
      } else {
        console.error("Error fetching channels", error);
        if (error.code === '42P01') {
          // PostgreSQL Error code for 'undefined_table'
          setDbError('The chat tables have not been created in Supabase yet.');
        } else {
          setDbError(error.message || 'Failed to connect to the database.');
        }
      }
    };
    fetchChannels();
  }, []);

  // Fetch messages when active channel changes
  useEffect(() => {
    if (!activeChannelId) return;

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
        .order('created_at', { ascending: true }); // Make sure they are chronological

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
          // We need to fetch the user name since payload only gives us the row data without joined relations
          const newMessage = payload.new;
          
          if (newMessage.user_id === user.id) {
             // Let our optimistic UI handle this to avoid duplicates or lag
             return;
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
  }, [activeChannelId, user.id]);

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
      // rollback or handle error conceptually
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

  if (dbError) {
    return (
      <div className="messages-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: 'var(--color-danger)' }}>
        <MessageSquare size={48} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Database Configuration Required</h2>
        <p style={{ maxWidth: '400px', textAlign: 'center', color: 'var(--color-slate-600)' }}>
          {dbError} Please make sure to run the <code>chat_schema.sql</code> file in your Supabase SQL editor to create the necessary tables.
        </p>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {/* Mobile Sidebar Toggle */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-10 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`messages-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="messages-sidebar-header">
          <span>Pilar Communications</span>
        </div>
        <div className="messages-sidebar-content">
          <div className="channel-group-title">Channels</div>
          {channels.map(channel => (
            <div 
              key={channel.id} 
              className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
              onClick={() => {
                setActiveChannelId(channel.id);
                setIsSidebarOpen(false);
              }}
            >
              <span className="hash"><Hash size={16} /></span>
              {channel.name}
            </div>
          ))}
          
          <div className="px-5 mt-4">
             <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-semibold cursor-not-allowed opacity-50" title="Coming soon">
                <Plus size={16} /> Add Channel
             </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="messages-main">
        <header className="messages-header">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-slate-500 hover:text-slate-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="channel-title">
              <Hash size={20} className="text-slate-400" />
              {activeChannel ? activeChannel.name : 'Loading...'}
            </div>
          </div>
          {activeChannel?.description && (
             <div className="text-sm text-slate-500 hidden sm:block">
                 {activeChannel.description}
             </div>
          )}
        </header>

        <div className="messages-list">
          {messages.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={48} strokeWidth={1} />
              <p className="font-semibold text-lg text-slate-700 mt-4">No messages yet</p>
              <p className="text-sm">Be the first to start the conversation in #{activeChannel?.name}.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              // Decide if we should group with previous message (within 5 minutes, same author)
              const prevMsg = messages[idx - 1];
              const isGrouped = prevMsg 
                && prevMsg.user_id === msg.user_id 
                && (new Date(msg.created_at) - new Date(prevMsg.created_at)) < 300000;

              return (
                <div key={msg.id} className={`message-item ${isGrouped ? 'mt-[-10px]' : ''}`}>
                  {!isGrouped ? (
                    <div className="message-avatar">
                      {msg.users?.name ? msg.users.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  ) : (
                    <div className="w-[40px] flex-shrink-0"></div>
                  )}
                  
                  <div className="message-content-wrapper">
                    {!isGrouped && (
                      <div className="message-meta">
                        <span className="message-author">{msg.users?.name || 'Unknown User'}</span>
                        <span className="message-time">{formatTimestamp(msg.created_at)}</span>
                      </div>
                    )}
                    <div className="message-text">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="messages-input-area">
          <div className="messages-input-wrapper">
            <textarea 
              className="messages-input"
              placeholder={`Message #${activeChannel?.name || '...'}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="messages-input-actions">
              <div className="flex gap-2">
                 {/* Formatting actions can go here in the future */}
                 <div className="text-xs text-slate-400 font-semibold px-2 py-1">
                    <span className="bg-slate-200 text-slate-500 rounded px-1 scale-90 inline-block font-mono">Shift</span> + <span className="bg-slate-200 text-slate-500 rounded px-1 scale-90 inline-block font-mono">Enter</span> for new line
                 </div>
              </div>
              <button 
                className="send-button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
