import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { transport: ws }
});

async function check() {
    const { data: invs, error } = await supabase.from('invoices').select('*').eq('proposal_id', 'cf41ce30-99c5-4303-a178-5a210fc1bb97');
    console.log("Invoices:", invs);
}
check();
