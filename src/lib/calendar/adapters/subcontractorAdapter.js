import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const subcontractorAdapter = async (dateStart, dateEnd) => {
  // Fetch subcontractors and their crews to find any blackout dates or expiring licenses
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .or('role.eq.SUBCONTRACTOR,department.eq.SUBCONTRACTOR');

  if (error) {
    console.error("Calendar Adapter Error (Subcontractors):", error);
    return [];
  }

  const events = [];
  const startObj = new Date(dateStart);
  const endObj = new Date(dateEnd);

  (data || []).forEach(sub => {
    // Check for mock or real license expiration inside metadata (JSON)
    const licenseExp = sub.metadata?.license_expiration;
    if (licenseExp) {
      const expDate = new Date(licenseExp);
      if (expDate >= startObj && expDate <= endObj) {
        events.push(normalizeCalendarEvent({
          id: `license-exp-${sub.id}`,
          source_id: sub.id,
          source_table: 'user_profiles',
          title: `License Expiring: ${sub.subcontractor_company || sub.full_name}`,
          start_date: expDate.toISOString(),
          scheduled_start: expDate.toISOString(),
          event_type: 'HR_ADMIN',
          department_name: 'SUBCONTRACTOR',
          assigned_users: [{ name: sub.full_name, avatar_url: sub.avatar_url }],
          primary_assignee: sub.id,
          status: 'Action Required',
          priority: 'URGENT',
          color_key: 'red',
          route_target: 'subcontractors',
          is_blocking: true, // Read-only event
          metadata: {
            subcontractor_name: sub.subcontractor_company || sub.full_name,
            is_license_expiration: true
          }
        }));
      }
    }

    // Check for blackout dates
    const blackoutDates = sub.metadata?.blackout_dates || [];
    blackoutDates.forEach((dateStr, index) => {
      const bDate = new Date(dateStr);
      if (bDate >= startObj && bDate <= endObj) {
        events.push(normalizeCalendarEvent({
          id: `blackout-${sub.id}-${index}`,
          source_id: sub.id,
          source_table: 'user_profiles',
          title: `Blackout Date: ${sub.subcontractor_company || sub.full_name}`,
          start_date: bDate.toISOString(),
          scheduled_start: bDate.toISOString(),
          event_type: 'HR_ADMIN',
          department_name: 'SUBCONTRACTOR',
          assigned_users: [{ name: sub.full_name, avatar_url: sub.avatar_url }],
          primary_assignee: sub.id,
          status: 'Unavailable',
          priority: 'NORMAL',
          color_key: 'slate',
          route_target: 'subcontractors',
          is_blocking: true, // Read-only event
          metadata: {
            subcontractor_name: sub.subcontractor_company || sub.full_name,
            is_blackout: true
          }
        }));
      }
    });
  });

  return events;
};
