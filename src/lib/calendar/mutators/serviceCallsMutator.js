import { supabase } from '../../../supabaseClient';

export const mutateServiceCall = async (sourceId, newStart, newEnd) => {
  const { error } = await supabase
    .from('service_calls')
    .update({ 
      scheduled_start: newStart,
      scheduled_end: newEnd || newStart
    })
    .eq('id', sourceId);

  if (error) {
    console.error("Failed to mutate service call:", error);
    return false;
  }
  return true;
};
