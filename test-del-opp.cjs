const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { error } = await supabase.from('opportunities').delete().eq('id', 'b574ed9e-4508-44b0-9696-2454c4fb7828');
  console.log('Delete error:', error);
}
run();
