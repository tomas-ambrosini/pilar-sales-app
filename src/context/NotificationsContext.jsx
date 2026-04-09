import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const resolveNotification = async () => {
              const newNotif = { ...payload.new };
              if (newNotif.actor_id) {
                const { data } = await supabase.from('user_profiles').select('full_name, avatar_url').eq('id', newNotif.actor_id).maybeSingle();
                if (data) newNotif.actor = data;
              }
              setNotifications((prev) => [newNotif, ...prev]);
              setUnreadCount((prev) => prev + 1);
            };
            resolveNotification();
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            );
            if (payload.new.is_read && !payload.old.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } else if (!payload.new.is_read && payload.old.is_read) {
                setUnreadCount((prev) => prev + 1);
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== payload.old.id)
            );
            // We would need to know if the deleted one was unread to decrement the count accurately.
            // For now, trigger a raw recount to be perfectly safe on deletions.
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
            *,
            actor:user_profiles!actor_id(full_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data ? data.filter((n) => !n.is_read).length : 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      fetchNotifications(); // Rollback on failure
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking all as read:', error);
      fetchNotifications(); // Rollback on failure
    }
  };

  // MVP-Safe helper to create a generic notification anywhere in code
  const createNotification = async ({ userId, type, title, message, entityType = null, entityId = null, link = null, metadata = {} }) => {
    try {
        const { error } = await supabase.from('notifications').insert([{
            user_id: userId,
            actor_id: user.id, // The person currently triggering it
            type,
            title,
            message,
            entity_type: entityType,
            entity_id: entityId,
            link,
            metadata
        }]);
        if (error) throw error;
        return true;
    } catch(err) {
        console.error("Failed to generate notification: ", err);
        return false;
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
        createNotification
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
