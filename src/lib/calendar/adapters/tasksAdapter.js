import { supabase } from '../../../supabaseClient';
import { normalizeCalendarEvent } from '../normalizeCalendarEvent';

export const tasksAdapter = async (dateStart, dateEnd) => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`id, title, due_date, status, priority, assigned_to, opportunity_id, department`)
    .gte('due_date', dateStart)
    .lte('due_date', dateEnd)
    .not('due_date', 'is', null);

  if (error) {
    console.error("Calendar Adapter Error (Tasks):", error);
    return [];
  }

  return (data || []).map(task => {
    return normalizeCalendarEvent({
      id: task.id,
      source_id: task.id,
      source_table: 'tasks',
      title: task.title || 'Task',
      start_date: task.due_date,
      scheduled_start: task.due_date,
      event_type: 'TASK_DEADLINE',
      department_name: task.department,
      assigned_users: task.assigned_to ? [task.assigned_to] : [],
      primary_assignee: task.assigned_to,
      status: task.status,
      priority: task.priority,
      opportunity_id: task.opportunity_id,
      color_key: 'slate',
      route_target: 'task_editor',
      metadata: {}
    });
  });
};
