const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: { action: 'debug' }
  });
  console.log(data, error);
}
check();
