require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, key);

async function check() {
  const { data, error } = await supabase.from('service_calls').select('metadata').limit(1);
  if (error) {
     console.error("Error fetching metadata:", error.message);
  } else {
     console.log("Metadata column exists!");
  }
}
check();
