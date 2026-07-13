const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n');
let url = '', key = '';
for (const line of env) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1];
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1];
}
const supabase = createClient(url, key);

async function test() {
  console.log("Checking schema...");
  const { data: opps, error: e1 } = await supabase.from('opportunities').select('id, assigned_crew_id, households(household_name, addresses(city))').limit(1);
  console.log("Opps schema check:", opps, e1);
  const { data: calls, error: e2 } = await supabase.from('service_calls').select('id, assigned_techs, households(household_name, addresses(city))').limit(1);
  console.log("Calls schema check:", calls, e2);
}
test();
