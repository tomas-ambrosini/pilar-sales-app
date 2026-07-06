require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: insertData, error: insertError } = await supabase.from('service_calls').insert({ status: 'Test' }).select().single();
  if (insertError) {
     console.error("Insert error:", insertError);
  } else {
     console.log("Columns:", Object.keys(insertData));
     await supabase.from('service_calls').delete().eq('id', insertData.id);
  }
}
check();
