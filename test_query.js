import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const fetchStartStr = "2026-07-18T00:00:00.000Z";
  const fetchEndStr = "2026-07-28T00:00:00.000Z";
  
  const { data, error } = await supabase.from('service_calls').select('id, status, scheduled_start')
    .in('status', ['Pending', 'Scheduled', 'Dispatched', 'En Route', 'Working', 'Completed', 'Complete'])
    .or(`status.in.("En Route","Working"),and(scheduled_start.gte."${fetchStartStr}",scheduled_start.lte."${fetchEndStr}")`);
    
  console.log("Error:", error);
  console.log("Data count:", data?.length);
  console.log("Data:", data);
}
run();
