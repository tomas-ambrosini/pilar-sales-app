import { supabase } from './src/supabaseClient.js';

async function check() {
  const { data, error } = await supabase.from('user_profiles').select('*');
  console.log("Error:", error);
  console.log("Users:", data);
}
check();
