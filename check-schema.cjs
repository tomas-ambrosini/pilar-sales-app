const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, realtime: { transport: require('ws') } });
supabase.from('user_profiles').select('*').limit(1).then(({ data, error }) => {
  if (error) console.error(error);
  else console.log(Object.keys(data[0]));
});
