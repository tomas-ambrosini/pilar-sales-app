require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabase.from('crews').delete().eq('crew_name', 'Testing Crew 1').select();
  console.log('Result:', data);
  console.log('Error:', error);
}

run();
