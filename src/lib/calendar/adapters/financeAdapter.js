import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const financeAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`id, created_at, status, amount, balance_due, proposals(customer, associated_opportunity_id)`)
    .gte('created_at', dateStart)
    .lte('created_at', dateEnd);

  if (error) {
    console.error("Calendar Adapter Error (Finance):", error);
    return [];
  }

  return (data || []).map(inv => {
    // Treat unpaid invoices as urgent if older than 14 days
    const isOverdue = inv.status !== 'Paid in Full' && (new Date() - new Date(inv.created_at) > 14 * 24 * 60 * 60 * 1000);
    
    return normalizeCalendarEvent({
      id: inv.id,
      source_id: inv.id,
      source_table: 'invoices',
      title: `Invoice: $${parseFloat(inv.balance_due || inv.amount || 0).toLocaleString()}`,
      start_date: inv.created_at,
      scheduled_start: inv.created_at,
      event_type: 'FINANCE_EVENT',
      department_name: 'FINANCE',
      assigned_users: [],
      primary_assignee: null,
      status: inv.status || 'Pending',
      priority: isOverdue ? 'URGENT' : 'NORMAL',
      opportunity_id: inv.proposals?.associated_opportunity_id,
      color_key: 'emerald',
      route_target: 'invoice_viewer',
      is_blocking: true, // Read-only on calendar
      metadata: {
        customer_name: inv.proposals?.customer,
        is_overdue: isOverdue,
      }
    });
  });
};
