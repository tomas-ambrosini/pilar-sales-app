const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('service_calls').update({ status: 'Updated' }).eq('id', '00000000-0000-0000-0000-000000000000').select();
  console.log("Update on non-existent row:", data, error);
}
check();
