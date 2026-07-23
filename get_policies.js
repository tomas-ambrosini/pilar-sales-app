import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { transport: ws }
});

async function check() {
    const { data: policies, error } = await supabase.rpc('get_policies', { table_name: 'invoices' });
    console.log("Policies:", policies || error);
}
check();
