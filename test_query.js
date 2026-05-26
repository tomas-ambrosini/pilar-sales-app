const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('opportunities').select('id, user_profiles!opportunities_assigned_salesperson_id_fkey(full_name)').limit(1);
  console.log(error ? error : data);
}
run();
