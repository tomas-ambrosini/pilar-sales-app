import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const serviceCallsAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('service_calls')
    .select(`id, issue_description, urgency, assigned_techs, scheduled_start, scheduled_end, arrival_window_start, arrival_window_end, status, customer_id`)
    .gte('scheduled_start', dateStart)
    .lte('scheduled_start', dateEnd)
    .eq('is_active', true);

  if (error) {
    console.warn("Calendar Adapter Warning (Service Calls): Table might not be ready.", error);
    return [];
  }

  return (data || []).map(call => {
    return normalizeCalendarEvent({
      id: call.id,
      source_id: call.id,
      source_table: 'service_calls',
      title: `Service: ${call.issue_description?.substring(0, 30) || 'Call'}`,
      description: call.issue_description,
      start_date: call.scheduled_start,
      end_date: call.scheduled_end,
      scheduled_start: call.scheduled_start,
      scheduled_end: call.scheduled_end,
      arrival_window_start: call.arrival_window_start,
      arrival_window_end: call.arrival_window_end,
      event_type: 'SERVICE_DISPATCH',
      assigned_users: call.assigned_techs || [],
      primary_assignee: call.assigned_techs?.[0] || null,
      status: call.status,
      priority: call.urgency,
      customer_id: call.customer_id,
      color_key: 'amber',
      route_target: 'service_call_modal',
      metadata: {}
    });
  });
};
