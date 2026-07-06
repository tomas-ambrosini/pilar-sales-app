const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, key);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: "SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'crews';" });
  if (error) {
     console.log("Error:", error.message);
  } else {
     console.log("Policies:", data);
  }
}
check();
