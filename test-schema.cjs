require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('subcontractors').select('*').limit(1);
  console.log('subcontractors:', error ? error.message : Object.keys(data[0] || {}));
}
run();
