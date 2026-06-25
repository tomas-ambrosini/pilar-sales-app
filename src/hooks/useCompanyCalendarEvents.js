import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { EventRegistry } from '../lib/calendar/EventRegistry';
import { supabase } from '../supabaseClient';

export function useCompanyCalendarEvents(dateStart, dateEnd, filters) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!dateStart || !dateEnd) return;
    setLoading(true);
    try {
      const unifiedEvents = await EventRegistry.fetchEvents(dateStart, dateEnd, filters);
      setEvents(unifiedEvents);
    } catch (error) {
      console.error("Failed to fetch calendar events:", error);
      toast.error("Failed to sync calendar events from server.");
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd, filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Optionally set up Realtime channel if we want live updates
  // For V1, we can just rely on the effect triggers

  return { events, loading, refetch: fetchEvents };
}
