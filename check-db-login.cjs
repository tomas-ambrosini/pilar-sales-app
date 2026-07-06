const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tomas@lotarri.com',
    password: 'password123'
  });
  
  if (authError) {
      console.log("Login failed", authError);
      return;
  }
  
  const { data, error } = await supabase.from('service_calls').select('id, assigned_techs, status, issue_description').order('created_at', { ascending: false }).limit(3);
  console.log("Recent calls:", data, error);
}
check();
