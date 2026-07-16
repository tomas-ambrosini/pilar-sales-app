import { supabase } from './src/supabaseClient.js';
async function run() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  console.log(data ? Object.keys(data[0]) : error);
}
run();
