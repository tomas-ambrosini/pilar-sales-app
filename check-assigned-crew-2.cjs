require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: calls, error } = await supabase.from('service_calls').select('id, assigned_techs, status');
  console.log("All calls:", calls);
}
check();
