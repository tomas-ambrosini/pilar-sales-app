require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_schema', { table_name: 'service_calls' });
  if (error) {
     const res = await supabase.from('service_calls').select('*').limit(1);
     console.log(res);
  } else {
     console.log(data);
  }
}
check();
