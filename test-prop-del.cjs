const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('proposals').delete().eq('id', 'nonexistent-id').select();
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
