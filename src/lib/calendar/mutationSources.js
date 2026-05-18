import { supabase } from '../../supabaseClient';
import { mutateOpportunity } from './mutators/opportunitiesMutator';
import { mutateWorkOrder } from './mutators/workOrdersMutator';
import { mutateTask } from './mutators/tasksMutator';
import { mutateCompanyEvent } from './mutators/companyEventsMutator';
import { mutateServiceCall } from './mutators/serviceCallsMutator';

async function logMutation(event, actionType, previousValues, newValues, userId) {
  if (!userId) return;
  await supabase.from('calendar_activity_logs').insert([{
    event_id: event.id,
    source_table: event.source_table,
    source_id: event.source_id,
    action_type: actionType,
    previous_values: previousValues,
    new_values: newValues,
    performed_by: userId
  }]);
}

export const mutateCalendarEvent = async (event, newStart, newEnd, userId) => {
  let success = false;
  
  // Isolate validation and logic based on the decoupled source table
  switch (event.source_table) {
    case 'opportunities':
      success = await mutateOpportunity(event.source_id, newStart, newEnd);
      break;
    case 'work_orders':
      success = await mutateWorkOrder(event.source_id, newStart, newEnd);
      break;
    case 'tasks':
      success = await mutateTask(event.source_id, newStart, newEnd);
      break;
    case 'company_events':
      success = await mutateCompanyEvent(event.source_id, newStart, newEnd);
      break;
    case 'service_calls':
      success = await mutateServiceCall(event.source_id, newStart, newEnd);
      break;
    default:
      console.error(`No mutator defined for source_table: ${event.source_table}`);
      return false;
  }

  if (success && userId) {
    await logMutation(
      event,
      'EVENT_RESCHEDULED',
      { start: event.start_date, end: event.end_date },
      { start: newStart, end: newEnd },
      userId
    );
  }

  return success;
};
