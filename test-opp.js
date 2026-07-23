import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('opportunities').insert([{
      household_id: null,
      urgency_level: 'Medium',
      issue_description: 'Test null household',
      status: 'Quoting'
  }]).select().single();
  console.log('Error:', error);
  console.log('Data:', data);
  if (data) await supabase.from('opportunities').delete().eq('id', data.id);
}
test();
