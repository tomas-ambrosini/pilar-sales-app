require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function alterTable() {
  console.log("Attempting to add columns via SQL RPC if available or REST...");
  // Using REST API on a dummy row to see if it works, or we can just run a query using the Postgres function if it exists.
  // Actually, Supabase REST API doesn't allow DDL directly from anon key unless we have a specific RPC.
  // Let's check if we have psql access or an RPC.
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "ALTER TABLE service_calls ADD COLUMN IF NOT EXISTS intaken_by TEXT; ALTER TABLE service_calls ADD COLUMN IF NOT EXISTS scheduled_by TEXT;" });
  
  if (error) {
     console.error("RPC failed:", error);
     console.log("Will try an alternative method or verify if they already exist.");
  } else {
     console.log("Success:", data);
  }
}
alterTable();
