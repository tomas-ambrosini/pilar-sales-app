import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const opportunitiesAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('opportunities')
    .select(`id, lead_name, current_stage, total_value, appointment_date, assigned_to`)
    .gte('appointment_date', dateStart)
    .lte('appointment_date', dateEnd)
    .not('appointment_date', 'is', null);

  if (error) {
    console.error("Calendar Adapter Error (Opportunities):", error);
    return [];
  }

  return (data || []).map(opp => {
    return normalizeCalendarEvent({
      id: opp.id,
      source_id: opp.id,
      source_table: 'opportunities',
      title: `Appt: ${opp.lead_name?.replace(/ Account$/i, '').trim() || 'Unknown'}`,
      start_date: opp.appointment_date,
      scheduled_start: opp.appointment_date,
      event_type: 'SALES_APPT',
      department_id: null,
      primary_assignee: opp.assigned_to,
      assigned_users: opp.assigned_to ? [opp.assigned_to] : [],
      status: opp.current_stage,
      color_key: 'blue',
      route_target: 'opportunity_overview',
      metadata: { value: opp.total_value },
      customer_name: opp.lead_name?.replace(/ Account$/i, '').trim() || ''
    });
  });
};
