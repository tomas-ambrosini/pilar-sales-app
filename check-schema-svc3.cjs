require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, key);

async function check() {
  const { data: insertData, error: insertError } = await supabase.from('service_calls').insert({ customer_id: '123e4567-e89b-12d3-a456-426614174000', status: 'Pending', call_type: 'Test' }).select().single();
  if (insertError) {
     console.error("Insert error:", insertError);
  } else {
     console.log("Columns:", Object.keys(insertData));
     await supabase.from('service_calls').delete().eq('id', insertData.id);
  }
}
check();
