const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.functions.invoke('admin-action', {
      body: { action: 'deleteServiceCall', payload: { callId: '00000000-0000-0000-0000-000000000000' } }
  });
  console.log("Edge function reachable?", error ? error : "Yes");
}
run();
