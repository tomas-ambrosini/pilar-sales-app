import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const workOrdersAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('work_orders')
    .select(`id, title, status, scheduled_start_date, scheduled_end_date, assigned_techs, opportunity_id`)
    .gte('scheduled_start_date', dateStart)
    .lte('scheduled_start_date', dateEnd);

  if (error) {
    console.error("Calendar Adapter Error (Work Orders):", error);
    return [];
  }

  return (data || []).map(wo => {
    return normalizeCalendarEvent({
      id: wo.id,
      source_id: wo.id,
      source_table: 'work_orders',
      title: wo.title || 'Work Order',
      start_date: wo.scheduled_start_date,
      end_date: wo.scheduled_end_date,
      scheduled_start: wo.scheduled_start_date,
      scheduled_end: wo.scheduled_end_date,
      event_type: 'PROJECT_INSTALL',
      assigned_users: wo.assigned_techs || [],
      primary_assignee: wo.assigned_techs?.[0] || null,
      status: wo.status,
      opportunity_id: wo.opportunity_id,
      color_key: 'emerald',
      route_target: 'dispatch_hub',
      metadata: {}
    });
  });
};
