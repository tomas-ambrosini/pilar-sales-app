require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function alterTable() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "ALTER TABLE service_calls ADD COLUMN IF NOT EXISTS intaken_by TEXT; ALTER TABLE service_calls ADD COLUMN IF NOT EXISTS scheduled_by TEXT;" });
  
  if (error) {
     console.error("RPC failed:", error);
  } else {
     console.log("Success:", data);
  }
}
alterTable();
