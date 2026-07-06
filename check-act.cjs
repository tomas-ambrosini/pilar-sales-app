require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('activity_logs').select('*').limit(1);
  if (data && data.length > 0) {
     console.log("Columns:", Object.keys(data[0]));
  } else {
     console.log("Error or no data:", error);
  }
}
check();
