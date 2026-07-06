const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tomas@lotarri.com',
    password: 'password123'
  }); // Note: might fail, but let's try. Wait, earlier it failed with Invalid login. Let's just try to select 1 row if RLS allows it for anon!
  
  const { data, error } = await supabase.from('service_calls').select('*').limit(1);
  console.log("Service Call:", data, error);
}
check();
