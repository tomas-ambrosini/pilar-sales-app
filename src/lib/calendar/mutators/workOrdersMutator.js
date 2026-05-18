import { supabase } from '../../../supabaseClient';

export const mutateWorkOrder = async (sourceId, newStart, newEnd) => {
  const { error } = await supabase
    .from('work_orders')
    .update({ 
      scheduled_start_date: newStart,
      scheduled_end_date: newEnd || newStart
    })
    .eq('id', sourceId);

  if (error) {
    console.error("Failed to mutate work order:", error);
    return false;
  }
  return true;
};
