import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const proposalsAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('proposals')
    .select(`id, customer, status, total_amount, updated_at, created_at, created_by`)
    .gte('updated_at', dateStart)
    .lte('updated_at', dateEnd)
    .in('status', ['Approved', 'Sent', 'Draft']);

  if (error) {
    console.error("Calendar Adapter Error (Proposals):", error);
    return [];
  }

  return (data || []).map(prop => {
    const eventDate = prop.updated_at || prop.created_at;
    
    return normalizeCalendarEvent({
      id: `prop-${prop.id}`,
      source_id: prop.id,
      source_table: 'proposals',
      title: `Contract ${prop.status}: ${prop.customer?.replace(/ Account$/i, '').trim() || 'Unknown'}`,
      description: `Value: $${(prop.total_amount || 0).toLocaleString()}`,
      start_date: eventDate,
      scheduled_start: eventDate,
      event_type: 'FINANCE_EVENT',
      primary_assignee: prop.created_by,
      status: prop.status,
      color_key: prop.status === 'Approved' ? 'emerald' : 'red',
      route_target: 'proposal_viewer',
      metadata: { amount: prop.total_amount }
    });
  });
};
