require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testUpdate() {
  const { data: calls } = await supabase.from('service_calls').select('id, assigned_techs, status').limit(1);
  if (calls && calls.length > 0) {
     console.log("Original call:", calls[0]);
     const { data, error } = await supabase.from('service_calls').update({ assigned_techs: ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'] }).eq('id', calls[0].id).select();
     console.log("Update result:", data, error);
  }
}
testUpdate();
