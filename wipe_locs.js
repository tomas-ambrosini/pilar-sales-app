import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('technician_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Wiped stale locations:", error ? error : "Success");
}
run();
