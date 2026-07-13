const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('crews').select('*, user_profiles(subcontractor_company)').eq('is_active', true).limit(1).then(({ data, error }) => {
  if (error) console.error("Error:", error);
  else console.log("Success:", JSON.stringify(data, null, 2));
});
