require('dotenv').config({ path: '.env' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const sql = fs.readFileSync('scripts/phase3_migrations.sql', 'utf8');
  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  if (error) console.error("Error executing SQL:", error);
  else console.log("Success:", data);
}
test();
