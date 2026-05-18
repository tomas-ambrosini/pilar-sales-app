import { supabase } from '../../../supabaseClient';

export const mutateOpportunity = async (sourceId, newStart, newEnd) => {
  const { error } = await supabase
    .from('opportunities')
    .update({ appointment_date: newStart })
    .eq('id', sourceId);

  if (error) {
    console.error("Failed to mutate opportunity:", error);
    return false;
  }
  return true;
};
