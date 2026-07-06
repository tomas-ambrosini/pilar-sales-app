require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: call } = await supabase.from('service_calls').select('id, assigned_techs').eq('id', '3f833c03-514e-4f06-bb07-88abeb7a5611').single();
  console.log("Call assigned_techs:", call?.assigned_techs);

  if (call?.assigned_techs?.length) {
     const { data: crew } = await supabase.from('crews').select('*').eq('id', call.assigned_techs[0]);
     console.log("Crew data:", crew);
     
     const { data: userProfile } = await supabase.from('user_profiles').select('*').eq('id', call.assigned_techs[0]);
     console.log("User Profile data:", userProfile);
  }
}
check();
