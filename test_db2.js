import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: opps } = await supabase.from('opportunities').select('scheduled_date').limit(1);
  const { data: svcs } = await supabase.from('service_calls').select('scheduled_start').limit(1);
  console.log("Opps:", opps);
  console.log("Svcs:", svcs);
}
run();
