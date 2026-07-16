import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const customerAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('households')
    .select(`id, name, created_at, active_maintenance_agreement`)
    .eq('active_maintenance_agreement', true);

  if (error) {
    console.error("Calendar Adapter Error (Customers):", error);
    return [];
  }

  const events = [];
  const startObj = new Date(dateStart);
  const endObj = new Date(dateEnd);

  (data || []).forEach(customer => {
    // Generate an anniversary event for PM
    const creationDate = new Date(customer.created_at);
    
    // Find the anniversary that falls between dateStart and dateEnd
    // For simplicity in this demo, let's just project the anniversary into the current view year
    const currentYear = startObj.getFullYear();
    const anniversary = new Date(creationDate);
    anniversary.setFullYear(currentYear);

    // If it falls in the current view bounds
    if (anniversary >= startObj && anniversary <= endObj) {
        events.push(normalizeCalendarEvent({
            id: `pm-anniversary-${customer.id}-${currentYear}`,
            source_id: customer.id,
            source_table: 'households',
            title: `${customer.name} - Annual PM Due`,
            start_date: anniversary.toISOString(),
            scheduled_start: anniversary.toISOString(),
            event_type: 'SERVICE_DISPATCH',
            department_name: 'SERVICE',
            assigned_users: [],
            primary_assignee: null,
            status: 'Pending Scheduling',
            priority: 'NORMAL',
            color_key: 'cyan',
            route_target: 'customer_profile',
            is_blocking: false,
            metadata: {
                customer_name: customer.name,
                is_pm_due: true
            }
        }));
    }
  });

  return events;
};
