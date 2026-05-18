export function normalizeCalendarEvent(rawEvent) {
  return {
    id: rawEvent.id || crypto.randomUUID(),
    source_id: rawEvent.source_id || null,
    source_table: rawEvent.source_table || 'unknown',
    
    created_from_module: rawEvent.created_from_module || 'System',
    event_source_version: rawEvent.event_source_version || '1.0',
    
    title: rawEvent.title || 'Untitled Event',
    description: rawEvent.description || null,
    
    start_date: rawEvent.start_date || null,
    end_date: rawEvent.end_date || null,
    
    scheduled_start: rawEvent.scheduled_start || rawEvent.start_date || null,
    scheduled_end: rawEvent.scheduled_end || rawEvent.end_date || null,
    
    arrival_window_start: rawEvent.arrival_window_start || null,
    arrival_window_end: rawEvent.arrival_window_end || null,
    
    timezone: rawEvent.timezone || 'UTC',
    
    event_type: rawEvent.event_type || 'UNKNOWN',
    department_id: rawEvent.department_id || null,
    department_name: rawEvent.department_name || null,
    
    assigned_users: rawEvent.assigned_users || [],
    primary_assignee: rawEvent.primary_assignee || null,
    
    status: rawEvent.status || 'Scheduled',
    priority: rawEvent.priority || 'NORMAL',
    
    customer_id: rawEvent.customer_id || null,
    opportunity_id: rawEvent.opportunity_id || null,
    work_order_id: rawEvent.work_order_id || null,
    service_call_id: rawEvent.service_call_id || null,
    
    color_key: rawEvent.color_key || 'slate',
    route_target: rawEvent.route_target || null,
    
    is_blocking: !!rawEvent.is_blocking,
    availability_impact: rawEvent.availability_impact || 'NONE',
    
    metadata: rawEvent.metadata || {}
  };
}
