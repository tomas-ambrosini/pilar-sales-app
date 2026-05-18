import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const companyEventsAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('company_events')
    .select(`id, title, description, start_date, end_date, recurrence_rule, recurrence_end, is_blocking, availability_impact, event_types(code, default_color), department_id, assigned_users`)
    .gte('start_date', dateStart)
    .lte('start_date', dateEnd);

  if (error) {
    console.warn("Calendar Adapter Warning (Company Events):", error);
    return [];
  }

  return (data || []).map(ev => {
    return normalizeCalendarEvent({
      id: ev.id,
      source_id: ev.id,
      source_table: 'company_events',
      title: ev.title,
      description: ev.description,
      start_date: ev.start_date,
      end_date: ev.end_date,
      scheduled_start: ev.start_date,
      scheduled_end: ev.end_date,
      event_type: ev.event_types?.code || 'HR_ADMIN',
      department_id: ev.department_id,
      assigned_users: ev.assigned_users || [],
      primary_assignee: ev.assigned_users?.[0] || null,
      status: 'Confirmed',
      color_key: ev.event_types?.default_color || 'fuchsia',
      route_target: 'company_event_modal',
      is_blocking: ev.is_blocking,
      availability_impact: ev.availability_impact,
      metadata: {
        recurrence_rule: ev.recurrence_rule || null,
        recurrence_end: ev.recurrence_end || null
      }
    });
  });
};
