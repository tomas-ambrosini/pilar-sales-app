require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function wipe() {
  console.log("Wiping fake crews...");
  const { error } = await supabase.from('crews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.error("Error wiping crews:", error);
  else console.log("Success! Fake crews deleted.");
}
wipe();
