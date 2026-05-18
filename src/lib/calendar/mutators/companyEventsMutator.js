import { supabase } from '../../../supabaseClient';

export const mutateCompanyEvent = async (sourceId, newStart, newEnd) => {
  const { error } = await supabase
    .from('company_events')
    .update({ 
      start_date: newStart,
      end_date: newEnd || newStart
    })
    .eq('id', sourceId);

  if (error) {
    console.error("Failed to mutate company event:", error);
    return false;
  }
  return true;
};
