const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}` } } });

async function checkCrews() {
  const { data, error } = await supabase.from('crews').select('*').limit(1);
  console.log("Crews:", data, error);
}

checkCrews();
