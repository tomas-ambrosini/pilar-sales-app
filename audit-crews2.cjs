require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function audit() {
  const { data: profiles, error: pErr } = await supabase.from('user_profiles').select('id, full_name, email, role, subcontractor_company');
  console.log("All Profiles:", profiles);

  const { data: crews, error: cErr } = await supabase.from('crews').select('*');
  console.log("Crews Table:", crews);
}
audit();
