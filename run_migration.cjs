require('dotenv').config({ path: '.env' });
const fs = require('fs');
globalThis.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function migrate() {
  const sql = fs.readFileSync('migrate_schema.sql', 'utf8');
  const { data, error } = await supabase.rpc('execute_sql', { sql: sql });
  if (error) {
    console.error("Migration Error:", error);
    process.exit(1);
  }
  console.log("Migration Success:", data);
}
migrate();
