require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const query = `
    CREATE POLICY "Allow authenticated users to delete service calls"
    ON public.service_calls
    FOR DELETE
    USING (auth.role() = 'authenticated');
  `;
  const { data, error } = await supabase.rpc('execute_sql', { query });
  console.log("Result:", data, error);
}
test();
