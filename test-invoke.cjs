const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.functions.invoke('admin-action', { body: { action: 'debugSchema', payload: {} } }).then(({ data, error }) => {
  if (error) console.error("Invoke Error:", error);
  else console.log("Success:", data);
});
