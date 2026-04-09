import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckSquare, MessageCircle, FileCheck, Info, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';
import toast from 'react-hot-toast';

function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " secs ago";
}

export default function NotificationsPanel({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // UI Routing 
    if (notification.link) {
      navigate(notification.link);
      onClose();
    } else if (notification.entity_type === 'chat_channel') {
      // In MVP, we might broadcast a global event or rely on the user opening the drawer manually if route is complex.
      // But typically, we navigate to home or maintain a specific chat route if that exists.
      toast.success("Opening chat...");
      onClose();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'chat_mention': return <MessageCircle size={16} className="text-primary-500" />;
      case 'quote_accepted': return <FileCheck size={16} className="text-emerald-500" />;
      case 'admin_notice': return <Info size={16} className="text-amber-500" />;
      default: return <Bell size={16} className="text-slate-400" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="absolute top-16 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col max-h-[80vh]"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
             {unreadCount > 0 && (
               <button 
                 onClick={markAllAsRead}
                 className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary-50 transition-colors"
               >
                 <CheckSquare size={14} />
                 Mark all read
               </button>
             )}
             <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-200 text-slate-400">
                <X size={16} />
             </button>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Bell size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">You're all caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No new notifications right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-4 ${!notif.is_read ? 'bg-primary-50/30' : ''}`}
                >
                  <div className="flex-shrink-0 mt-1 relative">
                    {notif.actor?.avatar_url ? (
                      <img src={notif.actor.avatar_url} alt="actor" className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                        <span className="text-sm font-bold text-slate-400">
                           {notif.actor?.full_name?.charAt(0) || 'S'}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                      {getIcon(notif.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                       {notif.message}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-2 uppercase">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-2"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
