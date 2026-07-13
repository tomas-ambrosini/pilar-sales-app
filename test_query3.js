import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8').split('\n');
let url = '', key = '';
for (const line of env) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1];
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1];
}
const supabase = createClient(url, key);

async function test() {
  console.log("Checking service calls query...");
  const { data, error: err1 } = await supabase.from('service_calls')
    .select('id, created_at, status, urgency, issue_description, scheduled_start, assigned_techs, households(household_name, addresses!addresses_household_id_fkey(city, street_address))')
    .limit(1);
  console.log("Service calls error:", err1);
  
  console.log("Checking opps query...");
  const { data: opps, error: err2 } = await supabase
    .from('opportunities')
    .select('id, created_at, status, urgency_level, issue_description, scheduled_date, scheduled_time_block, assigned_crew_id, households(household_name, addresses!addresses_household_id_fkey(city, street_address)), proposal_data')
    .limit(1);
  console.log("Opps error:", err2);
}
test();
