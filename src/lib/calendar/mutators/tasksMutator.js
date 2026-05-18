import { supabase } from '../../../supabaseClient';

export const mutateTask = async (sourceId, newStart, newEnd) => {
  const { error } = await supabase
    .from('tasks')
    .update({ due_date: newStart })
    .eq('id', sourceId);

  if (error) {
    console.error("Failed to mutate task:", error);
    return false;
  }
  return true;
};
