const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('service_calls').select('id, assigned_techs, status, issue_description').eq('id', '3f833c03-514e-4f06-bb07-88abeb7a5611');
  console.log("Specific call:", data, error);
  
  const { data: allCalls } = await supabase.from('service_calls').select('id, assigned_techs, status, issue_description').order('created_at', { ascending: false }).limit(3);
  console.log("Recent calls:", allCalls);
}
check();
