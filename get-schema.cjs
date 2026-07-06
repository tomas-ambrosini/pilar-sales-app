require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'service_calls' });
  if (error) {
     console.log(error);
  } else {
     console.log(data);
  }
}
check();
