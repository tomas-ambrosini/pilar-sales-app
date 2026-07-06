const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Try to find a service role key if available, otherwise just check policies via pg_policies
);

async function check() {
    const { data, error } = await supabaseAdmin.from('service_calls').select('id').limit(1);
    console.log(data, error);
}
check();
